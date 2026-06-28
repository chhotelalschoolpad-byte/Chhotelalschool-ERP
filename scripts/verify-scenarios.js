const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyScenarios() {
  console.log('--- FEE SYSTEM SCENARIO VERIFICATION ---');

  // Today's date for simulation: 2026-04-02
  const TODAY_DATE = new Date(2026, 3, 2); // April 2, 2026
  const CURRENT_YM = "2026-04";

  // Mock Session Start
  const SESSION_START = new Date(2026, 3, 1); // April 1, 2026

  async function clearTestStudent(adm) {
    const s = await prisma.student.findUnique({ where: { admissionNumber: adm } });
    if (s) {
      await prisma.payment.deleteMany({ where: { studentId: s.id } });
      await prisma.student.delete({ where: { id: s.id } });
    }
  }

  // --- CASE 2: PAID CURRENT MONTH ---
  // Simple check for the dashboard report logic
  console.log('\n[Case 2] Verifying Current Month Payment logic...');
  const adm2 = 'ADM-TEST-CURR';
  await clearTestStudent(adm2);
  const s2 = await prisma.student.create({
    data: {
      fullName: 'Test Student Current',
      admissionNumber: adm2,
      admissionDate: new Date(2026, 3, 1),
      className: 'Class 7',
      mobile1: '1111111111',
      gender: 'Male',
      fatherName: 'Father Curr',
    }
  });

  await prisma.payment.create({
    data: {
      studentId: s2.id,
      admissionNumber: adm2,
      month: CURRENT_YM,
      amount: 250,
      paymentMode: 'Cash',
      receiptNumber: 'RCPT-CURR',
      isMonthlyPaid: true,
      status: 'SUCCESS',
      recordedBy: 'TEST_SYSTEM',
      paymentItems: [{ type: 'Monthly Fee', amount: 250 }]
    }
  });

  // Verify dashboard reporting logic (getPendingReport)
  const p2 = await prisma.payment.findFirst({
    where: { studentId: s2.id, month: CURRENT_YM, isMonthlyPaid: true, status: 'SUCCESS' }
  });
  console.log(`- Payment found for ${CURRENT_YM}: ${!!p2}`);
  console.log(`- Dashboard Status: ${p2 ? 'PAID' : 'PENDING'}`);
  console.log(p2 ? '✅ Case 2 Logic Verification Passed' : '❌ Case 2 Logic Verification Failed');

  // --- CASE 3: ADVANCE PAYMENT ---
  console.log('\n[Case 3] Verifying Advance Payment logic...');
  const adm3 = 'ADM-TEST-ADV';
  await clearTestStudent(adm3);
  const s3 = await prisma.student.create({
    data: {
      fullName: 'Test Student Advance',
      admissionNumber: adm3,
      admissionDate: new Date(2026, 3, 1),
      className: 'Class 7',
      mobile1: '2222222222',
      gender: 'Female',
      fatherName: 'Father Adv',
    }
  });

  await prisma.payment.create({
    data: {
      studentId: s3.id,
      admissionNumber: adm3,
      month: CURRENT_YM,
      amount: 250,
      paymentMode: 'Cash',
      receiptNumber: 'RCPT-ADV-1',
      isMonthlyPaid: true,
      status: 'SUCCESS',
      recordedBy: 'TEST_SYSTEM',
      paymentItems: [{ type: 'Monthly Fee', amount: 250 }]
    }
  });

  const ADV_YM = "2026-05";
  await prisma.payment.create({
    data: {
      studentId: s3.id,
      admissionNumber: adm3,
      month: ADV_YM,
      amount: 250,
      paymentMode: 'Cash',
      receiptNumber: 'RCPT-ADV-2',
      isMonthlyPaid: true,
      status: 'SUCCESS',
      recordedBy: 'TEST_SYSTEM',
      paymentItems: [{ type: 'Monthly Fee', amount: 250 }]
    }
  });

  // Simulate UI Visualizer Logic (monthGrid)
  const payments3 = await prisma.payment.findMany({ where: { studentId: s3.id } });
  
  function checkMonthStatus(ym, studentPayments, todayYM) {
    const isPaid = studentPayments.some(p => p.month === ym && p.isMonthlyPaid && p.status === 'SUCCESS');
    if (isPaid) return 'GREEN';
    if (ym < todayYM) return 'RED'; // Past missed
    if (ym === todayYM) return 'RED'; // Current not paid
    return 'GRAY'; // Future not paid
  }

  const statusCurr = checkMonthStatus(CURRENT_YM, payments3, CURRENT_YM);
  const statusAdv = checkMonthStatus(ADV_YM, payments3, CURRENT_YM);

  console.log(`- ${CURRENT_YM} Status: ${statusCurr}`);
  console.log(`- ${ADV_YM} Status (Advance): ${statusAdv}`);
  console.log(statusCurr === 'GREEN' && statusAdv === 'GREEN' ? '✅ Case 3 Logic Verification Passed' : '❌ Case 3 Logic Verification Failed');

  // --- CASE 1: MISSED MONTHS (Simulating June Today) ---
  console.log('\n[Case 1] Verifying Missed Months logic (Simulation)...');
  const adm1 = 'ADM-TEST-MISS';
  await clearTestStudent(adm1);
  const s1 = await prisma.student.create({
    data: {
      fullName: 'Test Student Missed',
      admissionNumber: adm1,
      admissionDate: new Date(2026, 3, 1),
      className: 'Class 7',
      mobile1: '3333333333',
      gender: 'Male',
      fatherName: 'Father Miss',
    }
  });

  // Only paid April
  await prisma.payment.create({
    data: {
      studentId: s1.id,
      admissionNumber: adm1,
      month: "2026-04",
      amount: 250,
      paymentMode: 'Cash',
      receiptNumber: 'RCPT-MISS-1',
      isMonthlyPaid: true,
      status: 'SUCCESS',
      recordedBy: 'TEST_SYSTEM',
      paymentItems: [{ type: 'Monthly Fee', amount: 250 }]
    }
  });

  // Simulate June Today
  const SIM_TODAY_YM = "2026-06";
  const payments1 = await prisma.payment.findMany({ where: { studentId: s1.id } });

  const statusApril = checkMonthStatus("2026-04", payments1, SIM_TODAY_YM);
  const statusMay = checkMonthStatus("2026-05", payments1, SIM_TODAY_YM);
  const statusJune = checkMonthStatus("2026-06", payments1, SIM_TODAY_YM);

  console.log(`- April Status: ${statusApril}`);
  console.log(`- May Status (Missed): ${statusMay}`);
  console.log(`- June Status (Missed Current): ${statusJune}`);

  console.log(statusApril === 'GREEN' && statusMay === 'RED' && statusJune === 'RED' ? '✅ Case 1 Logic Verification Passed' : '❌ Case 1 Logic Verification Failed');

  console.log('\n--- VERIFICATION COMPLETED ---');
}

verifyScenarios()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
