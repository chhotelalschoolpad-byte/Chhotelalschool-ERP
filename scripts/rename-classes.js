const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('Starting class rename migration (Nursery/KG -> LKG/UKG)...');

  // Helper mapping
  const classMap = {
    'Nursery': 'LKG',
    'nursery': 'LKG',
    'KG': 'UKG',
    'kg': 'UKG'
  };

  const mapClassName = (name) => {
    if (!name) return name;
    return classMap[name] || name;
  };

  // 1. Update SystemSettings
  console.log('\n--- Updating SystemSettings ---');
  const systemSettingsList = await prisma.systemSettings.findMany();
  console.log(`Found ${systemSettingsList.length} SystemSettings records.`);
  
  for (const settings of systemSettingsList) {
    const originalClasses = settings.defaultClasses;
    if (Array.isArray(originalClasses)) {
      const updatedClasses = originalClasses.map(cls => mapClassName(cls));
      
      // Check if there was any actual change
      const hasChange = JSON.stringify(originalClasses) !== JSON.stringify(updatedClasses);
      if (hasChange) {
        await prisma.systemSettings.update({
          where: { id: settings.id },
          data: { defaultClasses: updatedClasses }
        });
        console.log(`Updated defaultClasses in SystemSettings ID ${settings.id}:`, updatedClasses);
      } else {
        console.log(`No class rename needed for SystemSettings ID ${settings.id}.`);
      }
    }
  }

  // 2. Update Student records
  console.log('\n--- Updating Student Records ---');
  const studentsToUpdate = await prisma.student.findMany({
    where: {
      className: {
        in: Object.keys(classMap)
      }
    }
  });
  console.log(`Found ${studentsToUpdate.length} Student records to update.`);

  let studentCount = 0;
  for (const student of studentsToUpdate) {
    const newClassName = mapClassName(student.className);
    await prisma.student.update({
      where: { id: student.id },
      data: { className: newClassName }
    });
    console.log(`Updated Student: ${student.fullName} (ID: ${student.id}) | ${student.className} -> ${newClassName}`);
    studentCount++;
  }
  console.log(`Successfully updated ${studentCount} Student records.`);

  // 3. Update PassoutStudent records
  console.log('\n--- Updating PassoutStudent Records ---');
  const passoutsToUpdate = await prisma.passoutStudent.findMany({
    where: {
      className: {
        in: Object.keys(classMap)
      }
    }
  });
  console.log(`Found ${passoutsToUpdate.length} PassoutStudent records to update.`);

  let passoutCount = 0;
  for (const passout of passoutsToUpdate) {
    const newClassName = mapClassName(passout.className);
    await prisma.passoutStudent.update({
      where: { id: passout.id },
      data: { className: newClassName }
    });
    console.log(`Updated PassoutStudent: ${passout.fullName} (ID: ${passout.id}) | ${passout.className} -> ${newClassName}`);
    passoutCount++;
  }
  console.log(`Successfully updated ${passoutCount} PassoutStudent records.`);

  // 4. Update FeeStructure records
  console.log('\n--- Updating FeeStructure Records ---');
  const feeStructuresToUpdate = await prisma.feeStructure.findMany({
    where: {
      className: {
        in: Object.keys(classMap)
      }
    }
  });
  console.log(`Found ${feeStructuresToUpdate.length} FeeStructure records to update.`);

  let feeCount = 0;
  for (const fee of feeStructuresToUpdate) {
    const newClassName = mapClassName(fee.className);
    // Since className is unique in FeeStructure, we update one by one.
    // As long as LKG/UKG doesn't already exist or we don't cause duplicate keys.
    await prisma.feeStructure.update({
      where: { id: fee.id },
      data: { className: newClassName }
    });
    console.log(`Updated FeeStructure (ID: ${fee.id}) | ${fee.className} -> ${newClassName}`);
    feeCount++;
  }
  console.log(`Successfully updated ${feeCount} FeeStructure records.`);

  console.log('\nMigration completed successfully.');
}

main()
  .catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
