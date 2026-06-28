import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    // Sanitize body: Remove read-only fields that shouldn't be in the update data
    const { id: _, createdAt, updatedAt, fullName, className, academicYear, feesStatus, pendingAmount, ...rest } = body;

    // Auto-reset pending amount if PAID
    const actualPendingAmount = feesStatus === 'PAID' ? 0 : (parseInt(pendingAmount) || 0);

    const updated = await prisma.passoutStudent.update({
      where: { id },
      data: {
        fullName,
        className,
        academicYear,
        feesStatus,
        pendingAmount: actualPendingAmount,
        ...rest,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    console.error('Error updating passout student:', error);
    return NextResponse.json({ error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await prisma.passoutStudent.delete({ where: { id } });
    return NextResponse.json({ message: 'Passout student deleted successfully' });
  } catch (error) {
    console.error('Error deleting passout student:', error);
    return NextResponse.json({ error: 'Failed to delete student' }, { status: 500 });
  }
}
