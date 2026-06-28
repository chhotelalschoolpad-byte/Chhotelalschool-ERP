import { withAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';

export async function DELETE(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const id = (await params).id;

    await prisma.deletedPayment.delete({
      where: { id }
    });

    return Response.json({ message: "Archived payment record permanently deleted" }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
