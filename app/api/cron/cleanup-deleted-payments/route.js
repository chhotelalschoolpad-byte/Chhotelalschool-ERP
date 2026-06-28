import { prisma } from '@/lib/prisma';

export async function POST(req) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Auto-delete is disabled as per requirements
    return Response.json({ data: { deleted: 0, message: "Auto-deletion is disabled." } }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
