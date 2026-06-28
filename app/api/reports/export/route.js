import { withAuth } from '@/lib/middleware';
import { exportReportBuffer } from '@/services/reportService';

export async function GET(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const date = searchParams.get('date');
    const sessionYear = searchParams.get('session');

    if (!['daily', 'monthly', 'pending'].includes(type)) {
      return Response.json({ error: 'Invalid report type' }, { status: 400 });
    }

    const buffer = await exportReportBuffer(type, date, sessionYear);

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="report-${type}-${date || 'latest'}.xlsx"`
      }
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
