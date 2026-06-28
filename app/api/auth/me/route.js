import { withAuth } from '@/lib/middleware';

export async function GET(req) {
  try {
    const authResult = await withAuth(req);
    if (authResult.error) {
      return Response.json({ error: authResult.error }, { status: authResult.status });
    }
    
    return Response.json({ data: authResult.user }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
