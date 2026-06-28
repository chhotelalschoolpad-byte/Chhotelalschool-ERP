import { prisma } from '../lib/prisma';

/**
 * Archive a payment: 
 * Moves the payment record to the DeletedPayment table and removes the primary record.
 * Restores legacy due balance if the payment had cleared any.
 */
export async function deletePayment(id, deletedBy) {
  return prisma.$transaction(async (tx) => {
    // 1. Get current payment record
    const payment = await tx.payment.findUnique({
      where: { id },
      include: { student: true }
    });

    if (!payment) throw new Error("Payment record not found");

    // 2. Create deletion snapshot
    await tx.deletedPayment.create({
      data: {
        originalPaymentId: payment.id,
        studentId: payment.studentId,
        paymentSnapshot: payment,
        deletedBy,
        autoDeleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      }
    });

    // 3. Rollback student legacy dues if applicable
    if (payment.previousDueCleared > 0) {
      await tx.student.update({
        where: { id: payment.studentId },
        data: {
          previousDuePaid: { decrement: payment.previousDueCleared }
        }
      });
    }

    // 4. Delete the original payment record
    return tx.payment.delete({
      where: { id }
    });
  });
}

/**
 * Get Paginated List of Deleted Payments
 */
export async function getDeletedPayments(page = 1, limit = 20) {
  const skip = (page - 1) * limit;

  const [total, data] = await Promise.all([
    prisma.deletedPayment.count(),
    prisma.deletedPayment.findMany({
      skip,
      take: limit,
      orderBy: { deletedAt: 'desc' },
      include: {
        student: { select: { fullName: true, admissionNumber: true, className: true } }
      }
    })
  ]);

  return { data, total, page, limit };
}

/**
 * Get List of Payments for a specific Student
 */
export async function getStudentPayments(studentId) {
  return prisma.payment.findMany({
    where: { studentId },
    orderBy: { paymentDate: 'desc' }
  });
}
