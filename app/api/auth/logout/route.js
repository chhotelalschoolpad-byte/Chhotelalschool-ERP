import { cookies } from 'next/headers';

export async function POST() {
  const cookieStore = await cookies();
  cookieStore.delete('school_token');
  return Response.json({ data: { success: true } });
}
