import { withAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { schoolSettingsSchema } from '@/validations/settingsSchemas';

export async function GET(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER', 'USER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const settings = await prisma.schoolSettings.findFirst();
    return Response.json({ data: settings }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const body = await req.json();
    const result = schoolSettingsSchema.safeParse(body);
    if (!result.success) return Response.json({ error: result.error.errors }, { status: 400 });

    const currentSettings = await prisma.schoolSettings.findFirst();

    if (currentSettings) {
      if (currentSettings.schoolName !== result.data.schoolName) {
        const diff = Date.now() - new Date(currentSettings.nameLastChanged).getTime();
        if (diff < 10 * 60 * 1000) {
          return Response.json({ error: "School name can only be changed once every 10 minutes" }, { status: 429 });
        }
        result.data.nameLastChanged = new Date();
      }
      
      const updated = await prisma.schoolSettings.update({
        where: { id: currentSettings.id },
        data: result.data
      });
      return Response.json({ data: updated }, { status: 200 });
    } else {
      result.data.nameLastChanged = new Date();
      const created = await prisma.schoolSettings.create({ data: result.data });
      return Response.json({ data: created }, { status: 201 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
