import { loginSchema } from '@/validations/authSchemas';
import { loginUser } from '@/services/authService';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);
    
    if (!result.success) {
      return Response.json({ error: result.error.errors }, { status: 400 });
    }

    const { user, token } = await loginUser(result.data.username, result.data.password);

    const cookieStore = await cookies();
    cookieStore.set('school_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 // 8 hours
    });

    return Response.json({ data: { user } }, { status: 200 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 401 });
  }
}
