import { withAuth } from '@/lib/middleware';
import { createStudentSchema, studentQuerySchema } from '@/validations/studentSchemas';
import { createStudent, getStudents } from '@/services/studentService';

export async function POST(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
    if (authResult.error) {
      return Response.json({ error: authResult.error }, { status: authResult.status });
    }

    const body = await req.json();

    // Zod discriminatedUnion validates the correct branch based on body.isExisting
    const result = createStudentSchema.safeParse(body);

    if (!result.success) {
      return Response.json(
        {
          error: 'Validation failed',
          issues: result.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const student = await createStudent(result.data, authResult.user.username);

    return Response.json({ data: student }, { status: 201 });

  } catch (err) {
    // Structured error from createStudent for duplicate admission numbers
    if (err.code === 'DUPLICATE_ADMISSION_NUMBER') {
      return Response.json({ error: err.message }, { status: err.status });
    }

    console.error('[POST /api/students]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER', 'USER']);
    if (authResult.error) {
      return Response.json({ error: authResult.error }, { status: authResult.status });
    }

    const { searchParams } = new URL(req.url);
    const query = {
      page:  searchParams.get('page')  || 1,
      limit: searchParams.get('limit') || 20,
    };

    if (searchParams.get('search'))     query.search     = searchParams.get('search');
    if (searchParams.get('class'))      query.class      = searchParams.get('class');
    if (searchParams.get('status'))     query.status     = searchParams.get('status');
    if (searchParams.get('isExisting')) query.isExisting = searchParams.get('isExisting');
    if (searchParams.get('session'))    query.session    = searchParams.get('session');

    const parsed = studentQuerySchema.safeParse(query);
    if (!parsed.success) {
      return Response.json({ error: parsed.error.errors }, { status: 400 });
    }

    const data = await getStudents(parsed.data);

    return Response.json({ data }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
