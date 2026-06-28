import { prisma } from '../lib/prisma';
import { generateAdmissionNumber } from '../lib/receipt';

/**
 * Creates a student — handles both NEW and EXISTING branches.
 * NOW AUTOMATICALLY GENERATES INITIAL FEES (Admission, Monthly, Exam, Van).
 */
export async function createStudent(data, createdBy) {

      // ── EXISTING STUDENT BRANCH ──────────────────────────────────────────────
  if (data.isExisting === true) {
    const existing = await prisma.student.findUnique({
      where: { admissionNumber: data.admissionNumber },
    });

    if (existing) {
      throw {
        code: 'DUPLICATE_ADMISSION_NUMBER',
        message: `Admission number "${data.admissionNumber}" already exists.`,
        status: 409,
      };
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create Student
      const student = await tx.student.create({
        data: {
          admissionNumber:  data.admissionNumber,
          fullName:         data.fullName,
          gender:           data.gender,
          dateOfBirth:      data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          religion:         data.religion    ?? null,
          caste:            data.caste       ?? null,
          fatherName:       data.fatherName,
          motherName:       data.motherName  ?? null,
          mobile1:          data.mobile1     || "",
          mobile2:          data.mobile2     ?? null,
          address:          data.address     ?? null,
          state:            data.state       ?? null,
          country:          data.country     ?? 'India',
          className:        data.className,
          previousSchool:   data.previousSchool ?? null,
          admissionDate:    new Date(data.admissionDate),
          isExisting:       true,
          joiningYear:      data.joiningYear,
          previousDue:      data.previousDue ?? 0,
          aadhaarNumber:       data.aadhaarNumber       ?? null,
          parentAadhaarNumber: data.parentAadhaarNumber ?? null,
        },
      });

      return student;
    });
  }

  // ── NEW STUDENT BRANCH ───────────────────────────────────────────────────
  return prisma.$transaction(async (tx) => {
    const admissionNumber = await generateAdmissionNumber(tx);
    const admDate = data.admissionDate ? new Date(data.admissionDate) : new Date();

    const student = await tx.student.create({
      data: {
        admissionNumber,
        fullName:         data.fullName,
        gender:           data.gender,
        dateOfBirth:      data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        religion:         data.religion    ?? null,
        caste:            data.caste       ?? null,
        fatherName:       data.fatherName,
        motherName:       data.motherName  ?? null,
        mobile1:          data.mobile1     || "",
        mobile2:          data.mobile2     ?? null,
        address:          data.address     ?? null,
        state:            data.state       ?? null,
        country:          data.country     ?? 'India',
        className:        data.className,
        previousSchool:   data.previousSchool ?? null,
        admissionDate:    admDate,
        isExisting:       false,
        joiningYear:      null,
        previousDue:      0,
        aadhaarNumber:       data.aadhaarNumber       ?? null,
        parentAadhaarNumber: data.parentAadhaarNumber ?? null,
      },
    });

    return student;
  });
}

export async function getStudents(query) {
  const { search, class: className, isExisting, status, page = 1, limit = 20 } = query;
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const where = {};
  if (search) {
    where.OR = [
      { fullName:        { contains: search, mode: 'insensitive' } },
      { admissionNumber: { contains: search, mode: 'insensitive' } },
      { fatherName:      { contains: search, mode: 'insensitive' } },
      { mobile1:         { contains: search } },
    ];
  }

  if (className && className !== 'all') where.className = className;
  if (isExisting === 'true')  where.isExisting = true;
  if (isExisting === 'false') where.isExisting = false;

  // ── Status Filtering ─────────────────────────────────────────────────────
  if (status === 'paid') {
    where.payments = {
      some: {
        month: currentYM,
        isMonthlyPaid: true,
        status: 'SUCCESS'
      }
    };
  } else if (status === 'pending') {
    where.payments = {
      none: {
        month: currentYM,
        isMonthlyPaid: true,
        status: 'SUCCESS'
      }
    };
  } else if (status === 'legacy_due') {
    // Prisma doesn't support field-vs-field comparison directly in 'where'.
    // We use a raw query to fetch matching IDs and then filter by those.
    const matchingIds = await prisma.$queryRaw`
      SELECT id FROM "Student" WHERE "previousDue" > "previousDuePaid"
    `;
    const ids = matchingIds.map(m => m.id);
    where.id = { in: ids };
  }

  const skip = (page - 1) * limit;

  const [total, data] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      skip,
      take: parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        payments: {
          where: {
            month: currentYM,
            isMonthlyPaid: true,
            status: 'SUCCESS'
          },
          select: { id: true }
        }
      }
    }),
  ]);

  // Compute indicators on the fly
  const students = data.map(s => {
    const isMonthlyPaid = s.payments.length > 0 || s.isFeeExempt;
    const isMonthlyPending = !isMonthlyPaid;
    const hasLegacyDue = s.previousDue > s.previousDuePaid;
    
    // Clean up payments array from response
    const { payments: _, ...studentData } = s; 
    return {
      ...studentData,
      isMonthlyPending,
      hasLegacyDue
    };
  });

  return { data: students, total, page, limit };
}

export async function getLateStudents() {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  // Dashboard late list: Only those who haven't paid this month
  const students = await prisma.student.findMany({
    where: {
      NOT: {
        payments: {
          some: {
            month: currentYM,
            isMonthlyPaid: true,
            status: 'SUCCESS'
          }
        }
      },
      isFeeExempt: false
    },
    select: {
      id: true,
      fullName: true,
      admissionNumber: true,
      className: true,
      mobile1: true,
      previousDue: true,
      previousDuePaid: true
    },
    orderBy: { fullName: 'asc' }
  });

  return students.map(s => ({
    ...s,
    isMonthlyPending: true,
    hasLegacyDue: s.previousDue > s.previousDuePaid
  }));
}

export async function getStudentById(id) {
  return prisma.student.findUnique({
    where: { id },
    include: {
      payments: {
        orderBy: { paymentDate: 'desc' },
      }
    },
  });
}

export async function updateStudent(id, data) {
  const { isExisting: _ie, joiningYear: _jy, ...safeData } = data;

  if (safeData.admissionNumber) {
    const existing = await prisma.student.findFirst({
      where: {
        admissionNumber: safeData.admissionNumber,
        NOT: { id },
      },
    });

    if (existing) {
      throw {
        code: 'DUPLICATE_ADMISSION_NUMBER',
        message: `Admission number "${safeData.admissionNumber}" already exists.`,
        status: 409,
      };
    }
  }

  const updateData = { ...safeData };
  if (updateData.dateOfBirth !== undefined) {
    updateData.dateOfBirth = updateData.dateOfBirth && updateData.dateOfBirth.trim() !== ""
      ? new Date(updateData.dateOfBirth)
      : null;
  }

  return prisma.student.update({
    where: { id },
    data: updateData,
  });
}

export async function deleteStudent(id, adminUsername) {
  return prisma.$transaction(async (tx) => {
    await tx.deletedPayment.deleteMany({ where: { studentId: id } });
    await tx.payment.deleteMany({ where: { studentId: id } });
    return tx.student.delete({ where: { id } });
  });
}
