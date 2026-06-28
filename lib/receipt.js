/**
 * Generates a sequential admission number inside a Prisma transaction.
 * Must be called with the transaction client (tx), NOT the global prisma,
 * to prevent race conditions when two staff submit simultaneously.
 *
 * Format: ADM-YYYY-NNNN  (e.g. ADM-2026-0001, ADM-2026-0023)
 */
export async function generateAdmissionNumber(tx) {
  const year = new Date().getFullYear();
  const prefix = `ADM-${year}-`;

  const latest = await tx.student.findFirst({
    where: { admissionNumber: { startsWith: prefix } },
    orderBy: { admissionNumber: 'desc' },
  });

  let nextNum = 1;
  if (latest) {
    const lastNumMatch = latest.admissionNumber.match(/-(\d+)$/);
    if (lastNumMatch) {
      nextNum = parseInt(lastNumMatch[1], 10) + 1;
    }
  }

  return `${prefix}${String(nextNum).padStart(4, "0")}`;
}

export async function generateReceiptNumber(tx) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}
