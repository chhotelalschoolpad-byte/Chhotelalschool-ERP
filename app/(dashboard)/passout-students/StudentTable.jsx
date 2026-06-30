"use client"
import { Edit2, Trash2, CheckCircle2, XCircle } from "lucide-react";
import Badge from "@/components/ui/Badge";

export default function StudentTable({ students, isLoading, page, setPage, total, limit, onEdit, onDelete, onRowClick }) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
        <div className="h-12 bg-gray-50 border-b border-gray-100" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-16 border-b border-gray-50" />
        ))}
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <GraduationCap className="w-8 h-8 text-gray-300" />
        </div>
        <p className="text-gray-500 font-medium">No passout students found</p>
        <p className="text-sm text-gray-400 mt-1">Try adjusting your filters or add a new record.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[13px] font-sans">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-[10px] uppercase text-gray-500 font-black tracking-widest">
              <th className="px-6 py-4">Name</th>
              <th className="px-6 py-4">Class</th>
              <th className="px-6 py-4">Fees Status</th>
              <th className="px-6 py-4">Pending</th>
              <th className="px-6 py-4">TC</th>
              <th className="px-6 py-4">Result</th>
              <th className="px-6 py-4">Books</th>
              <th className="px-6 py-4">Uniform</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {students.map((student) => (
              <tr 
                key={student.id} 
                onClick={() => onRowClick(student)}
                className="hover:bg-gray-100/70 cursor-pointer transition-colors duration-300"
              >
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="font-bold text-gray-900">{student.fullName}</span>
                    {(student.fatherName || student.address) && (
                      <span className="text-[11px] text-gray-400 font-normal mt-0.5 leading-normal">
                        {student.fatherName ? `Father: ${student.fatherName}` : ''}
                        {student.fatherName && student.address ? ' | ' : ''}
                        {student.address ? `Address: ${student.address}` : ''}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600 font-medium">{student.className}</td>
                <td className="px-6 py-4">
                  <Badge 
                    status={
                      student.feesStatus === 'PAID' ? 'paid' : 
                      student.feesStatus === 'PENDING' ? 'pending' : 'due'
                    } 
                    text={student.feesStatus} 
                  />
                </td>
                <td className="px-6 py-4 text-rose-600 font-semibold tracking-tighter">
                  {student.feesStatus === 'PAID' ? "0" : (student.pendingAmount > 0 ? `+₹${student.pendingAmount.toLocaleString()}` : "-")}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge condition={student.tcTaken} />
                </td>
                <td className="px-6 py-4">
                  <StatusBadge condition={student.resultCollected} />
                </td>
                <td className="px-6 py-4">
                  <StatusBadge condition={student.booksPaid} />
                </td>
                <td className="px-6 py-4">
                  <StatusBadge condition={student.uniformPaid} />
                </td>
                <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(student)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(student.id)}
                      className="p-2 text-gray-400 hover:text-rose-600 transition-colors bg-gray-50 hover:bg-rose-50 rounded-lg"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
          Showing {Math.min(students.length, limit)} of {total} records
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Prev
          </button>
          <div className="h-8 w-8 flex items-center justify-center bg-blue-600 text-white rounded-lg text-xs font-black shadow-lg shadow-blue-200">
            {page}
          </div>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page * limit >= total}
            className="px-4 py-2 text-xs font-black uppercase tracking-widest bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ condition }) {
  return (
    <span className="text-base select-none">
      {condition ? "✅" : "❌"}
    </span>
  );
}

function GraduationCap(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  )
}
