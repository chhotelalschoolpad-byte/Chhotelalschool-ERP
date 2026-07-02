import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';
import { generateReceiptNumber } from '@/lib/receipt';
import { createPaymentSchema } from '@/validations/paymentSchemas';

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function isFutureSession(monthName, year) {
  const now = new Date();
  const currentSessionStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const monthIndex = monthNames.indexOf(monthName);
  const sessionYear = monthIndex >= 3 ? year : year - 1;
  return sessionYear > currentSessionStartYear;
}

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
      month: initialMonth, 
      months, 
      paymentMode, 
      discount, 
      previousDueAmount, 
      paymentDate,
      paidDues = [],
      paymentItems,
      selectedItems 
    } = result.data;

    // 1. Normalize Inputs (Bridge old style requests)
    let finalPaymentItems = [...paymentItems];
    let finalMonths = months;

    // Fetch details of dues being paid
    let dbPaidDues = [];
    if (paidDues && paidDues.length > 0) {
      dbPaidDues = await prisma.studentDue.findMany({
        where: { id: { in: paidDues.map(d => d.id) } }
      });
    }

    // Add paid dues to finalPaymentItems so they show up in receipts
    for (const pd of paidDues) {
      const dbDue = dbPaidDues.find(d => d.id === pd.id);
      if (dbDue) {
        const typeLabel = dbDue.dueType === 'LEGACY' 
          ? `Legacy Due (Session ${dbDue.sessionYear})` 
          : `Misc Due: ${dbDue.notes || 'Other'}`;
        finalPaymentItems.push({
          type: typeLabel,
          dueId: dbDue.id,
          months: undefined,
          rate: pd.amountPaid,
          quantity: 1,
          total: pd.amountPaid
        });
      }
    }

    if (paymentItems.length === 0 && selectedItems && selectedItems.length > 0) {
      finalPaymentItems = selectedItems.map(i => {
        const isMonthly = i.type.toLowerCase().includes('monthly');
        const isTransport = i.type.toLowerCase().includes('transport') || i.type.toLowerCase().includes('van');
        let qty = 1;
        let rate = i.amount;
        let itemMonths = undefined;

        if (isMonthly && initialMonth) {
          const [y, m] = initialMonth.split('-').map(Number);
          if (y && m) {
            const mName = monthNames[m - 1];
            itemMonths = [mName];
            finalMonths = [{ month: mName, year: y }];
          }
        }

        return {
          type: isMonthly ? 'MONTHLY' : (isTransport ? 'TRANSPORT' : i.type.toUpperCase()),
          months: itemMonths,
          rate: rate,
          quantity: qty,
          total: rate * qty
        };
      });
    }

    // 2. Validate Selected Months
    if (finalMonths && finalMonths.length > 0) {
      const seen = new Set();
      for (const m of finalMonths) {
        const key = `${m.year}-${m.month}`;
        if (seen.has(key)) {
          return Response.json({ error: `Duplicate month selected: ${m.month} ${m.year}` }, { status: 400 });
        }
        seen.add(key);

        if (isFutureSession(m.month, m.year)) {
          return Response.json({ error: `Cannot pay for future academic session month: ${m.month} ${m.year}` }, { status: 400 });
        }
      }

      // Check against existing paid months in database
      const existingPayments = await prisma.payment.findMany({
        where: { studentId, status: 'SUCCESS' }
      });

      for (const m of finalMonths) {
        const monthIndex = monthNames.indexOf(m.month) + 1;
        const monthStr = String(monthIndex).padStart(2, '0');
        const ym = `${m.year}-${monthStr}`;

        const alreadyPaid = existingPayments.some(p => {
          if (!p.isMonthlyPaid) return false;
          if (p.month === ym) return true;
          if (p.selectedMonths && Array.isArray(p.selectedMonths)) {
            return p.selectedMonths.some(sm => sm.month === m.month && sm.year === m.year);
          }
          return false;
        });

        if (alreadyPaid) {
          return Response.json({ error: `Monthly fee for ${m.month} ${m.year} is already paid.` }, { status: 409 });
        }
      }
    }

    // 3. Server-side Calculations & Math Verification
    for (const item of finalPaymentItems) {
      const expectedTotal = item.rate * item.quantity;
      if (item.total !== expectedTotal) {
        return Response.json({ 
          error: `Calculation mismatch for ${item.type}: rate ${item.rate} * quantity ${item.quantity} = ${expectedTotal}, but got ${item.total}` 
        }, { status: 400 });
      }
    }

    const baseAmount = finalPaymentItems.reduce((sum, item) => sum + item.total, 0) + previousDueAmount;
    if (discount > baseAmount) {
      return Response.json({ error: "Discount cannot be greater than the total payable amount." }, { status: 400 });
    }
    const finalTotal = Math.max(0, baseAmount - discount);

    const isMonthlyPaid = finalPaymentItems.some(i => i.type.toUpperCase() === 'MONTHLY');

    // 4. Save to Database
    const finalResult = await prisma.$transaction(async (tx) => {
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

      // 1. Update individual StudentDue records
      let totalLegacyCleared = 0;
      for (const pd of paidDues) {
        const dbDue = dbPaidDues.find(d => d.id === pd.id);
        if (dbDue) {
          const remaining = Math.max(0, dbDue.amount - dbDue.paidAmount);
          const toPay = Math.min(pd.amountPaid, remaining);
          if (toPay > 0) {
            await tx.studentDue.update({
              where: { id: pd.id },
              data: { paidAmount: { increment: toPay } }
            });
            if (dbDue.dueType === 'LEGACY') {
              totalLegacyCleared += toPay;
            }
          }
        }
      }

      // 2. Legacy Due Clearance (backward compatibility for previousDueAmount)
      let actualClearing = 0;
      if (previousDueAmount > 0) {
        const remainingToClear = Math.max(0, student.previousDue - student.previousDuePaid);
        actualClearing = Math.min(previousDueAmount, remainingToClear);
      }

      // 3. Update total legacy dues paid on Student model
      const incrementLegacyPaid = actualClearing + totalLegacyCleared;
      if (incrementLegacyPaid > 0) {
        await tx.student.update({
          where: { id: studentId },
          data: {
            previousDuePaid: { increment: incrementLegacyPaid },
            updatedAt: new Date()
          }
        });
      }

      // Receipt number & Month YM generation
      const receiptNumber = await generateReceiptNumber(tx);
      let legacyMonthVal = initialMonth || "";
      if (finalMonths && finalMonths.length > 0) {
        const firstM = finalMonths[0];
        const monthIndex = monthNames.indexOf(firstM.month) + 1;
        legacyMonthVal = `${firstM.year}-${String(monthIndex).padStart(2, '0')}`;
      }

      // Calculate payment Date
      let finalPaymentDate = new Date();
      if (paymentDate) {
        const [y, m, d] = paymentDate.split('-').map(Number);
        finalPaymentDate = new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
      }

      const payment = await tx.payment.create({
        data: {
          studentId,
          admissionNumber: student.admissionNumber,
          month: legacyMonthVal,
          selectedMonths: finalMonths.length > 0 ? finalMonths : null,
          amount: finalTotal,
          discount,
          paymentMode,
          receiptNumber,
          recordedBy: authResult.user.username,
          paymentItems: finalPaymentItems,
          isMonthlyPaid,
          previousDueCleared: incrementLegacyPaid,
          status: 'SUCCESS',
          paymentDate: finalPaymentDate
        }
      });

      return { payment, receiptNumber, total: finalTotal };
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
