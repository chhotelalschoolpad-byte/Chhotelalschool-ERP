import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';
import { updateFeeStructure } from '@/services/feeService';
import { updateFeeSchema } from '@/validations/feeSchemas';

export async function PUT(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const id = (await params).id;
    const body = await req.json();
    const result = updateFeeSchema.safeParse(body);
    if (!result.success) return Response.json({ error: result.error.errors }, { status: 400 });

    const data = await updateFeeStructure(id, result.data);
    return Response.json({ data }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const id = (await params).id;
    await prisma.feeStructure.delete({ where: { id } });
    return Response.json({ message: 'Fee structure deleted' }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
