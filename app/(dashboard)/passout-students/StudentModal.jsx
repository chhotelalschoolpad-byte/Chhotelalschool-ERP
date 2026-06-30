"use client"
import { useState, useEffect } from "react";
import { X, Save, AlertCircle } from "lucide-react";
import CustomSelect from "@/components/ui/CustomSelect";

export default function StudentModal({ isOpen, onClose, onSave, student }) {
  const [formData, setFormData] = useState({
    fullName: "",
    className: "",
    contactNumber: "",
    academicYear: "2024-25",
    feesStatus: "PENDING",
    pendingAmount: 0,
    tcTaken: false,
    resultCollected: false,
    booksPaid: false,
    uniformPaid: false,
    notes: "",
    fatherName: "",
    motherName: "",
    address: ""
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (student) {
      setFormData({
        ...student,
        fatherName: student.fatherName || "",
        motherName: student.motherName || "",
        address: student.address || ""
      });
    } else {
      setFormData({
        fullName: "",
        className: "",
        contactNumber: "",
        academicYear: "2024-25",
        feesStatus: "PENDING",
        pendingAmount: 0,
        tcTaken: false,
        resultCollected: false,
        booksPaid: false,
        uniformPaid: false,
        notes: "",
        fatherName: "",
        motherName: "",
        address: ""
      });
    }
    setErrors({});
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!formData.fullName) newErrors.fullName = "Name is required";
    if (!formData.className) newErrors.className = "Class is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onSave(formData);
  };

  const academicYears = (() => {
    const years = [];
    const currentYear = new Date().getFullYear();
    // Generate from current year down to 20 years ago
    for (let i = 0; i <= 20; i++) {
        const year = currentYear - i;
        years.push(`${year}-${String(year + 1).slice(2)}`);
    }
    return years;
  })();

  const capitalize = (str) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">{student ? 'Edit Record' : 'Add Passout Student'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Student Name</label>
              <input
                type="text"
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.fullName ? 'border-rose-300' : 'border-gray-200'}`}
                placeholder="Full Name"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: capitalize(e.target.value) })}
              />
              {errors.fullName && <p className="text-xs text-rose-500 mt-1">{errors.fullName}</p>}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Class</label>
              <input
                type="text"
                className={`w-full px-4 py-2.5 bg-gray-50 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all ${errors.className ? 'border-rose-300' : 'border-gray-200'}`}
                placeholder="e.g. Class 10"
                value={formData.className}
                onChange={(e) => setFormData({ ...formData, className: e.target.value })}
              />
              {errors.className && <p className="text-xs text-rose-500 mt-1">{errors.className}</p>}
            </div>

            <CustomSelect
              label="Academic Year"
              value={formData.academicYear}
              onChange={(val) => setFormData({ ...formData, academicYear: val })}
              options={academicYears.map(y => ({ v: y, l: y }))}
            />

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Contact Number</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Optional"
                value={formData.contactNumber || ''}
                onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Father's Name (Optional)</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Father's Name"
                value={formData.fatherName || ''}
                onChange={(e) => setFormData({ ...formData, fatherName: capitalize(e.target.value) })}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Mother's Name (Optional)</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Mother's Name"
                value={formData.motherName || ''}
                onChange={(e) => setFormData({ ...formData, motherName: capitalize(e.target.value) })}
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Address (Optional)</label>
              <input
                type="text"
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                placeholder="Student's Address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </div>

          <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CustomSelect
                label="Fees Status"
                value={formData.feesStatus}
                onChange={(val) => {
                  setFormData({ 
                    ...formData, 
                    feesStatus: val,
                    pendingAmount: val === 'PAID' ? 0 : formData.pendingAmount 
                  });
                }}
                options={[
                  { v: 'PAID', l: 'Paid' },
                  { v: 'PENDING', l: 'Pending' },
                  { v: 'PARTIAL', l: 'Partial' }
                ]}
              />

              {formData.feesStatus !== 'PAID' && (
                <div className="space-y-1 animate-in slide-in-from-top-1 duration-200">
                  <label className="text-xs font-black uppercase text-gray-400 tracking-widest">Pending Amount</label>
                  <input
                    type="number"
                    className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                    value={formData.pendingAmount}
                    onChange={(e) => setFormData({ ...formData, pendingAmount: parseInt(e.target.value) || 0 })}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { id: 'tcTaken', label: 'TC Taken' },
                { id: 'resultCollected', label: 'Result Coll.' },
                { id: 'booksPaid', label: 'Books Paid' },
                { id: 'uniformPaid', label: 'Uniform Paid' },
              ].map(item => (
                <label key={item.id} className="flex flex-col gap-2 p-3 bg-white rounded-xl border border-gray-100 cursor-pointer hover:bg-blue-50 transition-colors">
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-tight">{item.label}</span>
                  <input
                    type="checkbox"
                    checked={formData[item.id]}
                    onChange={(e) => setFormData({ ...formData, [item.id]: e.target.checked })}
                    className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
            >
              <Save size={18} />
              {student ? 'Update Record' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
