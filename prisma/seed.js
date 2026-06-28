const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Admin user
  const passwordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash,
      role: 'ADMIN',
    },
  });
  console.log('Admin user created/updated:', adminUser.username);

  // 2. School Settings
  const defaultSchoolName = 'Chhotelal School Basti';
  let schoolSettings = await prisma.schoolSettings.findFirst();
  if (!schoolSettings) {
    schoolSettings = await prisma.schoolSettings.create({
      data: {
        schoolName: defaultSchoolName,
        upiId: 'chhotelal.school@okicici',
      },
    });
    console.log('School settings created.');
  }

  // 3. System Settings
  let systemSettings = await prisma.systemSettings.findFirst();
  if (!systemSettings) {
    systemSettings = await prisma.systemSettings.create({
      data: {
        defaultClasses: ['Nursery', 'KG', 'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'],
        feeTypes: ['Monthly Fee', 'Admission Fee', 'Exam Fee'],
      },
    });
    console.log('System settings created.');
  }

  // 4. Fee Structures (Class 7)
  const feeClass7 = await prisma.feeStructure.upsert({
    where: { className: 'Class 7' },
    update: {},
    create: {
      className: 'Class 7',
      monthlyFee: 250,
      admissionFee: 2000,
      examFee: 150,
      extraFees: []
    },
  });
  console.log('Fee structure for Class 7 created.');

  // 5. Sample students
  const year = new Date().getFullYear();
  const students = [
    { fullName: 'Rahul Kumar', admissionNumber: `ADM-${year}-0001`, mobile1: '9876543210', gender: 'Male', fatherName: 'Ashok Kumar', className: 'Class 7' },
    { fullName: 'Priya Sharma', admissionNumber: `ADM-${year}-0002`, mobile1: '8765432109', gender: 'Female', fatherName: 'Rajesh Sharma', className: 'Class 7' },
    { fullName: 'Amit Singh', admissionNumber: `ADM-${year}-0003`, mobile1: '7654321098', gender: 'Male', fatherName: 'Ram Singh', className: 'Class 7' }
  ];

  for (const s of students) {
    const existing = await prisma.student.findUnique({ where: { admissionNumber: s.admissionNumber } });
    if (!existing) {
      await prisma.student.create({ data: s });
      console.log(`Student ${s.fullName} created.`);
    }
  }

  console.log('Seed completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
