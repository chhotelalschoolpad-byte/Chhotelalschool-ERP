import { withAuth } from '@/lib/middleware';
import { changePasswordSchema } from '@/validations/authSchemas';
import { changeUserPassword } from '@/services/authService';

export async function POST(req) {
  try {
    const authResult = await withAuth(req);
    if (authResult.error) {
      return Response.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();
    const result = changePasswordSchema.safeParse(body);
    
    if (!result.success) {
      return Response.json({ error: result.error.errors }, { status: 400 });
    }

    const userId = authResult.user.userId || authResult.user.id || authResult.user.sub;
    await changeUserPassword(userId, result.data.currentPassword, result.data.newPassword);

    return Response.json({ data: { success: true } }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
