"use client"
import { X, User, Phone, MapPin, IndianRupee, FileText } from "lucide-react";

export default function StudentProfileModal({ isOpen, onClose, student }) {
  if (!isOpen || !student) return null;

  const getStatusEmoji = (value) => value ? "✅" : "❌";

  // Extract initials
  const initials = student.fullName
    ? student.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()
    : "ST";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto transform scale-100 transition-all duration-300 border border-gray-100">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{student.fullName}</h2>
              <p className="text-xs font-black uppercase text-gray-400 tracking-wider">
                {student.className} • Session {student.academicYear}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Family & Contact details */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest border-b border-blue-50 pb-1 flex items-center gap-1.5">
              <User size={14} className="text-blue-500" /> Personal & Contact Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-2.5">
                <User size={16} className="text-amber-500 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Father's Name</p>
                  <p className="text-sm font-semibold text-gray-800">{student.fatherName || "—"}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-2.5">
                <User size={16} className="text-pink-500 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Mother's Name</p>
                  <p className="text-sm font-semibold text-gray-800">{student.motherName || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <Phone size={16} className="text-emerald-500 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Contact Number</p>
                  <p className="text-sm font-semibold text-gray-800 font-mono">{student.contactNumber || "—"}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 md:col-span-2">
                <MapPin size={16} className="text-indigo-500 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Address</p>
                  <p className="text-sm font-semibold text-gray-800">{student.address || "—"}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Academic & Fee Status */}
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase text-emerald-600 tracking-widest border-b border-emerald-50 pb-1 flex items-center gap-1.5">
              <IndianRupee size={14} className="text-emerald-500" /> Clearance & Fee Status
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2.5">
                <IndianRupee size={16} className="text-teal-500" />
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Fees Status</p>
                  <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 ${
                    student.feesStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' :
                    student.feesStatus === 'PENDING' ? 'bg-rose-50 text-rose-700' :
                    'bg-amber-50 text-amber-700'
                  }`}>
                    {student.feesStatus}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <IndianRupee size={16} className="text-rose-500" />
                <div>
                  <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Pending Amount</p>
                  <p className={`text-sm font-bold mt-0.5 ${student.feesStatus === 'PAID' ? 'text-gray-500' : 'text-rose-600'}`}>
                    ₹{(student.pendingAmount || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3 bg-gray-50 p-4 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-50">
                <span className="text-xs font-bold text-gray-500">TC Taken</span>
                <span className="text-base">{getStatusEmoji(student.tcTaken)}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-50">
                <span className="text-xs font-bold text-gray-500">Result Collected</span>
                <span className="text-base">{getStatusEmoji(student.resultCollected)}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-50">
                <span className="text-xs font-bold text-gray-500">Books Paid</span>
                <span className="text-base">{getStatusEmoji(student.booksPaid)}</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-50">
                <span className="text-xs font-bold text-gray-500">Uniform Paid</span>
                <span className="text-base">{getStatusEmoji(student.uniformPaid)}</span>
              </div>
            </div>
          </div>

          {/* Notes / Remarks */}
          {student.notes && (
            <div className="space-y-2">
              <h3 className="text-xs font-black uppercase text-purple-600 tracking-widest border-b border-purple-50 pb-1 flex items-center gap-1.5">
                <FileText size={14} className="text-purple-500" /> Notes / Remarks
              </h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap font-medium leading-relaxed">
                {student.notes}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-sm font-bold transition-colors"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
