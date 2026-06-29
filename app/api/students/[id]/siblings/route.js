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
        parentAadhaarNumber: true,
        mobile1: true,
        mobile2: true
      }
    });

    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

    // Build the "OR" query for siblings
    const siblingCriteria = [];
    
    const parentAadhaar = student.parentAadhaarNumber?.trim();
    if (parentAadhaar) {
      siblingCriteria.push({ parentAadhaarNumber: parentAadhaar });
    }
    
    const mobile1 = student.mobile1?.trim();
    if (mobile1) {
      siblingCriteria.push({ mobile1: mobile1 });
      siblingCriteria.push({ mobile2: mobile1 });
    }
    
    const mobile2 = student.mobile2?.trim();
    if (mobile2) {
      siblingCriteria.push({ mobile1: mobile2 });
      siblingCriteria.push({ mobile2: mobile2 });
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
