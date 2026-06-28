"use client"

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createStudentSchema, updateStudentSchema } from '@/validations/studentSchemas';
import { useSystemSettings } from '@/hooks/useSettings';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { UserPlus, Clock, Info, AlertTriangle, Calendar, Fingerprint, MapPin, User, Users, CheckCircle2 } from 'lucide-react';
import DatePicker from '@/components/ui/DatePicker';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli",
  "Daman and Diu", "Delhi", "Lakshadweep", "Puducherry"
];

const currentYear = new Date().getFullYear();
const today = new Date().toISOString().slice(0, 10);

const inputClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm transition-all placeholder:text-gray-400";
const selectClass = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none text-sm bg-white transition-all appearance-none cursor-pointer";

const Section = ({ title, children }) => (
  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
    <h2 className="text-lg font-bold text-gray-900 mb-6 pb-3 border-b border-gray-100 flex items-center gap-2">
      <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
      {title}
    </h2>
    {children}
  </div>
);

const Field = ({ label, error, children, hint }) => (
  <div className="space-y-1.5">
    <label className="block text-sm font-semibold text-gray-700">{label}</label>
    {children}
    {hint && !error && <p className="text-[11px] text-gray-400 font-medium">{hint}</p>}
    {error && <p className="text-[11px] text-red-500 font-bold">{error}</p>}
  </div>
);

const DateInput = ({ control, name, placeholder, ...props }) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <DatePicker
        value={field.value}
        onChange={field.onChange}
        placeholder={placeholder}
        {...props}
      />
    )}
  />
);

export default function AdmissionForm({ initialData = null }) {
  const router = useRouter();
  const { settings } = useSystemSettings();
  const classes = settings?.defaultClasses || [];
  const [loading, setLoading] = useState(false);
  const [isExisting, setIsExisting] = useState(initialData?.isExisting || false);
  const [bannerError, setBannerError] = useState('');
  const admissionNumberRef = useRef(null);

  const isEditMode = !!initialData;

  const form = useForm({
    resolver: zodResolver(isEditMode ? updateStudentSchema : createStudentSchema),
    defaultValues: initialData || {
      isExisting: false,
      country: 'India',
      state: 'Uttar Pradesh',
      previousDue: 0,
      gender: 'Male',
      admissionDate: today,
    },
  });

  const { register, handleSubmit, formState: { errors }, watch, setValue, setError, reset, control } = form;

  const watchAdmissionDate = watch('admissionDate');

  const toCamelCase = (val) => {
    if (!val) return '';
    return val
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  useEffect(() => {
    if (isExisting && watchAdmissionDate && !isEditMode) {
      const year = new Date(watchAdmissionDate).getFullYear();
      if (!isNaN(year)) {
        setValue('joiningYear', year);
      }
    }
  }, [watchAdmissionDate, isExisting, setValue, isEditMode]);

  const switchTab = (value) => {
    if (isEditMode) return; // Disable tab switching in edit mode
    reset({
      isExisting: value,
      country: 'India',
      state: 'Uttar Pradesh',
      previousDue: 0,
      gender: 'Male',
      admissionDate: value ? '' : today,
    });
    setIsExisting(value);
    setBannerError('');
  };

  const onSubmit = async (data) => {
    setBannerError('');

    // Auto camel case logic
    data.fullName = toCamelCase(data.fullName);
    data.fatherName = toCamelCase(data.fatherName);
    if (data.motherName) data.motherName = toCamelCase(data.motherName);

    data.isExisting = isExisting;

    try {
      setLoading(true);
      const url = isEditMode ? `/api/students/${initialData.id}` : '/api/students';
      const method = isEditMode ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (res.status === 400) {
        const issues = result.issues || {};
        if (Array.isArray(result.error)) {
           result.error.forEach(err => {
              setError(err.path[0], { message: err.message });
           });
        } else {
           Object.entries(issues).forEach(([field, messages]) => {
             setError(field, { message: Array.isArray(messages) ? messages[0] : messages });
           });
        }
        setBannerError('Validation Errors Observed.');
        setLoading(false);
        return;
      }

      if (res.status === 409) {
        setError('admissionNumber', { message: result.error });
        admissionNumberRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setBannerError(result.error || 'System rejection.');
        setLoading(false);
        return;
      }

      const student = result.data;
      toast.success(isEditMode ? 'Information Updated!' : (isExisting ? 'Record Updated!' : `Success! ADM No: ${student.admissionNumber}`));
      setTimeout(() => router.push(`/students/${student.id}`), 1000);

    } catch (err) {
      setBannerError('Sync Error.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">
            {isEditMode ? 'Update Student Information' : 'Student Admission'}
          </h1>
          <p className="text-gray-500 font-medium">
            {isEditMode ? `Modifying records for ${initialData.fullName}` : 'Quickly register new or existing school records'}
          </p>
        </div>

        {!isEditMode && (
          <div className="inline-flex p-1 bg-gray-100/80 backdrop-blur rounded-2xl border border-gray-200">
            <button
              type="button"
              onClick={() => switchTab(false)}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${!isExisting ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <UserPlus size={16} /> New Admission
            </button>
            <button
              type="button"
              onClick={() => switchTab(true)}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-bold rounded-xl transition-all ${isExisting ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Clock size={16} /> Existing Data
            </button>
          </div>
        )}
      </div>

      {!isEditMode && (
        <div className={`p-4 rounded-2xl border flex items-center gap-4 animate-in fade-in slide-in-from-top-2 ${isExisting ? 'bg-blue-50 border-blue-100 text-blue-800' : 'bg-amber-50 border-amber-100 text-amber-800'
          }`}>
          <div className={`p-2 rounded-xl ${isExisting ? 'bg-blue-100' : 'bg-amber-100'}`}>
            <Info size={18} />
          </div>
          <p className="text-sm font-semibold">
            {isExisting
              ? "Enter original admission details and outstanding dues."
              : `Roll numbers are auto-generated. Next: ADM-${currentYear}-####`
            }
          </p>
        </div>
      )}

      {bannerError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 text-red-700 rounded-2xl px-5 py-4 text-sm font-bold animate-in zoom-in-95">
          <AlertTriangle size={18} className="shrink-0" />
          {bannerError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {isExisting && !isEditMode && (
          <Section title="Legacy Academic Records">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <Field
                  label="Original Admission Number *"
                  error={errors.admissionNumber?.message}
                  hint="Required format: ADM-2020-0150"
                >
                  <input
                    ref={admissionNumberRef}
                    type="text"
                    {...register('admissionNumber')}
                    placeholder="ADM-YYYY-XXXX"
                    className={`${inputClass} font-mono font-bold uppercase tracking-widest`}
                    onChange={(e) => setValue('admissionNumber', e.target.value.toUpperCase().trim())}
                  />
                </Field>
              </div>

              <Field label="Original Date of Joining *" error={errors.admissionDate?.message}>
                <DateInput 
                  control={control} 
                  name="admissionDate" 
                  maxDate={today} 
                  placeholder="Choosing Session Date..."
                />
              </Field>

              <Field label="Joining Session Year" error={errors.joiningYear?.message} hint="Auto-filled from joining date">
                <input
                  type="text"
                  {...register('joiningYear')}
                  placeholder={currentYear}
                  className={`${inputClass} bg-gray-100`}
                  readOnly
                />
              </Field>

              <div className="md:col-span-2">
                <Field
                  label="Outstanding Previous Dues (₹)"
                  error={errors.previousDue?.message}
                >
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                    <input
                      type="text"
                      {...register('previousDue')}
                      className={`${inputClass} pl-8 font-black text-blue-700`}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setValue('previousDue', val ? parseInt(val) : 0);
                      }}
                    />
                  </div>
                </Field>
              </div>
            </div>
          </Section>
        )}

        <Section title="Student Credentials">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Field label="Student Full Name *" error={errors.fullName?.message}>
                <input
                  type="text"
                  {...register('fullName')}
                  className={inputClass}
                  placeholder="Rahul Verma"
                  onBlur={(e) => setValue('fullName', toCamelCase(e.target.value))}
                />
              </Field>
            </div>

            <Field label="Gender *" error={errors.gender?.message}>
              <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1 rounded-xl border border-gray-200">
                {['Male', 'Female', 'Other'].map(g => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setValue('gender', g)}
                    className={`py-1.5 text-xs font-bold rounded-lg transition-all ${watch('gender') === g ? 'bg-white shadow-sm text-blue-600 ring-1 ring-black/5' : 'text-gray-500'
                      }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Date of Birth" error={errors.dateOfBirth?.message}>
              <DateInput 
                control={control} 
                name="dateOfBirth" 
                maxDate={today} 
                placeholder="Birth Registry Date..."
              />
            </Field>

            <Field label="Student Aadhaar Number" error={errors.aadhaarNumber?.message}>
              <div className="relative">
                <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                <input
                  type="text"
                  maxLength="12"
                  {...register('aadhaarNumber')}
                  className={`${inputClass} pl-10 tracking-[0.2em] font-mono font-bold`}
                  placeholder="0000 0000 0000"
                  onChange={(e) => setValue('aadhaarNumber', e.target.value.replace(/[^0-9]/g, ''))}
                />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Religion">
                <select {...register('religion')} className={selectClass}>
                  <option value="">Select</option>
                  <option value="Hindu">Hindu</option>
                  <option value="Muslim">Muslim</option>
                  <option value="Christian">Christian</option>
                  <option value="Sikh">Sikh</option>
                  <option value="Other">Other</option>
                </select>
              </Field>
              <Field label="Caste">
                <select {...register('caste')} className={selectClass}>
                  <option value="">Select</option>
                  <option value="General">General</option>
                  <option value="OBC">OBC</option>
                  <option value="SC">SC</option>
                  <option value="ST">ST</option>
                </select>
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Family & Contact">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Father's Full Name *" error={errors.fatherName?.message}>
              <input
                type="text"
                {...register('fatherName')}
                className={inputClass}
                onBlur={(e) => setValue('fatherName', toCamelCase(e.target.value))}
              />
            </Field>

            <Field label="Mother's Full Name" error={errors.motherName?.message}>
              <input
                type="text"
                {...register('motherName')}
                className={inputClass}
                onBlur={(e) => setValue('motherName', toCamelCase(e.target.value))}
              />
            </Field>

            <Field label="Primary Contact" error={errors.mobile1?.message}>
              <div className="flex">
                <span className="inline-flex items-center px-4 bg-gray-100 border border-r-0 border-gray-200 text-gray-400 font-bold text-xs rounded-l-xl">+91</span>
                <input type="text" maxLength="10" {...register('mobile1')} className={`${inputClass} rounded-l-none font-bold`} placeholder="Optional" />
              </div>
            </Field>

            <Field label="Secondary Contact" error={errors.mobile2?.message}>
              <div className="flex">
                <span className="inline-flex items-center px-4 bg-gray-100 border border-r-0 border-gray-200 text-gray-400 font-bold text-xs rounded-l-xl">+91</span>
                <input type="text" maxLength="10" {...register('mobile2')} className={`${inputClass} rounded-l-none font-bold`} placeholder="Optional" />
              </div>
            </Field>

            <div className="md:col-span-2">
              <Field label="Parent Aadhaar Number" error={errors.parentAadhaarNumber?.message}>
                <div className="relative">
                  <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
                  <input
                    type="text"
                    maxLength="12"
                    {...register('parentAadhaarNumber')}
                    className={`${inputClass} pl-10 tracking-[0.2em] font-mono font-bold`}
                    placeholder="0000 0000 0000"
                    onChange={(e) => setValue('parentAadhaarNumber', e.target.value.replace(/[^0-9]/g, ''))}
                  />
                </div>
              </Field>
            </div>
          </div>
        </Section>

        <Section title="Academic Placement">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {isEditMode && (
              <div className="md:col-span-2">
                <Field
                  label="Admission Number *"
                  error={errors.admissionNumber?.message}
                  hint="Required format: ADM-2020-0150"
                >
                  <input
                    ref={admissionNumberRef}
                    type="text"
                    {...register('admissionNumber')}
                    placeholder="ADM-YYYY-XXXX"
                    className={`${inputClass} font-mono font-bold uppercase tracking-widest`}
                    onChange={(e) => setValue('admissionNumber', e.target.value.toUpperCase().trim())}
                  />
                </Field>
              </div>
            )}

            {isEditMode && isExisting && (
              <div className="md:col-span-2">
                <Field
                  label="Outstanding Previous Dues (₹)"
                  error={errors.previousDue?.message}
                >
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400">₹</span>
                    <input
                      type="text"
                      {...register('previousDue')}
                      className={`${inputClass} pl-8 font-black text-blue-700`}
                      placeholder="0"
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setValue('previousDue', val ? parseInt(val) : 0);
                      }}
                    />
                  </div>
                </Field>
              </div>
            )}

            <Field label="Enrollment Class *" error={errors.className?.message}>
              <select {...register('className')} className={selectClass}>
                <option value="">Choose Class</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            {!isExisting && !isEditMode && (
              <Field label="Date of Admission">
                <DateInput 
                  control={control} 
                  name="admissionDate" 
                  placeholder="Record Entry Date..."
                />
              </Field>
            )}

            <div className="md:col-span-2">
              <Field label="Address">
                <textarea {...register('address')} rows="2" className={`${inputClass} resize-none`} placeholder="Full address" />
              </Field>
            </div>

            <Field label="State">
              <select {...register('state')} className={selectClass}>
                <option value="">Choose State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>

            <Field label="Previous School">
              <input type="text" {...register('previousSchool')} className={inputClass} placeholder="Last attended school" />
            </Field>
          </div>
        </Section>

        <div className="pt-8">
          <button
            type="submit"
            disabled={loading}
            className="w-full h-16 bg-blue-600 text-white font-black text-lg rounded-2xl hover:bg-blue-700 active:scale-[0.98] transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              isEditMode ? <CheckCircle2 size={20} /> : (isExisting ? <Clock size={20} /> : <CheckCircle2 size={20} />)
            )}
            {isEditMode ? 'Save Changes' : (isExisting ? 'Update Student Record' : 'Submit Admission')}
          </button>
        </div>
      </form>
    </div>
  );
}
