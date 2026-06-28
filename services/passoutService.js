import { prisma } from '../lib/prisma';
import * as XLSX from 'xlsx';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import path from 'path';
import fs from 'fs';
import PassoutListPDF from '../components/pdf/PassoutListPDF';

export async function getPassoutWhere(filters) {
  const { 
    academicYear, className, search, filter,
    tcTaken, resultCollected, booksPaid, uniformPaid 
  } = filters;
  const where = {};

  if (academicYear && academicYear !== 'all') where.academicYear = academicYear;
  if (className && className !== 'all') where.className = className;
  if (search) {
    where.fullName = { contains: search, mode: 'insensitive' };
  }

  // Quick Filters (from Stats Cards)
  if (filter && filter !== 'all') {
    switch (filter) {
      case 'paid':
        where.feesStatus = 'PAID';
        break;
      case 'pending':
        where.feesStatus = { not: 'PAID' };
        break;
      case 'tc':
        where.tcTaken = true;
        break;
      case 'result':
        where.resultCollected = true;
        break;
      case 'no-books':
        where.booksPaid = false;
        break;
      case 'no-uniform':
        where.uniformPaid = false;
        break;
    }
  }

  // Granular Filters (additive)
  if (tcTaken === 'true') where.tcTaken = true;
  if (tcTaken === 'false') where.tcTaken = false;
  if (resultCollected === 'true') where.resultCollected = true;
  if (resultCollected === 'false') where.resultCollected = false;
  if (booksPaid === 'true') where.booksPaid = true;
  if (booksPaid === 'false') where.booksPaid = false;
  if (uniformPaid === 'true') where.uniformPaid = true;
  if (uniformPaid === 'false') where.uniformPaid = false;

  return where;
}

export async function getPassoutStudents(filters) {
  const { page, limit } = filters;
  const where = await getPassoutWhere(filters);
  const skip = page ? (parseInt(page) - 1) * (parseInt(limit) || 20) : undefined;
  const take = limit ? parseInt(limit) : undefined;

  return prisma.passoutStudent.findMany({
    where,
    skip,
    take,
    orderBy: { createdAt: 'desc' },
  });
}

export async function exportPassoutExcel(filters) {
  const students = await getPassoutStudents(filters);
  
  const data = students.map(s => ({
    Name: s.fullName,
    Class: s.className,
    Contact: s.contactNumber || '-',
    'Academic Year': s.academicYear,
    'Fees Status': s.feesStatus,
    'Pending Amount': s.pendingAmount,
    'TC Taken': s.tcTaken ? 'Yes' : 'No',
    'Result Collected': s.resultCollected ? 'Yes' : 'No',
    'Books Paid': s.booksPaid ? 'Yes' : 'No',
    'Uniform Paid': s.uniformPaid ? 'Yes' : 'No',
    Notes: s.notes || '-'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Passout Students");
  
  // Set column widths
  const wscols = [
    {wch: 25}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 12}, 
    {wch: 15}, {wch: 10}, {wch: 15}, {wch: 12}, {wch: 12}, {wch: 30}
  ];
  worksheet['!cols'] = wscols;

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export async function exportPassoutPDF(filters) {
  const students = await getPassoutStudents(filters);
  const settings = await prisma.schoolSettings.findFirst() || {};

  // Convert school-logo.png to base64 for reliable PDF embedding
  if (!settings.logoBase64) {
    try {
      const logoPath = path.join(process.cwd(), 'public', 'school-logo.png');
      const logoBuffer = fs.readFileSync(logoPath);
      settings.logoBase64 = `data:image/png;base64,${logoBuffer.toString('base64')}`;
    } catch (err) {
      console.error("Logo file reading failed:", err);
    }
  }

  // Ensure the component is a function (React Component)
  const PDFComponent = PassoutListPDF.default || PassoutListPDF;

  return renderToBuffer(
    React.createElement(PDFComponent, { 
      students, 
      filters, 
      settings 
    })
  );
}
