import { withAuth } from '@/lib/middleware';
import { deletePayment } from '@/services/paymentService';

export async function DELETE(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const paymentId = (await params).id;
    await deletePayment(paymentId, authResult.user.username);

    return Response.json({ data: { message: "Payment moved to deleted records" } }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
