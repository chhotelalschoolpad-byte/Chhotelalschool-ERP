import { prisma } from '../lib/prisma';
import * as XLSX from 'xlsx';

const getJoiningYear = (admissionNumber) => {
  if (!admissionNumber) return new Date().getFullYear();
  const parts = admissionNumber.split("-");
  for (const part of parts) {
    const y = parseInt(part, 10);
    if (!isNaN(y) && y >= 1000 && y <= 9999) {
      return y;
    }
  }
  const firstPart = parseInt(parts[0], 10);
  return isNaN(firstPart) ? new Date().getFullYear() : firstPart;
};

const ALL_CLASSES = [
  'LKG', 'UKG', 
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
  'Class 11', 'Class 12'
];

function getPromotedClass(originalClass, diff) {
  if (!originalClass) return '';
  if (diff <= 0) return originalClass;
  
  const norm = (c) => c.toLowerCase().replace(/\s+/g, '');
  const index = ALL_CLASSES.findIndex(c => norm(c) === norm(originalClass));
  
  if (index === -1) {
    const match = originalClass.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      const promotedNum = num + diff;
      return originalClass.replace(/\d+/, promotedNum);
    }
    return originalClass;
  }
  
  const targetIndex = index + diff;
  if (targetIndex >= ALL_CLASSES.length) {
    return 'Alumni';
  }
  return ALL_CLASSES[targetIndex];
}

export async function getDailyReport(dateStr, sessionYear) {
  const dateVal = dateStr || new Date().toISOString().slice(0, 10);
  const date = new Date(dateVal);
  const startOfDay = new Date(date.setHours(0, 0, 0, 0));
  const endOfDay = new Date(date.setHours(23, 59, 59, 999));

  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: startOfDay, lte: endOfDay }
    },
    include: {
      student: { select: { id: true, fullName: true, className: true, admissionNumber: true, joiningYear: true } }
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
  const monthVal = monthStr || new Date().toISOString().slice(0, 7);
  const [year, month] = monthVal.split('-');
  const startOfMonth = new Date(year, parseInt(month) - 1, 1);
  const endOfMonth = new Date(year, parseInt(month), 0, 23, 59, 59, 999);

  const payments = await prisma.payment.findMany({
    where: {
      paymentDate: { gte: startOfMonth, lte: endOfMonth }
    },
    include: {
      student: { select: { id: true, fullName: true, className: true, admissionNumber: true, joiningYear: true } }
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

  // Fetch all students with their payments
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
          isMonthlyPaid: true,
          status: 'SUCCESS'
        },
        select: { month: true, selectedMonths: true }
      }
    }
  });

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getPaidMonthsForStudent = (s) => {
    const paidMonths = [];
    s.payments.forEach(p => {
      if (p.selectedMonths && Array.isArray(p.selectedMonths)) {
        p.selectedMonths.forEach(sm => {
          const monthIndex = monthNames.indexOf(sm.month) + 1;
          const monthStr = String(monthIndex).padStart(2, '0');
          paidMonths.push(`${sm.year}-${monthStr}`);
        });
      } else if (p.month) {
        paidMonths.push(p.month);
      }
    });
    return paidMonths;
  };

  const studentsWithMonthlyPending = allStudents.filter(s => {
    if (s.isFeeExempt) return false;
    const paidMonths = getPaidMonthsForStudent(s);
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
    const paidMonths = getPaidMonthsForStudent(s);
    const isPendingThisSession = targetYMList.some(ym => !paidMonths.includes(ym));
    const hasLegacy = s.previousDue > s.previousDuePaid;
    return isPendingThisSession || hasLegacy;
  });

  // Calculate sum of outstanding legacy dues for the dashboard card
  const totalLegacyOutstanding = studentsWithLegacyDues.reduce(
    (sum, s) => sum + (s.previousDue - s.previousDuePaid), 
    0
  );

  // Calculate total collection overall filtered by active session year
  const overallWhere = { status: 'SUCCESS' };
  if (activeSessionYear) {
    const year = Number(activeSessionYear);
    overallWhere.paymentDate = {
      gte: new Date(year, 3, 1, 0, 0, 0, 0),
      lte: new Date(year + 1, 2, 31, 23, 59, 59, 999)
    };
  }

  const overallCollectionAggregate = await prisma.payment.aggregate({
    where: overallWhere,
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
      const paidMonths = getPaidMonthsForStudent(s);
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
    if (res.payments && res.payments.length > 0) {
      data = res.payments.map(p => {
        const jYear = p.student?.joiningYear || getJoiningYear(p.student?.admissionNumber);
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
        const diff = isNaN(pSessionYear) || isNaN(jYear) ? 0 : pSessionYear - jYear;
        const promotedClass = getPromotedClass(p.student?.className, diff);
        return {
          Date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '',
          Receipt: p.receiptNumber,
          Student: p.student?.fullName || '',
          Class: promotedClass || '',
          AdmissionNo: p.admissionNumber,
          Mode: p.paymentMode,
          Type: p.feeType || '',
          Total: p.amount || 0,
          "Discount Given": p.discount || 0,
          "Amount Paid": p.amount - p.discount
        };
      });

      const totalOriginal = res.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalDiscount = res.payments.reduce((sum, p) => sum + (p.discount || 0), 0);
      const totalAmountPaid = res.payments.reduce((sum, p) => sum + (p.amount - (p.discount || 0)), 0);
      data.push({
        Date: 'TOTAL',
        Receipt: '',
        Student: '',
        Class: '',
        AdmissionNo: '',
        Mode: '',
        Type: '',
        Total: totalOriginal,
        "Discount Given": totalDiscount,
        "Amount Paid": totalAmountPaid
      });
    } else {
      data = [{ Date: 'No Records', Receipt: '', Student: '', Class: '', AdmissionNo: '', Mode: '', Type: '', Total: 0, "Discount Given": 0, "Amount Paid": 0 }];
    }
  } else if (type === 'monthly') {
    const res = await getMonthlyReport(dateStr, sessionYear);
    if (res.payments && res.payments.length > 0) {
      data = res.payments.map(p => {
        const jYear = p.student?.joiningYear || getJoiningYear(p.student?.admissionNumber);
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
        const diff = isNaN(pSessionYear) || isNaN(jYear) ? 0 : pSessionYear - jYear;
        const promotedClass = getPromotedClass(p.student?.className, diff);
        return {
          Date: p.paymentDate ? new Date(p.paymentDate).toLocaleDateString('en-IN') : '',
          Receipt: p.receiptNumber,
          Student: p.student?.fullName || '',
          Class: promotedClass || '',
          AdmissionNo: p.admissionNumber,
          Mode: p.paymentMode,
          Type: p.feeType || '',
          Total: p.amount || 0,
          "Discount Given": p.discount || 0,
          "Amount Paid": p.amount - p.discount
        };
      });

      const totalOriginal = res.payments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalDiscount = res.payments.reduce((sum, p) => sum + (p.discount || 0), 0);
      const totalAmountPaid = res.payments.reduce((sum, p) => sum + (p.amount - (p.discount || 0)), 0);
      data.push({
        Date: 'TOTAL',
        Receipt: '',
        Student: '',
        Class: '',
        AdmissionNo: '',
        Mode: '',
        Type: '',
        Total: totalOriginal,
        "Discount Given": totalDiscount,
        "Amount Paid": totalAmountPaid
      });
    } else {
      data = [{ Date: 'No Records', Receipt: '', Student: '', Class: '', AdmissionNo: '', Mode: '', Type: '', Total: 0, "Discount Given": 0, "Amount Paid": 0 }];
    }
  } else if (type === 'pending') {
    const res = await getPendingReport(sessionYear);
    if (res.students && res.students.length > 0) {
      data = res.students.map(s => {
        const jYear = getJoiningYear(s.admissionNumber);
        const diff = Number(sessionYear) - jYear;
        const promotedClass = getPromotedClass(s.className, diff);
        return {
          Student:     s.fullName || '',
          Class:       promotedClass || '',
          AdmissionNo: s.admissionNumber || '',
          Mobile:      s.mobile1 || '',
          Status:      s.isMonthlyPending ? 'Monthly Pending' : 'Paid',
          LegacyDueBadge: s.hasLegacyDue ? 'Has Legacy Dues' : '-',
          PreviousDue: s.previousDue ?? 0,
        };
      });
    } else {
      data = [{ Student: 'No Records', Class: '', AdmissionNo: '', Mobile: '', Status: '', LegacyDueBadge: '', PreviousDue: 0 }];
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
  
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}
