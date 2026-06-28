import { signupSchema } from '@/validations/authSchemas';
import { signupUser } from '@/services/authService';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const body = await req.json();
    const result = signupSchema.safeParse(body);
    
    if (!result.success) {
      return Response.json({ error: result.error.errors }, { status: 400 });
    }

    const { username, password, role, secretKey } = result.data;
    const { user, token } = await signupUser(username, password, role, secretKey);

    const cookieStore = await cookies();
    cookieStore.set('school_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 60 * 60 // 8 hours
    });

    return Response.json({ data: { user } }, { status: 201 });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 400 });
  }
}
