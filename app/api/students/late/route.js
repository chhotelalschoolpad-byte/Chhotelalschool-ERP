import { withAuth } from '@/lib/middleware';
import { getLateStudents } from '@/services/studentService';

export async function GET(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER', 'USER']);
    if (authResult.error) {
      return Response.json({ error: authResult.error }, { status: authResult.status });
    }

    const data = await getLateStudents();

    return Response.json({ data }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
