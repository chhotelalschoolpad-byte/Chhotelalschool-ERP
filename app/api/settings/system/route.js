import { withAuth } from '@/lib/middleware';
import { prisma } from '@/lib/prisma';
import { systemSettingsSchema } from '@/validations/settingsSchemas';

export async function GET(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER', 'USER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const settings = await prisma.systemSettings.findFirst();
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
    const result = systemSettingsSchema.safeParse(body);
    if (!result.success) return Response.json({ error: result.error.errors }, { status: 400 });

    const currentSettings = await prisma.systemSettings.findFirst();

    let data;
    if (currentSettings) {
      data = await prisma.systemSettings.update({
        where: { id: currentSettings.id },
        data: result.data
      });
    } else {
      data = await prisma.systemSettings.create({ data: result.data });
    }
    
    return Response.json({ data }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
