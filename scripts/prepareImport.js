const fs = require('fs');
const path = require('path');
const readline = require('readline');
const xlsx = require('xlsx');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

// Helper to format date objects or serials to YYYY-MM-DD
function parseExcelDate(val) {
  if (val === undefined || val === null) return "";
  
  if (typeof val === 'number') {
    // Excel serial number to JS Date
    // Note: Excel dates start from Jan 1 1900.
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return formatDate(date);
  }
  
  if (val instanceof Date) {
    return formatDate(val);
  }
  
  const str = String(val).trim();
  if (str === '-' || str === '') return '';
  
  // If it's already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  
  // Try standard date parsing
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) {
    return formatDate(new Date(parsed));
  }
  
  // Handle other common Indian date patterns e.g. DD/MM/YYYY or DD-MM-YYYY
  const match = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const d = new Date(year, month - 1, day);
    if (!isNaN(d.getTime())) {
      return formatDate(d);
    }
  }
  
  return str;
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Helper to clean phone and Aadhaar of scientific notation & decimals
function cleanNumberString(val) {
  if (val === undefined || val === null) return "";
  let str = String(val).trim();
  if (str === "-" || str === "") return "";
  
  // Handle scientific notation (e.g. 4.99503508459e11)
  if (str.includes('e') || str.includes('E')) {
    const num = Number(str);
    if (!isNaN(num)) {
      str = num.toFixed(0);
    }
  }
  
  // Remove any trailing decimal part (e.g. 9161591067.0)
  const dotIndex = str.indexOf('.');
  if (dotIndex !== -1) {
    str = str.substring(0, dotIndex);
  }
  
  // Strip all non-digit characters to keep a clean digits string
  str = str.replace(/\D/g, '');
  
  return str;
}

const prismaFields = [
  'admissionNumber',
  'fullName',
  'gender',
  'dateOfBirth',
  'religion',
  'caste',
  'fatherName',
  'motherName',
  'mobile1',
  'mobile2',
  'address',
  'state',
  'country',
  'className',
  'previousSchool',
  'aadhaarNumber',
  'parentAadhaarNumber',
  'joiningYear',
  'previousDue',
  'isFeeExempt',
  'exemptionReason',
  'isExisting'
];

async function main() {
  try {
    console.log("=== Student Data Import Preparation Tool ===");
    
    const className = await askQuestion("Enter class name (e.g. Class 1): ");
    const classNumber = await askQuestion("Enter class number (e.g. 1, 2, 3): ");
    const expectedCountStr = await askQuestion("How many students are in this file?: ");
    const startSeqStr = await askQuestion("Enter starting admission number sequence (e.g. 1 if first class, 53 if continuing from previous class): ");
    
    const expectedCount = parseInt(expectedCountStr.trim(), 10);
    const startSeq = parseInt(startSeqStr.trim(), 10);
    
    if (isNaN(expectedCount) || isNaN(startSeq)) {
      console.error("Error: Student count and start sequence must be valid integers.");
      rl.close();
      return;
    }
    
    const inputFilePath = `./studentdata/class-${classNumber.trim()}.xlsx`;
    if (!fs.existsSync(inputFilePath)) {
      console.error(`Error: Input file does not exist at: ${inputFilePath}`);
      rl.close();
      return;
    }
    
    console.log(`\nReading input file: ${inputFilePath}...`);
    const workbook = xlsx.readFile(inputFilePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    const rows = xlsx.utils.sheet_to_json(sheet);
    const actualCount = rows.length;
    
    // Row count validation
    if (actualCount !== expectedCount) {
      console.warn(`[VALIDATION WARNING] Mismatch in student count! Expected: ${expectedCount}, Found: ${actualCount} rows.`);
    } else {
      console.log(`[VALIDATION SUCCESS] Student count matches expected: ${actualCount}`);
    }
    
    // Build header map to map original columns to Prisma fields
    const headers = Object.keys(rows[0] || {});
    const headerMap = {};
    
    headers.forEach(header => {
      const norm = header.split('\n')[0].toLowerCase().replace(/\s+/g, '').replace(/[^\w]/g, '');
      
      if (norm === 'name' || norm === 'fullname') {
        headerMap[header] = 'fullName';
      } else if (norm === 'father' || norm === 'fathername') {
        headerMap[header] = 'fatherName';
      } else if (norm === 'mother' || norm === 'mothername') {
        headerMap[header] = 'motherName';
      } else if (norm === 'mono' || norm === 'mobile1' || norm === 'monumber' || norm === 'primarycontact') {
        headerMap[header] = 'mobile1';
      } else if (norm === 'dob' || norm === 'dateofbirth') {
        headerMap[header] = 'dateOfBirth';
      } else if (norm === 'aadharno' || norm === 'aadhaarnumber' || norm === 'aadhar') {
        headerMap[header] = 'aadhaarNumber';
      } else if (norm === 'address') {
        headerMap[header] = 'address';
      }
    });
    
    // Process rows
    const processedRows = rows.map((row, index) => {
      const seq = startSeq + index;
      const seqFormatted = String(seq).padStart(4, '0');
      const admissionNumber = `ADM-2025-${seqFormatted}`;
      
      const mappedRow = {
        admissionNumber,
        fullName: "",
        gender: "",
        dateOfBirth: "",
        religion: "",
        caste: "",
        fatherName: "",
        motherName: "",
        mobile1: "",
        mobile2: "",
        address: "",
        state: "",
        country: "India",
        className: className.trim(),
        previousSchool: "",
        aadhaarNumber: "",
        parentAadhaarNumber: "",
        joiningYear: 2025,
        previousDue: 0,
        isFeeExempt: false,
        exemptionReason: "",
        isExisting: true
      };
      
      Object.keys(row).forEach(key => {
        const targetField = headerMap[key];
        if (targetField) {
          const val = row[key];
          
          if (targetField === 'dateOfBirth') {
            mappedRow[targetField] = parseExcelDate(val);
          } else if (targetField === 'mobile1' || targetField === 'aadhaarNumber') {
            mappedRow[targetField] = cleanNumberString(val);
          } else {
            const strVal = val !== undefined && val !== null ? String(val).trim() : "";
            mappedRow[targetField] = (strVal === "-" || strVal === "") ? "" : strVal;
          }
        }
      });
      
      return mappedRow;
    });
    
    // Create new sheet
    const newWorksheet = xlsx.utils.json_to_sheet(processedRows, { header: prismaFields });
    const newWorkbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(newWorkbook, newWorksheet, 'Prisma_Student_Import');
    
    // Save to the multiple output formats as requested
    const startSeqFormatted = String(startSeq).padStart(4, '0');
    const endSeqFormatted = String(startSeq + actualCount - 1).padStart(4, '0');
    
    const outputFilenamePattern = `${className.trim().replace(/\s+/g, '_')}_Import_ADM${startSeqFormatted}-ADM${endSeqFormatted}.xlsx`;
    const outputPath1 = `./studentdata/class-${classNumber.trim()}-import.xlsx`;
    const outputPath2 = `./studentdata/${outputFilenamePattern}`;
    const outputPath3 = `./${outputFilenamePattern}`;
    
    console.log("\nWriting output files...");
    xlsx.writeFile(newWorkbook, outputPath1);
    xlsx.writeFile(newWorkbook, outputPath2);
    xlsx.writeFile(newWorkbook, outputPath3);
    
    console.log(`Saved output to:`);
    console.log(`  - ${outputPath1}`);
    console.log(`  - ${outputPath2}`);
    console.log(`  - ${outputPath3}`);
    
    // Summary
    const nextClassStart = startSeq + actualCount;
    console.log(`\n================ SUMMARY ================`);
    console.log(`Class Name: ${className.trim()}`);
    console.log(`Total Students Processed: ${actualCount}`);
    console.log(`Admission Number Range Used: ADM-2025-${startSeqFormatted} to ADM-2025-${endSeqFormatted}`);
    console.log(`Next class should start from: ${nextClassStart}`);
    console.log(`=========================================\n`);
    
    // Ask if they want to import into database
    const importDb = await askQuestion("Do you want to import these students into the database now? (y/n): ");
    if (importDb.trim().toLowerCase() === 'y') {
      console.log("\nInitializing Prisma client...");
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      
      console.log("Importing students into database...");
      let importCount = 0;
      for (const student of processedRows) {
        await prisma.student.upsert({
          where: { admissionNumber: student.admissionNumber },
          update: {
            fullName: student.fullName,
            gender: student.gender || "Male",
            dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
            religion: student.religion || null,
            caste: student.caste || null,
            fatherName: student.fatherName,
            motherName: student.motherName || null,
            mobile1: student.mobile1 || "",
            mobile2: student.mobile2 || null,
            address: student.address || null,
            state: student.state || null,
            country: student.country,
            className: student.className,
            previousSchool: student.previousSchool || null,
            joiningYear: student.joiningYear,
            previousDue: student.previousDue,
            isFeeExempt: student.isFeeExempt,
            exemptionReason: student.exemptionReason || null,
            isExisting: student.isExisting
          },
          create: {
            admissionNumber: student.admissionNumber,
            fullName: student.fullName,
            gender: student.gender || "Male",
            dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth) : null,
            religion: student.religion || null,
            caste: student.caste || null,
            fatherName: student.fatherName,
            motherName: student.motherName || null,
            mobile1: student.mobile1 || "",
            mobile2: student.mobile2 || null,
            address: student.address || null,
            state: student.state || null,
            country: student.country,
            className: student.className,
            previousSchool: student.previousSchool || null,
            joiningYear: student.joiningYear,
            previousDue: student.previousDue,
            isFeeExempt: student.isFeeExempt,
            exemptionReason: student.exemptionReason || null,
            isExisting: student.isExisting
          }
        });
        importCount++;
      }
      await prisma.$disconnect();
      console.log(`[DATABASE SUCCESS] Successfully imported/updated ${importCount} students in the database!`);
    } else {
      console.log("\nSkipped database import.");
    }
    
  } catch (error) {
    console.error("An error occurred during processing:", error);
  } finally {
    rl.close();
  }
}

main();
