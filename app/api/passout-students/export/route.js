import { exportPassoutExcel, exportPassoutPDF } from '@/services/passoutService';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'excel';
    
    const filters = {
      academicYear: searchParams.get('academicYear'),
      className: searchParams.get('className'),
      search: searchParams.get('search'),
      filter: searchParams.get('filter'),
      tcTaken: searchParams.get('tcTaken'),
      resultCollected: searchParams.get('resultCollected'),
      booksPaid: searchParams.get('booksPaid'),
      uniformPaid: searchParams.get('uniformPaid')
    };

    if (format === 'pdf') {
      const buffer = await exportPassoutPDF(filters);
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="passout-students-${filters.academicYear || 'report'}.pdf"`
        }
      });
    } else {
      const buffer = await exportPassoutExcel(filters);
      return new Response(buffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="passout-students-${filters.academicYear || 'report'}.xlsx"`
        }
      });
    }

  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
