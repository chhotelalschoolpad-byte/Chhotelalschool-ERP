import { prisma } from '../lib/prisma';
import { generateAdmissionNumber } from '../lib/receipt';

const getJoiningYear = (admissionNumber) => {
  if (!admissionNumber) return new Date().getFullYear();
  const parts = admissionNumber.split("-");
  for (const part of parts) {
    const y = parseInt(part, 10);
    if (!isNaN(y) && y >= 1000 && y <= 9999) {
      return y;
    }
  }
  const firstPart = parseInt(parts[0], 10);
  return isNaN(firstPart) ? new Date().getFullYear() : firstPart;
};

const ALL_CLASSES = [
  'LKG', 'UKG', 
  'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
  'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
  'Class 11', 'Class 12'
];

function getPromotedClass(originalClass, diff) {
  if (!originalClass) return '';
  if (diff <= 0) return originalClass;
  
  const norm = (c) => c.toLowerCase().replace(/\s+/g, '');
  const index = ALL_CLASSES.findIndex(c => norm(c) === norm(originalClass));
  
  if (index === -1) {
    const match = originalClass.match(/\d+/);
    if (match) {
      const num = parseInt(match[0], 10);
      const promotedNum = num + diff;
      return originalClass.replace(/\d+/, promotedNum);
    }
    return originalClass;
  }
  
  const targetIndex = index + diff;
  if (targetIndex >= ALL_CLASSES.length) {
    return 'Alumni';
  }
  return ALL_CLASSES[targetIndex];
}

/**
 * Creates a student — handles both NEW and EXISTING branches.
 * NOW AUTOMATICALLY GENERATES INITIAL FEES (Admission, Monthly, Exam, Van).
 */
async function syncStudentLegacyDue(tx, studentId, previousDue, previousDuePaid = 0, joiningYear = null, admissionNumber = null, admissionDate = null) {
  let sessionYearStr = String(joiningYear || "");
  if (!sessionYearStr) {
    if (admissionNumber) {
      sessionYearStr = String(getJoiningYear(admissionNumber));
    } else {
      const date = admissionDate ? new Date(admissionDate) : new Date();
      sessionYearStr = String(date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1);
    }
  }

  const existingDue = await tx.studentDue.findFirst({
    where: {
      studentId,
      sessionYear: sessionYearStr,
      dueType: "LEGACY"
    }
  });

  if (existingDue) {
    if (previousDue === 0 && existingDue.paidAmount === 0) {
      await tx.studentDue.delete({ where: { id: existingDue.id } });
    } else {
      await tx.studentDue.update({
        where: { id: existingDue.id },
        data: {
          amount: previousDue,
          paidAmount: previousDuePaid
        }
      });
    }
  } else if (previousDue > 0) {
    await tx.studentDue.create({
      data: {
        studentId,
        sessionYear: sessionYearStr,
        dueType: "LEGACY",
        amount: previousDue,
        paidAmount: previousDuePaid,
        notes: `Carry-Forward Dues for Session ${sessionYearStr}`
      }
    });
  }
}

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

      await syncStudentLegacyDue(tx, student.id, data.previousDue ?? 0, 0, data.joiningYear, data.admissionNumber, data.admissionDate);

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
        previousDue:      data.previousDue ?? 0,
        aadhaarNumber:       data.aadhaarNumber       ?? null,
        parentAadhaarNumber: data.parentAadhaarNumber ?? null,
      },
    });

    await syncStudentLegacyDue(tx, student.id, data.previousDue ?? 0, 0, null, admissionNumber, admDate);

    return student;
  });
}

export async function getStudents(query) {
  const { search, class: className, isExisting, status, session, page = 1, limit = 20 } = query;
  const now = new Date();
  const currentSessionYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  const activeSessionYear = session ? parseInt(session, 10) : currentSessionYear;

  const targetYear = activeSessionYear + (now.getFullYear() - currentSessionYear);
  const targetYM = `${targetYear}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const where = {};
  if (search) {
    where.OR = [
      { fullName:        { contains: search, mode: 'insensitive' } },
      { admissionNumber: { contains: search, mode: 'insensitive' } },
      { fatherName:      { contains: search, mode: 'insensitive' } },
      { mobile1:         { contains: search } },
    ];
  }

  if (isExisting === 'true')  where.isExisting = true;
  if (isExisting === 'false') where.isExisting = false;

  // ── Status Filtering ─────────────────────────────────────────────────────
  if (status === 'paid') {
    where.payments = {
      some: {
        month: targetYM,
        isMonthlyPaid: true,
        status: 'SUCCESS'
      }
    };
  } else if (status === 'pending') {
    where.payments = {
      none: {
        month: targetYM,
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

  const rawStudents = await prisma.student.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      payments: {
        where: {
          month: targetYM,
          isMonthlyPaid: true,
          status: 'SUCCESS'
        },
        select: { id: true }
      }
    }
  });

  // Calculate indicators and promoted class on the fly
  let students = rawStudents.map(s => {
    const isMonthlyPaid = s.payments.length > 0 || s.isFeeExempt;
    const isMonthlyPending = !isMonthlyPaid;
    const hasLegacyDue = s.previousDue > s.previousDuePaid;
    
    // Calculate joiningYear
    const jYear = s.joiningYear || getJoiningYear(s.admissionNumber);
    const diff = activeSessionYear - jYear;
    const promotedClass = getPromotedClass(s.className, diff);

    // Clean up payments array from response
    const { payments: _, ...studentData } = s; 
    return {
      ...studentData,
      className: promotedClass,
      isMonthlyPending,
      hasLegacyDue
    };
  });

  // Filter by className if selected
  if (className && className !== 'all') {
    students = students.filter(s => s.className.toLowerCase() === className.toLowerCase());
  }

  // Paginate in memory
  const total = students.length;
  const skip = (page - 1) * limit;
  const paginatedData = students.slice(skip, skip + limit);

  return { data: paginatedData, total, page, limit };
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
      },
      dues: {
        orderBy: { createdAt: 'desc' },
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

  return prisma.$transaction(async (tx) => {
    const student = await tx.student.update({
      where: { id },
      data: updateData,
    });

    if (updateData.previousDue !== undefined) {
      await syncStudentLegacyDue(tx, student.id, student.previousDue, student.previousDuePaid, student.joiningYear, student.admissionNumber, student.admissionDate);
    }

    return student;
  });
}

export async function deleteStudent(id, adminUsername) {
  return prisma.$transaction(async (tx) => {
    await tx.deletedPayment.deleteMany({ where: { studentId: id } });
    await tx.payment.deleteMany({ where: { studentId: id } });
    return tx.student.delete({ where: { id } });
  });
}
