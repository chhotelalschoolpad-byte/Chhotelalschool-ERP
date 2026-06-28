const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function getTestIds() {
  const students = await prisma.student.findMany({
    where: {
      admissionNumber: {
        in: ['ADM-TEST-MISS', 'ADM-TEST-CURR', 'ADM-TEST-ADV']
      }
    },
    select: { id: true, admissionNumber: true, fullName: true }
  });
  console.log(JSON.stringify(students, null, 2));
}

getTestIds()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
