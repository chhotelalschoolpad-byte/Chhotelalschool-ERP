"use client"

import { useParams } from 'next/navigation';
import { useStudent } from '@/hooks/useStudents';
import AdmissionForm from '@/components/students/AdmissionForm';
import { Loader2, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EditStudentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { student, isLoading, error } = useStudent(id);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-sm font-bold text-gray-500 uppercase tracking-widestAlpha">Fetching Records...</p>
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-black text-red-600">Student Not Found</h2>
        <p className="text-gray-500 mt-2">The record you are trying to edit does not exist or has been removed.</p>
      </div>
    );
  }

  // Pre-process date strings and null fields for form binding
  const processedStudent = {
    ...student,
    dateOfBirth: student.dateOfBirth ? new Date(student.dateOfBirth).toISOString().split('T')[0] : '',
    admissionDate: student.admissionDate ? new Date(student.admissionDate).toISOString().split('T')[0] : '',
    religion: student.religion ?? '',
    caste: student.caste ?? '',
    motherName: student.motherName ?? '',
    mobile2: student.mobile2 ?? '',
    address: student.address ?? '',
    state: student.state ?? '',
    previousSchool: student.previousSchool ?? '',
    aadhaarNumber: student.aadhaarNumber ?? '',
    parentAadhaarNumber: student.parentAadhaarNumber ?? '',
    exemptionReason: student.exemptionReason ?? '',
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <button 
        onClick={() => router.push(`/students/${id}`)}
        className="flex items-center gap-2 text-gray-400 hover:text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em] transition-all group"
      >
        <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> 
        Back to Profile
      </button>
      <AdmissionForm initialData={processedStudent} />
    </div>
  );
}
