import { withAuth } from '@/lib/middleware';
import { getFeeStructures, createFeeStructure } from '@/services/feeService';
import { createFeeSchema } from '@/validations/feeSchemas';

export async function GET(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER', 'USER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const data = await getFeeStructures();
    return Response.json({ data }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const body = await req.json();
    const result = createFeeSchema.safeParse(body);
    if (!result.success) return Response.json({ error: result.error.errors }, { status: 400 });

    const data = await createFeeStructure(result.data);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
