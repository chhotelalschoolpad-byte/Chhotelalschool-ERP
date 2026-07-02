"use client"

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DuesManagerModal({ isOpen, onClose, studentId, initialDues = [], onSaved }) {
  const [dues, setDues] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDues(initialDues.map(d => ({ ...d })));
    }
  }, [isOpen, initialDues]);

  if (!isOpen) return null;

  const handleAddDue = () => {
    const nextTempId = `new_${Date.now()}`;
    const today = new Date();
    const currentSession = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    setDues([
      ...dues,
      {
        id: nextTempId,
        dueType: 'LEGACY',
        sessionYear: String(currentSession),
        amount: 0,
        paidAmount: 0,
        notes: ''
      }
    ]);
  };

  const handleFieldChange = (id, field, value) => {
    setDues(dues.map(d => d.id === id ? { ...d, [field]: value } : d));
  };

  const handleRemoveDue = (id) => {
    setDues(dues.filter(d => d.id !== id));
  };

  const handleSave = async () => {
    for (const d of dues) {
      if (d.amount < 0 || d.paidAmount < 0) {
        toast.error("Amounts cannot be negative");
        return;
      }
      if (d.paidAmount > d.amount) {
        toast.error("Paid amount cannot exceed total due amount");
        return;
      }
      if (d.dueType === 'LEGACY' && !/^\d{4}$/.test(d.sessionYear)) {
        toast.error("Session year must be a 4-digit number (e.g. 2024)");
        return;
      }
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/students/${studentId}/dues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dues)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save dues');

      toast.success("Dues updated successfully!");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-55 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 text-gray-900">
        
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Manage Outstanding Dues</h2>
            <p className="text-xs text-gray-500 mt-1">Set session-wise carry forward dues and miscellaneous outstanding amounts</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-8 overflow-y-auto space-y-4">
          {dues.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <p className="text-gray-500 font-bold text-sm">No dues configured for this student.</p>
              <p className="text-xs text-gray-400 mt-1 mb-4">You can add carry-forward dues or miscellaneous charges below.</p>
              <button 
                onClick={handleAddDue}
                className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-blue-100"
              >
                <Plus size={14} className="mr-1.5" /> Add First Due
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-3 text-[10px] font-black uppercase text-gray-400 tracking-wider px-2">
                <div className="col-span-3">Due Type</div>
                <div className="col-span-2">Session / Year</div>
                <div className="col-span-2">Total Amount (₹)</div>
                <div className="col-span-2">Paid Amount (₹)</div>
                <div className="col-span-2">Description / Notes</div>
                <div className="col-span-1 text-center">Action</div>
              </div>

              <div className="space-y-3">
                {dues.map((due) => (
                  <div key={due.id} className="grid grid-cols-12 gap-3 items-center bg-gray-50 border border-gray-100 p-2.5 rounded-xl">
                    {/* Due Type */}
                    <div className="col-span-3">
                      <select
                        value={due.dueType}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFieldChange(due.id, 'dueType', val);
                          if (val === 'MISC') {
                            handleFieldChange(due.id, 'sessionYear', 'misc');
                          } else {
                            const today = new Date();
                            const currentSession = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
                            handleFieldChange(due.id, 'sessionYear', String(currentSession));
                          }
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-700 cursor-pointer"
                      >
                        <option value="LEGACY">Session Legacy Due</option>
                        <option value="MISC">Miscellaneous Due</option>
                      </select>
                    </div>

                    {/* Session / Year */}
                    <div className="col-span-2">
                      {due.dueType === 'LEGACY' ? (
                        <input
                          type="text"
                          value={due.sessionYear}
                          onChange={(e) => handleFieldChange(due.id, 'sessionYear', e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-bold text-gray-800"
                          placeholder="e.g. 2024"
                        />
                      ) : (
                        <input
                          type="text"
                          value="Misc Dues"
                          disabled
                          className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-xs text-gray-400 font-bold"
                        />
                      )}
                    </div>

                    {/* Total Amount */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={due.amount === 0 ? "" : due.amount}
                        onChange={(e) => handleFieldChange(due.id, 'amount', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-black text-rose-600"
                        placeholder="0"
                      />
                    </div>

                    {/* Paid Amount */}
                    <div className="col-span-2">
                      <input
                        type="number"
                        value={due.paidAmount === 0 ? "" : due.paidAmount}
                        onChange={(e) => handleFieldChange(due.id, 'paidAmount', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 font-black text-emerald-600"
                        placeholder="0"
                      />
                    </div>

                    {/* Notes */}
                    <div className="col-span-2">
                      <input
                        type="text"
                        value={due.notes || ''}
                        onChange={(e) => handleFieldChange(due.id, 'notes', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-gray-600"
                        placeholder="e.g. Uniform / Book fee"
                      />
                    </div>

                    {/* Action */}
                    <div className="col-span-1 flex justify-center">
                      <button
                        onClick={() => handleRemoveDue(due.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-55 rounded-lg transition-colors"
                        title="Delete Due Item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-start">
                <button
                  onClick={handleAddDue}
                  className="inline-flex items-center text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  <Plus size={14} className="mr-1" /> Add New Due Item
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-gray-100 bg-gray-50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl text-sm font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-blue-100"
          >
            <Save size={16} className="mr-2" /> Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
