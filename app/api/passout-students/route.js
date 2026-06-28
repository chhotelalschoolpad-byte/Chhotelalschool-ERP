import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPassoutStudents, getPassoutWhere } from '@/services/passoutService';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear');
    const className = searchParams.get('className');
    const search = searchParams.get('search');
    const filter = searchParams.get('filter') || 'all';
    
    // Detailed Toggle Filters
    const tcTaken = searchParams.get('tcTaken');
    const resultCollected = searchParams.get('resultCollected');
    const booksPaid = searchParams.get('booksPaid');
    const uniformPaid = searchParams.get('uniformPaid');

    const page = searchParams.get('page') || '1';
    const limit = searchParams.get('limit') || '20';

    const filterObj = {
      academicYear, 
      className, 
      search, 
      filter,
      tcTaken,
      resultCollected,
      booksPaid,
      uniformPaid,
      page,
      limit
    };

    const [students, total] = await Promise.all([
      getPassoutStudents(filterObj),
      prisma.passoutStudent.count({ 
        where: await getPassoutWhere(filterObj) 
      }),
    ]);

    return NextResponse.json({
      data: students,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error('Error fetching passout students:', error);
    return NextResponse.json({ error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { fullName, className, academicYear, feesStatus, pendingAmount, ...rest } = body;

    if (!fullName || !className || !academicYear || !feesStatus) {
      return NextResponse.json({ error: 'Required fields missing' }, { status: 400 });
    }

    // Auto-reset pending amount if PAID
    const actualPendingAmount = feesStatus === 'PAID' ? 0 : (parseInt(pendingAmount) || 0);

    const student = await prisma.passoutStudent.create({
      data: {
        fullName,
        className,
        academicYear,
        feesStatus,
        pendingAmount: actualPendingAmount,
        ...rest,
      },
    });

    return NextResponse.json({ data: student });
  } catch (error) {
    console.error('Error creating passout student:', error);
    return NextResponse.json({ error: 'Failed to create student' }, { status: 500 });
  }
}
