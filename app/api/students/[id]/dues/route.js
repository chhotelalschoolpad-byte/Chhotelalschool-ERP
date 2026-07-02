import { prisma } from '@/lib/prisma';
import { withAuth } from '@/lib/middleware';

export async function GET(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER', 'USER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const studentId = (await params).id;
    const dues = await prisma.studentDue.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });

    return Response.json({ data: dues }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const studentId = (await params).id;
    const body = await req.json();
    if (!Array.isArray(body)) {
      return Response.json({ error: 'Payload must be an array of dues' }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const existingDues = await tx.studentDue.findMany({
        where: { studentId }
      });

      const bodyIds = body.map(d => d.id).filter(id => id && !id.startsWith('new_'));
      const toDelete = existingDues.filter(ed => !bodyIds.includes(ed.id));

      if (toDelete.length > 0) {
        await tx.studentDue.deleteMany({
          where: { id: { in: toDelete.map(d => d.id) } }
        });
      }

      const upserted = [];
      let totalLegacyDue = 0;
      let totalLegacyDuePaid = 0;

      for (const due of body) {
        const isNew = !due.id || due.id.startsWith('new_');
        const amount = parseInt(due.amount) || 0;
        const paidAmount = parseInt(due.paidAmount) || 0;

        let record;
        if (isNew) {
          record = await tx.studentDue.create({
            data: {
              studentId,
              sessionYear: due.sessionYear,
              dueType: due.dueType,
              amount,
              paidAmount,
              notes: due.notes || null
            }
          });
        } else {
          record = await tx.studentDue.update({
            where: { id: due.id },
            data: {
              sessionYear: due.sessionYear,
              dueType: due.dueType,
              amount,
              paidAmount,
              notes: due.notes || null
            }
          });
        }
        upserted.push(record);

        if (record.dueType === 'LEGACY') {
          totalLegacyDue += record.amount;
          totalLegacyDuePaid += record.paidAmount;
        }
      }

      await tx.student.update({
        where: { id: studentId },
        data: {
          previousDue: totalLegacyDue,
          previousDuePaid: totalLegacyDuePaid,
          updatedAt: new Date()
        }
      });

      return upserted;
    });

    return Response.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error('[POST /api/students/[id]/dues]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
