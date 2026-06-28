"use client"

import { useFeeStructures, useSystemSettings } from '@/hooks/useSettings';
import { useState, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFeeSchema, updateFeeSchema } from '@/validations/feeSchemas';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Edit2, Plus, IndianRupee, Trash2, Truck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FeeSetupPage() {
  const { fees: rawFees, isLoading, mutate } = useFeeStructures();
  const { settings } = useSystemSettings();

  const fees = useMemo(() => {
    return [...(rawFees || [])].sort((a, b) => 
      a.className.localeCompare(b.className, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [rawFees]);

  const availableClasses = useMemo(() => {
    return [...(settings?.defaultClasses || [])].sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [settings?.defaultClasses]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const { register, control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(editingIndex !== null ? updateFeeSchema : createFeeSchema),
    defaultValues: {
      className: '',
      monthlyFee: 0,
      admissionFee: 0,
      examFee: 0,
      vanChargeFee: 0,
      extraFees: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "extraFees"
  });

  const handleOpenAdd = () => {
    setEditingIndex(null);
    reset({
      className: '', monthlyFee: 0, admissionFee: 0, examFee: 0, vanChargeFee: 0, extraFees: []
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (index) => {
    setEditingIndex(index);
    const fee = fees[index];
    reset({
      monthlyFee:   fee.monthlyFee,
      admissionFee: fee.admissionFee,
      examFee:      fee.examFee,
      vanChargeFee: fee.vanChargeFee || 0,
      extraFees:    fee.extraFees || []
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const isEdit = editingIndex !== null;
      const url = isEdit ? `/api/fees/${fees[editingIndex].id}` : '/api/fees';
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await res.json();
      if (!res.ok) {
        const errorMsg = Array.isArray(result.error) ? result.error[0].message : (result.error || 'Failed to save');
        throw new Error(errorMsg);
      }

      toast.success(isEdit ? 'Fee structure updated' : 'Fee structure created');
      mutate();
      setModalOpen(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/fees/${deleteConfirmId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      toast.success('Fee structure removed');
      mutate();
      setDeleteConfirmId(null);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const unconfiguredClasses = availableClasses.filter(c => !fees.some(f => f.className === c));

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Class Fee Structures</h1>
          <p className="text-gray-500 font-medium mt-1">Define mandatory and optional fees per grade level</p>
        </div>
        <button 
          onClick={handleOpenAdd} 
          disabled={unconfiguredClasses.length === 0} 
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <Plus size={20} className="mr-2 group-hover:rotate-90 transition-transform" /> 
          Setup New Class
        </button>
      </div>

      {unconfiguredClasses.length === 0 && availableClasses.length > 0 && (
        <div className="bg-emerald-50 text-emerald-800 p-5 rounded-2xl border border-emerald-100 flex items-center gap-4 animate-pulse">
          <div className="bg-emerald-100 p-2 rounded-xl text-emerald-600 font-bold">✨</div>
          <p className="font-bold">Perfect! All classes are fully configured.</p>
        </div>
      )}

      {/* Fee List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="col-span-full py-20 text-center text-gray-400 font-bold">Loading configurations...</div>
        ) : fees.length === 0 ? (
          <div className="col-span-full py-20 bg-gray-50 border-2 border-dashed rounded-3xl text-center text-gray-400 font-medium">
            No class fees found. Click "Setup New Class" to begin.
          </div>
        ) : (
          fees.map((fee, index) => (
            <div key={fee.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all p-6 group relative overflow-hidden">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{fee.className}</h2>
                  <div className="h-1 w-12 bg-blue-600 rounded-full mt-1" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenEdit(index)} 
                    className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
                    title="Edit Structure"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirmId(fee.id)} 
                    className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all"
                    title="Delete Structure"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Monthly</span>
                  <span className="font-black text-gray-900">₹{fee.monthlyFee}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Admission</span>
                  <span className="font-black text-gray-900">₹{fee.admissionFee}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center gap-1">
                    <Truck size={12} /> Van Charge
                  </span>
                  <span className="font-black text-gray-900">₹{fee.vanChargeFee}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-2xl">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Exam Fee</span>
                  <span className="font-black text-gray-900">₹{fee.examFee}</span>
                </div>
              </div>

              {fee.extraFees?.length > 0 && (
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Other Charges</p>
                  <div className="flex flex-wrap gap-2">
                    {fee.extraFees.map(e => (
                      <span key={e.name} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl font-bold border border-blue-100 italic">
                        {e.name}: ₹{e.amount}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingIndex !== null ? `Fee Setup: ${fees[editingIndex]?.className}` : "Configure New Class Fees"}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-2">
          
          {editingIndex === null && (
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Target Class *</label>
              <select {...register('className')} className="w-full px-5 py-3 border-2 border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm bg-white font-bold transition-all appearance-none cursor-pointer">
                <option value="">Select a Grade...</option>
                {unconfiguredClasses.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {errors.className && <p className="text-red-500 text-[11px] font-bold mt-2">{errors.className.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Monthly Fee (₹)</label>
              <div className="relative group">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  {...register('monthlyFee')} 
                  className="w-full pl-10 pr-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-black text-blue-800 transition-all"
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setValue('monthlyFee', val ? parseInt(val) : 0);
                  }}
                />
              </div>
              {errors.monthlyFee && <p className="text-red-500 text-[11px] font-bold mt-2 font-mono uppercase tracking-tight">{errors.monthlyFee.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Admission Fee (₹)</label>
              <div className="relative group">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  {...register('admissionFee')} 
                  className="w-full pl-10 pr-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-black text-blue-800 transition-all"
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setValue('admissionFee', val ? parseInt(val) : 0);
                  }}
                />
              </div>
              {errors.admissionFee && <p className="text-red-500 text-[11px] font-bold mt-2 font-mono uppercase tracking-tight">{errors.admissionFee.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Van Charge Fee (₹)</label>
              <div className="relative group">
                <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  {...register('vanChargeFee')} 
                  className="w-full pl-10 pr-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-black text-blue-800 transition-all"
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setValue('vanChargeFee', val ? parseInt(val) : 0);
                  }}
                />
              </div>
              {errors.vanChargeFee && <p className="text-red-500 text-[11px] font-bold mt-2 font-mono uppercase tracking-tight">{errors.vanChargeFee.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-black text-gray-700 mb-2 uppercase tracking-wide">Exam Fee (₹)</label>
              <div className="relative group">
                <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={18} />
                <input 
                  type="text" 
                  {...register('examFee')} 
                  className="w-full pl-10 pr-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none font-black text-blue-800 transition-all"
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    setValue('examFee', val ? parseInt(val) : 0);
                  }}
                />
              </div>
              {errors.examFee && <p className="text-red-500 text-[11px] font-bold mt-2 font-mono uppercase tracking-tight">{errors.examFee.message}</p>}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <label className="text-sm font-black text-gray-900 uppercase tracking-widest">Other Custom Charges</label>
              <button 
                type="button" 
                onClick={() => append({ name: '', amount: 0 })} 
                className="text-xs bg-blue-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-blue-700 shadow-sm transition-all"
              >
                + Add Optional Fee
              </button>
            </div>

            <div className="space-y-3">
              {fields.map((item, index) => (
                <div key={item.id} className="flex gap-4 items-start animate-in slide-in-from-right-4">
                  <div className="flex-1">
                    <input type="text" {...register(`extraFees.${index}.name`)} placeholder="Fee Name (e.g. Activity)" className="w-full px-4 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm font-medium" />
                  </div>
                  <div className="w-36 relative">
                    <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                    <input 
                      type="text" 
                      {...register(`extraFees.${index}.amount`)} 
                      placeholder="Amount" 
                      className="w-full pl-10 pr-4 py-3 border border-gray-100 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm font-black text-blue-700" 
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setValue(`extraFees.${index}.amount`, val ? parseInt(val) : 0);
                      }}
                    />
                  </div>
                  <button type="button" onClick={() => remove(index)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                    <Trash2 size={24} />
                  </button>
                </div>
              ))}
              {fields.length === 0 && (
                <div className="py-10 text-center border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No extra fees defined for this class</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6">
            <button type="button" onClick={() => setModalOpen(false)} className="px-8 py-3.5 text-gray-500 hover:bg-gray-100 rounded-2xl font-bold transition-all">Cancel</button>
            <button type="submit" className="px-10 py-3.5 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 font-bold shadow-xl shadow-blue-200 active:scale-95 transition-all">
              {editingIndex !== null ? 'Update Structure' : 'Commit Structure'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDelete}
        title="Delete Class Fee Structure?"
        message="This will remove the baseline fees for this class. Existing students' already generated schedules will not be affected, but future generators will miss this data. This action cannot be undone."
        confirmText="Confirm Delete"
        isDanger={true}
      />
    </div>
  );
}
