import { withAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { generateAdmissionNumber } from '@/lib/receipt';

export async function GET(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER', 'USER']);
    if (authResult.error) {
      return Response.json({ error: authResult.error }, { status: authResult.status });
    }

    const nextNumber = await generateAdmissionNumber(prisma);
    return Response.json({ nextNumber }, { status: 200 });
  } catch (error) {
    console.error('[GET /api/students/next-number]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
