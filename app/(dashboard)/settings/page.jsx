"use client"

import { useSystemSettings, useSchoolSettings } from '@/hooks/useSettings';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { schoolSettingsSchema, systemSettingsSchema, systemFormSchema } from '@/validations/settingsSchemas';
import { changePasswordSchema } from '@/validations/authSchemas';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { School, Settings as SettingsIcon, AlertTriangle, KeyRound, Building2, Save, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('school');
  const { settings: schSettings, mutate: mutSch } = useSchoolSettings();
  const { settings: sysSettings, mutate: mutSys } = useSystemSettings();
  const [loading, setLoading] = useState(false);

  // Forms
  const { register: regSch, handleSubmit: handleSch, reset: resetSch, formState: { errors: erSch } } = useForm({
    resolver: zodResolver(schoolSettingsSchema)
  });

  const { register: regSys, control: ctlSys, handleSubmit: handleSys, reset: resetSys, formState: { errors: erSys } } = useForm({
    resolver: zodResolver(systemFormSchema)
  });

  const [confirmSysOpen, setConfirmSysOpen] = useState(false);
  const [pendingSysData, setPendingSysData] = useState(null);

  const { register: regPass, handleSubmit: handlePass, reset: resetPass, formState: { errors: erPass } } = useForm({
    resolver: zodResolver(changePasswordSchema)
  });

  const { fields: clsFields, append: clsAdd, remove: clsRem } = useFieldArray({ control: ctlSys, name: "defaultClasses" });

  useEffect(() => { if (schSettings) resetSch(schSettings); }, [schSettings, resetSch]);

  useEffect(() => {
    if (sysSettings) {
      const classes = (sysSettings.defaultClasses || []).map(val => ({ value: val }));
      resetSys({ defaultClasses: classes.length > 0 ? classes : [{ value: '' }] });
    }
  }, [sysSettings, resetSys]);

  const onSchSubmit = async (data) => {
    try {
      setLoading(true);
      const res = await fetch('/api/settings/school', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update');
      toast.success('School settings updated successfully');
      mutSch();
    } catch (err) { toast.error(err.message); } finally { setLoading(false); }
  };

  const onSysSubmit = async (data) => {
    try {
      setLoading(true);
      // Ensure only the expected fields are sent, and map classes back to strings
      const payload = {
        defaultClasses: data.defaultClasses.map(i => i.value).filter(v => v.trim() !== ""),
        feeTypes: sysSettings?.feeTypes || ['Monthly', 'Admission', 'Exam', 'Transport']
      };

      const res = await fetch('/api/settings/system', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error || 'Validation Error: Check your classes');

      toast.success('System configuration updated');
      setConfirmSysOpen(false);
      mutSys();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const onSysError = (errors) => {
    const firstErr = Object.values(errors.defaultClasses || {})[0]?.value?.message;
    if (firstErr) toast.error(`Grid Error: ${firstErr}`);
    else toast.error("Please ensure all classes have a valid name");
  };

  const onPassSubmit = async (data) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
          confirmPassword: data.confirmPassword
        })
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Password update failed');

      toast.success('Password changed successfully');
      resetPass();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm transition-all";
  const labelClass = "block text-xs font-black text-gray-500 uppercase tracking-widest mb-1.5 ml-1";

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">System Settings</h1>
          <p className="text-gray-500 font-medium mt-1">Control your identity and application logic</p>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/50 p-2">
          {[
            { id: 'school', title: 'Identity', icon: <Building2 size={18} /> },
            { id: 'system', title: 'Config', icon: <SettingsIcon size={18} /> },
            { id: 'security', title: 'Security', icon: <KeyRound size={18} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-8 py-4 font-bold text-sm rounded-2xl transition-all ${activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm ring-1 ring-black/5'
                : 'text-gray-400 hover:text-gray-700'
                }`}
            >
              {tab.icon} {tab.title}
            </button>
          ))}
        </div>

        <div className="p-8 sm:p-12">

          {/* Identity Tab */}
          {activeTab === 'school' && (
            <form onSubmit={handleSch(onSchSubmit)} className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                <div className="md:col-span-2">
                  <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl p-4 text-blue-800 text-sm font-bold mb-6">
                    <Building2 size={24} className="text-blue-600" />
                    <p>This information appears on all generated fee receipts and official documents.</p>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>School Formal Name *</label>
                  <input type="text" {...regSch('schoolName')} className={inputClass} placeholder="St. Mary's Public School" />
                  {erSch.schoolName && <p className="text-red-500 text-[10px] font-black mt-2">{erSch.schoolName.message}</p>}
                </div>

                <div className="md:col-span-2">
                  <label className={labelClass}>Full Operational Address</label>
                  <textarea {...regSch('address')} rows="2" className={`${inputClass} resize-none`} placeholder="Lane 42, Green Valley..." />
                  {erSch.address && <p className="text-red-500 text-[10px] font-black mt-2">{erSch.address.message}</p>}
                </div>

                <div>
                  <label className={labelClass}>Primary Helpdesk Number</label>
                  <input type="text" {...regSch('contactNumber')} className={inputClass} placeholder="10-digit mobile" />
                  {erSch.contactNumber && <p className="text-red-500 text-[10px] font-black mt-2">{erSch.contactNumber.message}</p>}
                </div>

                <div>
                  <label className={labelClass}>Principal / Owner Name</label>
                  <input type="text" {...regSch('ownerName')} className={inputClass} placeholder="Full Name" />
                  {erSch.ownerName && <p className="text-red-500 text-[10px] font-black mt-2">{erSch.ownerName.message}</p>}
                </div>

                <div className="md:col-span-2 h-px bg-gray-100" />

                <div className="md:col-span-2">
                  <h3 className="text-sm font-black text-gray-900 border-l-4 border-blue-600 pl-3 mb-6 uppercase tracking-widest">Financial Endpoints</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className={labelClass}>UPI Merchant ID</label>
                      <input type="text" {...regSch('upiId')} className={`${inputClass} font-mono`} placeholder="merchant@upi" />
                      {erSch.upiId && <p className="text-red-500 text-[10px] font-black mt-2">{erSch.upiId.message}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>IFSC Protocol Code</label>
                      <input type="text" {...regSch('ifscCode')} maxLength={11} className={`${inputClass} font-mono uppercase`} placeholder="SBIN0001234" />
                      {erSch.ifscCode && <p className="text-red-500 text-[10px] font-black mt-2">{erSch.ifscCode.message}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Account Ledger Number</label>
                      <input type="text" {...regSch('accountNumber')} className={`${inputClass} font-mono`} placeholder="########" />
                      {erSch.accountNumber && <p className="text-red-500 text-[10px] font-black mt-2">{erSch.accountNumber.message}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Account Holder Name</label>
                      <input type="text" {...regSch('accountHolder')} className={inputClass} placeholder="Name as in Bank..." />
                      {erSch.accountHolder && <p className="text-red-500 text-[10px] font-black mt-2">{erSch.accountHolder.message}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Bank Name</label>
                      <input type="text" {...regSch('bankName')} className={inputClass} placeholder="SBI, HDFC..." />
                      {erSch.bankName && <p className="text-red-500 text-[10px] font-black mt-2">{erSch.bankName.message}</p>}
                    </div>
                    <div>
                      <label className={labelClass}>Branch Name</label>
                      <input type="text" {...regSch('branch')} className={inputClass} placeholder="Main Market, Civil Lines..." />
                      {erSch.branch && <p className="text-red-500 text-[10px] font-black mt-2">{erSch.branch.message}</p>}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-50">
                <button
                  disabled={loading}
                  type="submit"
                  className="flex items-center gap-2 bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition active:scale-95 text-sm uppercase tracking-widest"
                >
                  <Save size={18} /> Update School Profile
                </button>
              </div>
            </form>
          )}

          {/* Config Tab (Class List) */}
          {activeTab === 'system' && (
            <form onSubmit={handleSys((data) => { setPendingSysData(data); setConfirmSysOpen(true); }, onSysError)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div>
                <h3 className="text-xl font-black text-gray-900 flex items-center gap-3 mb-4">
                  <div className="w-2 h-8 bg-blue-600 rounded-full" />
                  Active Grade Level Configuration
                </h3>
                <p className="text-sm text-gray-500 font-medium mb-10 max-w-xl">
                  Define the academic classes currently active in your school. These names will populate the
                  <strong> Admission Forms</strong> and <strong>Fee Setup</strong> tools across the platform.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                  {clsFields.map((item, index) => (
                    <div key={item.id} className="relative group animate-in zoom-in-95 duration-300">
                      <input
                        type="text"
                        {...regSys(`defaultClasses.${index}.value`)}
                        className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-sm font-black text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-600 outline-none transition-all shadow-sm group-hover:shadow-md"
                        placeholder="Class..."
                      />
                      <button
                        type="button"
                        onClick={() => clsRem(index)}
                        className="absolute -top-2 -right-2 h-8 w-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all shadow-lg scale-75 group-hover:scale-100"
                      >
                        &times;
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => clsAdd({ value: '' })}
                    className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-600 rounded-2xl py-3 group transition-all"
                  >
                    <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest">New Class</span>
                  </button>
                </div>
              </div>

              <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
                <button
                  disabled={loading}
                  type="submit"
                  className="flex items-center gap-2 bg-blue-600 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-100 hover:bg-blue-700 transition active:scale-95 text-sm uppercase tracking-widest"
                >
                  <Save size={18} /> Push Config Change
                </button>
                <div className="hidden md:flex items-center gap-3 text-emerald-600 bg-emerald-50 px-5 py-3 rounded-2xl">
                  <CheckCircle2 size={20} />
                  <p className="text-xs font-bold uppercase tracking-widest">Live Updates Enabled</p>
                </div>
              </div>
            </form>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
              <h3 className="text-xl font-black text-gray-900 flex items-center gap-3 mb-6">
                <div className="w-2 h-8 bg-red-600 rounded-full" />
                Account Security
              </h3>
              <form onSubmit={handlePass(onPassSubmit)} className="space-y-6">
                <div>
                  <label className={labelClass}>Current Password *</label>
                  <div className="relative group">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-red-500 transition-colors" size={18} />
                    <input
                      type="password"
                      {...regPass('currentPassword')}
                      className={`${inputClass} pl-12`}
                      placeholder="••••••••"
                    />
                  </div>
                  {erPass.currentPassword && <p className="text-red-500 text-[10px] font-black mt-2">{erPass.currentPassword.message}</p>}
                </div>

                <div className="h-px bg-gray-100 my-8" />

                <div>
                  <label className={labelClass}>New Password *</label>
                  <input
                    type="password"
                    {...regPass('newPassword')}
                    className={inputClass}
                    placeholder="Minimum 6 characters"
                  />
                  {erPass.newPassword && <p className="text-red-500 text-[10px] font-black mt-2">{erPass.newPassword.message}</p>}
                </div>

                <div>
                  <label className={labelClass}>Confirm Password *</label>
                  <input
                    type="password"
                    {...regPass('confirmPassword')}
                    className={inputClass}
                    placeholder="Repeat new password"
                  />
                  {erPass.confirmPassword && <p className="text-red-500 text-[10px] font-black mt-2">{erPass.confirmPassword.message}</p>}
                </div>

                <button
                  disabled={loading}
                  type="submit"
                  className="w-full h-16 bg-red-600 text-white rounded-2xl font-black shadow-xl shadow-red-100 hover:bg-red-700 transition active:scale-95 text-sm uppercase tracking-widest mt-8"
                >
                  {loading ? 'Validating Authenticity...' : 'Update Password'}
                </button>
                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  Authorized Administrator Action Only
                </p>
              </form>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmSysOpen}
        onClose={() => setConfirmSysOpen(false)}
        onConfirm={() => onSysSubmit(pendingSysData)}
        title="Push System Changes?"
        message="This will update the classes used in Admission and Fee Setup. Removing a class will not delete its students but will prevent future records from being assigned to it. Proceed?"
        confirmText="Yes, Update Config"
      />
    </div>
  );
}
