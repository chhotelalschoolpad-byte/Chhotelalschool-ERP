"use client"

import { useStudents } from '@/hooks/useStudents';
import { useSchoolSettings, useSystemSettings } from '@/hooks/useSettings';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Badge from '@/components/ui/Badge';
import { Search, Plus, Eye, CreditCard, Trash2, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

export default function StudentsPage() {
  const router = useRouter();
  const [search, setSearch]               = useState('');
  const [debouncedSearch]                 = useDebounce(search, 300);
  const [filterClass, setFilterClass]     = useState('all');
  const [filterStatus, setFilterStatus]   = useState('all');
  const [filterType, setFilterType]       = useState('all'); // all | new | existing
  const [page, setPage]                   = useState(1);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const { settings: systemSettings } = useSystemSettings();
  const classes = systemSettings?.defaultClasses || [];

  // Build query params including isExisting filter
  const isExistingParam =
    filterType === 'existing' ? '&isExisting=true'  :
    filterType === 'new'      ? '&isExisting=false' : '';

  const queryParams = `?search=${debouncedSearch}&class=${filterClass}&status=${filterStatus}${isExistingParam}&page=${page}&limit=20`;
  const { students, total, isLoading, mutate } = useStudents(queryParams);

  useEffect(() => { setPage(1); }, [debouncedSearch, filterClass, filterStatus, filterType]);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    const res = await fetch(`/api/students/${deleteConfirm}?confirm=true`, { method: 'DELETE' });
    if (res.ok) {
      toast.success("Student removed successfully");
      mutate();
    } else {
      const err = await res.json();
      toast.error(err.error || "Failed to delete student");
    }
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Students{' '}
            <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full ml-2">{total}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage enrollments and view student records</p>
        </div>
        <Link href="/students/new" className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-200">
          <Plus size={18} className="mr-2" /> Add Student
        </Link>
      </div>

      {/* ── Filters ──────────────────────────────────────────────────── */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4 items-start md:items-center flex-wrap">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search by name, roll no or mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900"
          />
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Class filter */}
          <select
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="all">All Classes</option>
            {classes.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Status filter */}
          <select
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px] text-gray-700"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid (Month)</option>
            <option value="pending">Pending (Month)</option>
            <option value="legacy_due">Legacy Due</option>
          </select>

          {/* Student type filter */}
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {[
              { value: 'all',      label: 'All' },
              { value: 'new',      label: 'New' },
              { value: 'existing', label: 'Existing' },
            ].map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setFilterType(value)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === value ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Student Table ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[13px] font-sans">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-500 font-black tracking-[0.15em]">
                <th className="px-6 py-2">Student</th>
                <th className="px-6 py-2">Roll No</th>
                <th className="px-6 py-2">Class</th>
                <th className="px-6 py-2">Status</th>
                <th className="px-6 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4" />
                      <p className="text-gray-500 text-sm">Loading students...</p>
                    </div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    No students found matching your criteria.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => router.push(`/students/${student.id}`)}
                    className="hover:bg-gray-100/40 cursor-pointer transition-colors border-b border-gray-100"
                  >
                    <td className="px-6 py-2">
                      <div className="flex items-center">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold uppercase text-sm">
                          {student.fullName.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/students/${student.id}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-bold text-gray-900 hover:text-blue-600 transition-colors"
                            >
                              {student.fullName}
                            </Link>
                            {/* "Since YYYY" badge for existing students */}
                            {student.isExisting && student.joiningYear && (
                              <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                                <Clock size={10} />
                                Since {student.joiningYear}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{student.fatherName} • {student.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-2"><Badge text={student.admissionNumber} /></td>
                    <td className="px-6 py-2 whitespace-nowrap text-gray-600">{student.className}</td>
                    <td className="px-6 py-2 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        {student.isFeeExempt ? (
                          <Badge status="paid" text="Exempt" />
                        ) : student.isMonthlyPending ? (
                          <Badge status="pending" text="Monthly Pending" />
                        ) : (
                          <Badge status="paid" text="Paid" />
                        )}
                        {student.hasLegacyDue && (
                          <Badge status="due" text="Has Legacy Dues" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-2 whitespace-nowrap text-right font-medium space-x-2">
                      <Link
                        href={`/students/${student.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 p-2 rounded-lg inline-flex"
                        title="View Profile"
                      >
                        <Eye size={18} />
                      </Link>
                      {student.mobile1 && (
                        <Link
                          href={`/messaging?studentId=${student.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-gray-400 hover:text-emerald-600 transition-all bg-gray-50 hover:bg-emerald-50 p-2 rounded-lg inline-flex"
                          title="Open Messaging"
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </Link>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteConfirm(student.id);
                        }}
                        className="text-gray-400 hover:text-red-600 transition-colors bg-gray-50 hover:bg-red-50 p-2 rounded-lg inline-flex"
                        title="Delete Student"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <span className="text-sm text-gray-500">Showing page {page}</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-50 transition-all hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={students.length < 20}
              className="px-3 py-1 bg-white border border-gray-300 rounded text-sm text-gray-700 disabled:opacity-50 transition-all hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Student"
        message="Are you sure? This action cannot be undone. The student will be permanently removed from the database."
        confirmText="Delete Student"
        isDanger={true}
      />
    </div>
  );
}
