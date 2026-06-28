import { withAuth } from '@/lib/middleware';
import { getStudentPayments } from '@/services/paymentService';

export async function GET(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER', 'USER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const studentId = (await params).id;
    const payments = await getStudentPayments(studentId);

    return Response.json({ data: payments }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
