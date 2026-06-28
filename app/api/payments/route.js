import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';
import { generateReceiptNumber } from '@/lib/receipt';
import { createPaymentSchema } from '@/validations/paymentSchemas';

/**
 * POST /api/payments
 * 
 * Simplified payment recording logic:
 * 1. Validates input (Zod)
 * 2. Checks for duplicate monthly payments for the same month
 * 3. Atomic transaction: updates student legacy balance + creates payment record
 * 4. Server-side receipt number generation
 */
export async function POST(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
    if (authResult.error) {
      return Response.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const result = createPaymentSchema.safeParse(body);
    if (!result.success) {
      return Response.json({ error: result.error.errors }, { status: 400 });
    }

    const { 
      studentId, 
      month, 
      paymentMode, 
      discount, 
      previousDueAmount, 
      selectedItems 
    } = result.data;

    // Standardize "Monthly Fee" check
    const isMonthlyPaid = selectedItems.some(
      i => i.type.toLowerCase().includes('monthly')
    );

    // 1. Duplicate Monthly Guard
    if (isMonthlyPaid) {
      const existing = await prisma.payment.findFirst({
        where: { studentId, month, isMonthlyPaid: true }
      });
      if (existing) {
        return Response.json({ 
          error: `Monthly fee for ${month} is already recorded.` 
        }, { status: 409 });
      }
    }

    // 2. Atomic Transaction
    const finalResult = await prisma.$transaction(async (tx) => {
      // Fetch student for balance and validation
      const student = await tx.student.findUnique({
        where: { id: studentId },
        select: { 
          id: true, 
          admissionNumber: true, 
          previousDue: true, 
          previousDuePaid: true
        }
      });

      if (!student) {
        throw { status: 404, message: 'Student not found' };
      }

      const now = new Date();
      const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      let actualClearing = 0;
      if (previousDueAmount > 0) {
        const remainingToClear = Math.max(0, student.previousDue - student.previousDuePaid);
        actualClearing = Math.min(previousDueAmount, remainingToClear);
      }

      await tx.student.update({
        where: { id: studentId },
        data: {
          previousDuePaid: { increment: actualClearing },
          updatedAt: new Date()
        }
      });

      const receiptNumber = await generateReceiptNumber(tx);
      const baseAmount = selectedItems.reduce((sum, i) => sum + i.amount, 0) + previousDueAmount;
      const total = Math.max(0, baseAmount - discount);

      // Create Payment Record
      const payment = await tx.payment.create({
        data: {
          studentId,
          admissionNumber: student.admissionNumber,
          month,
          amount: total,
          discount,
          paymentMode,
          receiptNumber,
          recordedBy: authResult.user.username,
          paymentItems: selectedItems,
          isMonthlyPaid,
          previousDueCleared: actualClearing,
          status: 'SUCCESS'
        }
      });

      return { payment, receiptNumber, total };
    });

    return Response.json({ 
      success: true, 
      ...finalResult 
    }, { status: 201 });

  } catch (err) {
    console.error('[POST /api/payments]', err);
    return Response.json({ 
      error: err.message || 'System error recording payment' 
    }, { status: err.status || 500 });
  }
}
