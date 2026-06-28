import { prisma } from '../lib/prisma';
import * as XLSX from 'xlsx';

export async function getDailyReport(dateStr, sessionYear) {
  const date = new Date(dateStr);
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: startOfDay, lte: endOfDay }
    },
    include: {
      student: { select: { fullName: true, className: true } }
    }
  });

  const filteredPayments = sessionYear ? payments.filter(p => {
    let pSessionYear;
    if (p.month && p.month.includes('-')) {
      const [y] = p.month.split('-');
      pSessionYear = Number(y);
    }
    if (pSessionYear === undefined) {
      const pDate = new Date(p.paymentDate);
      const y = pDate.getFullYear();
      const m = pDate.getMonth() + 1;
      pSessionYear = m >= 4 ? y : y - 1;
    }
    return Number(pSessionYear) === Number(sessionYear);
  }) : payments;

  const byMode = { Cash: 0, UPI: 0, "Bank Transfer": 0 };
  let totalCollection = 0;

  filteredPayments.forEach(p => {
    byMode[p.paymentMode] = (byMode[p.paymentMode] || 0) + (p.amount - p.discount);
    totalCollection += (p.amount - p.discount);
  });

  return { totalCollection, byMode, payments: filteredPayments };
}

export async function getMonthlyReport(monthStr, sessionYear) {
  // monthStr looks like "2024-03"
  const [year, month] = monthStr.split('-');
  const startOfMonth = new Date(year, parseInt(month) - 1, 1);
  const endOfMonth = new Date(year, parseInt(month), 0, 23, 59, 59, 999);

  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: startOfMonth, lte: endOfMonth }
    },
    include: {
      student: { select: { fullName: true, className: true } }
    }
  });

  const filteredPayments = sessionYear ? payments.filter(p => {
    let pSessionYear;
    if (p.month && p.month.includes('-')) {
      const [y] = p.month.split('-');
      pSessionYear = Number(y);
    }
    if (pSessionYear === undefined) {
      const pDate = new Date(p.paymentDate);
      const y = pDate.getFullYear();
      const m = pDate.getMonth() + 1;
      pSessionYear = m >= 4 ? y : y - 1;
    }
    return Number(pSessionYear) === Number(sessionYear);
  }) : payments;

  const byMode = { Cash: 0, UPI: 0, "Bank Transfer": 0 };
  let totalCollection = 0;

  filteredPayments.forEach(p => {
    byMode[p.paymentMode] = (byMode[p.paymentMode] || 0) + (p.amount - p.discount);
    totalCollection += (p.amount - p.discount);
  });

  return { totalCollection, byMode, payments: filteredPayments };
}

export async function getPendingReport(sessionYear) {
  const today = new Date();
  const currentSessionYear = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  const activeSessionYear = sessionYear ? Number(sessionYear) : currentSessionYear;

  const monthsInSession = ["04", "05", "06", "07", "08", "09", "10", "11", "12", "01", "02", "03"];
  
  let checkMonths = [];
  if (activeSessionYear === currentSessionYear) {
    const currentMonthStr = String(today.getMonth() + 1).padStart(2, "0");
    const idx = monthsInSession.indexOf(currentMonthStr);
    if (idx !== -1) {
      checkMonths = monthsInSession.slice(0, idx + 1);
    } else {
      checkMonths = [...monthsInSession];
    }
  } else if (activeSessionYear < currentSessionYear) {
    checkMonths = [...monthsInSession];
  } else {
    checkMonths = [];
  }

  const targetYMList = checkMonths.map(m => `${activeSessionYear}-${m}`);

  // Fetch all students with their payments in this session
  const allStudents = await prisma.student.findMany({
    select: {
      id:              true,
      fullName:        true,
      className:       true,
      admissionNumber: true,
      gender:          true,
      mobile1:         true,
      previousDue:     true,
      previousDuePaid: true,
      isFeeExempt:     true,
      payments: {
        where: {
          month: { in: targetYMList },
          isMonthlyPaid: true,
          status: 'SUCCESS'
        },
        select: { month: true }
      }
    }
  });

  const studentsWithMonthlyPending = allStudents.filter(s => {
    if (s.isFeeExempt) return false;
    const paidMonths = s.payments.map(p => p.month);
    return targetYMList.some(ym => !paidMonths.includes(ym));
  });

  const studentsWithLegacyDues = allStudents.filter(s => s.previousDue > s.previousDuePaid && !s.isFeeExempt);

  // Gender Stats
  const genderCounts = allStudents.reduce((acc, s) => {
    acc[s.gender] = (acc[s.gender] || 0) + 1;
    return acc;
  }, {});
  const genderStats = Object.keys(genderCounts).map(name => ({ name, value: genderCounts[name] }));

  // Status Stats (Simple counts for the bar chart)
  const statusStats = [
    { name: 'Paid (Month)',    value: allStudents.length - studentsWithMonthlyPending.length },
    { name: 'Pending (Month)', value: studentsWithMonthlyPending.length },
    { name: 'Legacy Due',      value: studentsWithLegacyDues.length }
  ];

  // For the 'students' list returned (the table), we'll return anyone who has at least one issue
  const pendingIssueStudents = allStudents.filter(s => {
    if (s.isFeeExempt) return false;
    const paidMonths = s.payments.map(p => p.month);
    const isPendingThisSession = targetYMList.some(ym => !paidMonths.includes(ym));
    const hasLegacy = s.previousDue > s.previousDuePaid;
    return isPendingThisSession || hasLegacy;
  });

  // Calculate sum of outstanding legacy dues for the dashboard card
  const totalLegacyOutstanding = studentsWithLegacyDues.reduce(
    (sum, s) => sum + (s.previousDue - s.previousDuePaid), 
    0
  );

  // Calculate total collection overall across all time
  const overallCollectionAggregate = await prisma.payment.aggregate({
    where: { status: 'SUCCESS' },
    _sum: {
      amount:   true,
      discount: true
    }
  });
  const totalCollectedOverall = (overallCollectionAggregate._sum.amount || 0) - (overallCollectionAggregate._sum.discount || 0);

  return {
    pendingMonthlyCount:   studentsWithMonthlyPending.length,
    legacyDueCount:        studentsWithLegacyDues.length,
    totalPreviousDue:      totalLegacyOutstanding,
    totalCollectedOverall: totalCollectedOverall,
    genderStats:           genderStats,
    statusStats:           statusStats,
    students:              pendingIssueStudents.map(s => {
      const paidMonths = s.payments.map(p => p.month);
      return {
        ...s,
        isMonthlyPending: targetYMList.some(ym => !paidMonths.includes(ym)),
        hasLegacyDue:     s.previousDue > s.previousDuePaid
      };
    }),
  };
}

export async function exportReportBuffer(type, dateStr, sessionYear) {
  let data = [];
  if (type === 'daily') {
    const res = await getDailyReport(dateStr, sessionYear);
    data = res.payments.map(p => ({
      Date: p.paymentDate.toLocaleDateString('en-IN'),
      Receipt: p.receiptNumber,
      Student: p.student?.fullName,
      Class: p.student?.className,
      AdmissionNo: p.admissionNumber,
      Mode: p.paymentMode,
      Type: p.feeType,
      Amount: p.amount - p.discount
    }));
  } else if (type === 'monthly') {
    const res = await getMonthlyReport(dateStr, sessionYear);
    data = res.payments.map(p => ({
      Date: p.paymentDate.toLocaleDateString('en-IN'),
      Receipt: p.receiptNumber,
      Student: p.student?.fullName,
      Class: p.student?.className,
      AdmissionNo: p.admissionNumber,
      Mode: p.paymentMode,
      Type: p.feeType,
      Amount: p.amount - p.discount
    }));
  } else if (type === 'pending') {
    const res = await getPendingReport(sessionYear);
    data = res.students.map(s => ({
      Student:     s.fullName,
      Class:       s.className,
      AdmissionNo: s.admissionNumber,
      Mobile:      s.mobile1,
      Status:      s.isMonthlyPending ? 'Monthly Pending' : 'Paid',
      LegacyDueBadge: s.hasLegacyDue ? 'Has Legacy Dues' : '-',
      PreviousDue: s.previousDue ?? 0,
    }));
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
