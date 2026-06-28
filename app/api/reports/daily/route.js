import { withAuth } from '@/lib/middleware';
import { getDailyReport } from '@/services/reportService';

export async function GET(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().slice(0, 10);
    const sessionYear = searchParams.get('session');
    
    const data = await getDailyReport(dateStr, sessionYear);
    return Response.json({ data }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
