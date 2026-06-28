import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const academicYear = searchParams.get('academicYear');
    const className = searchParams.get('className');

    const where = {};
    if (academicYear && academicYear !== 'all') where.academicYear = academicYear;
    if (className && className !== 'all') where.className = className;

    const total = await prisma.passoutStudent.count({ where });

    const fullyPaid = await prisma.passoutStudent.count({
      where: { ...where, feesStatus: 'PAID' },
    });

    const pendingStats = await prisma.passoutStudent.aggregate({
      where: { ...where, feesStatus: { not: 'PAID' } },
      _count: true,
      _sum: { pendingAmount: true },
    });

    const tcTaken = await prisma.passoutStudent.count({
      where: { ...where, tcTaken: true },
    });

    const resultCollected = await prisma.passoutStudent.count({
      where: { ...where, resultCollected: true },
    });

    const booksNotPaid = await prisma.passoutStudent.count({
      where: { ...where, booksPaid: false },
    });

    const uniformNotPaid = await prisma.passoutStudent.count({
      where: { ...where, uniformPaid: false },
    });

    return NextResponse.json({
      total,
      fullyPaid,
      pendingCount: pendingStats._count || 0,
      pendingAmount: pendingStats._sum.pendingAmount || 0,
      tcTaken,
      resultCollected,
      booksNotPaid,
      uniformNotPaid,
    });
  } catch (error) {
    console.error('Error fetching passout student stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
