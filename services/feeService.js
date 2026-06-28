import { prisma } from '../lib/prisma';

export async function createFeeStructure(data) {
  return prisma.feeStructure.create({
    data
  });
}

export async function getFeeStructures() {
  return prisma.feeStructure.findMany({
    orderBy: { className: 'asc' }
  });
}

export async function updateFeeStructure(id, data) {
  return prisma.feeStructure.update({
    where: { id },
    data
  });
}

export async function deleteFeeStructure(id) {
  return prisma.feeStructure.delete({
    where: { id }
  });
}
