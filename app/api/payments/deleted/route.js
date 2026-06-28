import { withAuth } from '@/lib/middleware';
import { getDeletedPayments } from '@/services/paymentService';

export async function GET(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await getDeletedPayments(page, limit);

    return Response.json(result, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
