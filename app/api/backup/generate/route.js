import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';
import fs from 'fs';
import path from 'path';
import { ZipArchive } from 'archiver';
import { execFile } from 'child_process';
import util from 'util';

const execFilePromise = util.promisify(execFile);

function createZip(filePath, sqlFilePath, manifest) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(filePath);
    const archive = new ZipArchive({
      zlib: { level: 9 }
    });

    output.on('close', () => {
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);

    // Append PostgreSQL dump SQL file
    archive.append(fs.createReadStream(sqlFilePath), { name: 'backup.sql' });

    // Append backup manifest
    archive.append(JSON.stringify(manifest, null, 2), { name: 'backup_manifest.json' });

    archive.finalize();
  });
}

/**
 * Programmatically generates a backup SQL file as a series of INSERT statements.
 * This is used as a highly robust fallback when pg_dump fails due to version mismatch.
 */
function generateSqlDump(dataMap) {
  let sql = `-- Database Backup Dump (Programmatic Fallback)\n-- Generated on ${new Date().toISOString()}\n\n`;
  
  // PostgreSql statement headers
  sql += `SET CONSTRAINTS ALL DEFERRED;\n\n`;

  for (const [tableName, rows] of Object.entries(dataMap)) {
    if (!Array.isArray(rows) || rows.length === 0) {
      sql += `-- Table ${tableName} has 0 records.\n\n`;
      continue;
    }
    
    // Map module name to DB table name
    let dbTableName = tableName;
    if (tableName === 'students') dbTableName = 'Student';
    else if (tableName === 'passout_students') dbTableName = 'PassoutStudent';
    else if (tableName === 'fee_setup') dbTableName = 'FeeStructure';
    else if (tableName === 'payments') dbTableName = 'Payment';
    else if (tableName === 'archived_payments') dbTableName = 'DeletedPayment';
    else if (tableName === 'school_settings') dbTableName = 'SchoolSettings';
    else if (tableName === 'system_settings') dbTableName = 'SystemSettings';

    sql += `-- Table: ${dbTableName} (${rows.length} rows)\n`;
    
    const columns = Object.keys(rows[0]);
    const columnsStr = columns.map(c => `"${c}"`).join(', ');

    for (const row of rows) {
      const values = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string') {
          return `'${val.replace(/'/g, "''")}'`;
        }
        if (val instanceof Date) {
          return `'${val.toISOString()}'`;
        }
        if (typeof val === 'object') {
          return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
        }
        if (typeof val === 'boolean') {
          return val ? 'TRUE' : 'FALSE';
        }
        return val;
      });
      const valuesStr = values.join(', ');
      
      sql += `INSERT INTO "${dbTableName}" (${columnsStr}) VALUES (${valuesStr}) ON CONFLICT DO NOTHING;\n`;
    }
    sql += `\n`;
  }
  return sql;
}

// Generate the backup files locally and return paths
async function runBackupGeneration() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL is not set in environment.');
  }

  // 1. Fetch actual database records (required for fallback generation and manifest counting)
  const students = await prisma.student.findMany();
  const admissionForms = await prisma.student.findMany({ where: { isExisting: false } });
  const passoutStudents = await prisma.passoutStudent.findMany();
  const feeSetup = await prisma.feeStructure.findMany();
  const payments = await prisma.payment.findMany();
  const archivedPayments = await prisma.deletedPayment.findMany();
  const messagingLogs = []; // Fallback empty
  
  const schoolSettings = await prisma.schoolSettings.findMany();
  const systemSettings = await prisma.systemSettings.findMany();

  // Retrieve school name
  const primarySchoolSetting = schoolSettings[0];
  const schoolName = primarySchoolSetting?.schoolName || 'Chhotelal School Basti';

  // 2. Prepare paths
  const pad = (num) => String(num).padStart(2, '0');
  const now = new Date();
  const year = now.getFullYear();
  const month = pad(now.getMonth() + 1);
  const day = pad(now.getDate());
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());
  const timestampStr = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  const zipFilename = `ChhotelalSchool_Backup_${timestampStr}.zip`;

  const tempDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const sqlPath = path.join(tempDir, `backup_${timestampStr}.sql`);
  const zipPath = path.join(tempDir, zipFilename);

  // 3. Try to run pg_dump securely using execFile
  let dumpSuccess = false;
  try {
    await execFilePromise('pg_dump', [
      `--dbname=${dbUrl}`,
      '-F', 'p',
      '-f', sqlPath
    ]);
    dumpSuccess = true;
  } catch (dumpErr) {
    console.warn('[BACKUP WARNING] pg_dump utility failed (likely due to version mismatch or path issues). Falling back to programmatic SQL generation...', dumpErr.message || dumpErr);
  }

  // 4. If pg_dump failed, use the programmatic SQL generator fallback (100% database-version independent)
  if (!dumpSuccess) {
    try {
      const sqlDump = generateSqlDump({
        students,
        passout_students: passoutStudents,
        fee_setup: feeSetup,
        payments,
        archived_payments: archivedPayments,
        school_settings: schoolSettings,
        system_settings: systemSettings
      });
      fs.writeFileSync(sqlPath, sqlDump, 'utf8');
    } catch (fallbackErr) {
      console.error('Programmatic database dump failed:', fallbackErr);
      throw new Error(`Database backup execution failed: pg_dump failed and local fallback failed. Detail: ${fallbackErr.message}`);
    }
  }

  // 5. Create Manifest
  const manifest = {
    schoolName,
    timestamp: now.toISOString(),
    recordCounts: {
      students: students.length,
      admission_forms: admissionForms.length,
      passout_students: passoutStudents.length,
      fee_setup: feeSetup.length,
      payments: payments.length,
      archived_payments: archivedPayments.length,
      messaging_logs: messagingLogs.length,
      settings: schoolSettings.length + systemSettings.length
    }
  };

  // 6. Create ZIP
  await createZip(zipPath, sqlPath, manifest);

  // 7. Clean up temporary SQL file immediately
  if (fs.existsSync(sqlPath)) {
    fs.unlinkSync(sqlPath);
  }

  return {
    filePath: zipPath,
    fileName: zipFilename,
    manifest
  };
}

// GET /api/backup/generate - Generates backup and streams it directly to browser for download
export async function GET(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN']);
    if (authResult.error) {
      return Response.json({ error: authResult.error }, { status: authResult.status });
    }

    // Generate local backup zip
    const backupData = await runBackupGeneration();

    // Read the zip file into buffer and delete it
    const fileBuffer = fs.readFileSync(backupData.filePath);
    if (fs.existsSync(backupData.filePath)) {
      fs.unlinkSync(backupData.filePath);
    }

    // Return buffer as response stream
    return new Response(fileBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${backupData.fileName}"`
      }
    });

  } catch (error) {
    console.error('[GET /api/backup/generate]', error);
    return Response.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
