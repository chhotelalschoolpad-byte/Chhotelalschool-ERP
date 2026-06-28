import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';

export async function GET(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER', 'USER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const studentId = (await params).id;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        fatherName: true,
        motherName: true,
        aadhaarNumber: true,
        parentAadhaarNumber: true
      }
    });

    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

    // Build the "OR" query for siblings
    const siblingCriteria = [];
    
    if (student.fatherName) {
      siblingCriteria.push({ fatherName: { equals: student.fatherName, mode: 'insensitive' } });
    }
    
    if (student.motherName) {
      siblingCriteria.push({ motherName: { equals: student.motherName, mode: 'insensitive' } });
    }
    
    if (student.aadhaarNumber) {
      siblingCriteria.push({ aadhaarNumber: student.aadhaarNumber });
    }
    
    if (student.parentAadhaarNumber) {
      siblingCriteria.push({ parentAadhaarNumber: student.parentAadhaarNumber });
    }

    if (siblingCriteria.length === 0) {
      return Response.json({ data: [] }, { status: 200 });
    }

    const siblings = await prisma.student.findMany({
      where: {
        id: { not: studentId },
        OR: siblingCriteria
      },
      select: {
        id: true,
        fullName: true,
        admissionNumber: true,
        className: true,
        fatherName: true,
        motherName: true,
        isFeeExempt: true
      },
      orderBy: { fullName: 'asc' }
    });

    return Response.json({ data: siblings }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
