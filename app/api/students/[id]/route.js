import { withAuth } from '@/lib/middleware';
import { updateStudentSchema } from '@/validations/studentSchemas';
import { getStudentById, updateStudent, deleteStudent } from '@/services/studentService';

export async function GET(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER', 'USER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const studentId = (await params).id;
    const student = await getStudentById(studentId);
    
    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 });

    return Response.json({ data: student }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN', 'MANAGER']);
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const studentId = (await params).id;
    const body = await req.json();
    const result = updateStudentSchema.safeParse(body);
    
    if (!result.success) return Response.json({ error: result.error.errors }, { status: 400 });

    const student = await updateStudent(studentId, result.data);

    return Response.json({ data: student }, { status: 200 });
  } catch (error) {
    if (error.code === 'DUPLICATE_ADMISSION_NUMBER') {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const authResult = await withAuth(req, ['ADMIN']); // ADMIN ONLY
    if (authResult.error) return Response.json({ error: authResult.error }, { status: authResult.status });

    const { searchParams } = new URL(req.url);
    if (searchParams.get('confirm') !== 'true') {
      return Response.json({ error: "Missing confirm=true query param" }, { status: 400 });
    }

    const studentId = (await params).id;
    await deleteStudent(studentId, authResult.user.username);

    return Response.json({ data: { success: true } }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
