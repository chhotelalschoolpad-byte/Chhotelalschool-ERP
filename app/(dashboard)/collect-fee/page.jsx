"use client"

import { useSchoolSettings } from '@/hooks/useSettings';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { 
  CreditCard, Banknote, QrCode, Building2, 
  ChevronLeft, AlertCircle, CheckCircle2, Download,
  IndianRupee, Calendar, User, Zap
} from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import ReceiptPDF from '@/components/pdf/ReceiptPDF';
import { useSearchParams } from 'next/navigation';
import { mutate as globalMutate } from "swr";
import { useAuth } from "@/context/AuthContext";

const fmt = (n) => 
  new Intl.NumberFormat('en-IN', { 
    style: 'currency', currency: 'INR', maximumFractionDigits: 0 
  }).format(n || 0);

function formatMonthLabel(ym) {
  if (!ym) return "Onetime";
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

export default function CollectFeePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const studentId = searchParams.get('studentId');
  const { settings } = useSchoolSettings();
  const { user: currentUser } = useAuth();
  const isAdmin   = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const canAdjust = isAdmin || isManager;

  const [payload, setPayload] = useState(null);
  const [student, setStudent] = useState(null);
  const [feeStructure, setFeeStructure] = useState(null);
  
  // Selection state for Fresh Payment (studentId mode)
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(String(new Date().getMonth() + 1).padStart(2, "0"));
  const [selectedTypes, setSelectedTypes] = useState(new Set(["Monthly Fee"]));
  const [prevDueAmount, setPrevDueAmount] = useState(0);
  const [vanAmount, setVanAmount] = useState(0);

  const [paymentMode, setPaymentMode] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('pendingPayment');
    if (raw) {
      setPayload(JSON.parse(raw));
    } else if (studentId) {
      // Fetch student data
      fetch(`/api/students/${studentId}`)
        .then(r => r.json())
        .then(res => {
          if (res.data) setStudent(res.data);
        })
        .catch(() => { });

      // Fetch fee structures
      fetch("/api/fees")
        .then(r => r.json())
        .then(res => {
          setFeeStructure(res.data || []);
        })
        .catch(() => { });
    } else {
      toast.error('Missing student context');
      router.push('/students');
    }
  }, [router, studentId]);

  const activeFeeStructure = feeStructure?.find(f => f.className === student?.className);

  useEffect(() => {
    if (activeFeeStructure) {
      setVanAmount(activeFeeStructure.vanChargeFee || 0);
    }
  }, [activeFeeStructure]);
  
  const types = [
    { label: "Monthly Fee", amount: activeFeeStructure?.monthlyFee || 0 },
    { label: "Van Charge", amount: vanAmount },
    { label: "Admission Fee", amount: activeFeeStructure?.admissionFee || 0 },
    { label: "Exam Fee", amount: activeFeeStructure?.examFee || 0 },
  ];

  if (!payload && !student) return <div className="p-12 text-center text-gray-400 font-bold">Initializing transaction...</div>;

  const remainingPrevDue = student ? Math.max(0, (student.previousDue || 0) - (student.previousDuePaid || 0)) : 0;

  // ── Computing Items & Totals ──────────────────────────────────────────
  let allItems = [];
  let currentStudentId = "";
  let successReturnUrl = "/students";

  if (payload) {
    currentStudentId = payload.studentId;
    successReturnUrl = `/students/${payload.studentId}`;
    allItems = [
      ...(payload.previousDueAmount > 0 
        ? [{ feeType: 'Legacy Carry-Forward Due', month: null, amount: payload.previousDueAmount }] 
        : []),
      ...payload.selectedFees,
    ];
  } else {
    currentStudentId = student.id;
    successReturnUrl = `/students/${student.id}`;
    allItems = [
      ...types.filter(t => selectedTypes.has(t.label)).map(t => ({ feeType: t.label, month: `${year}-${month}`, amount: t.amount })),
      ...(prevDueAmount > 0 ? [{ feeType: 'Legacy Due Payment', month: null, amount: prevDueAmount }] : [])
    ];
  }

  const baseAmount = allItems.reduce((s, i) => s + i.amount, 0);
  const safeDiscount = Math.min(Math.max(0, discount), baseAmount);
  const total = Math.max(0, baseAmount - safeDiscount);

  const handleConfirmPayment = async () => {
    if (total <= 0) {
      toast.error("Total amount must be greater than zero");
      return;
    }
    setLoading(true);
    setError('');
    try {
      let bodyData = {};
      if (payload) {
        bodyData = {
          studentId: payload.studentId,
          month: payload.month || "", // Added default to empty string if missing
          paymentMode,
          discount: Number(safeDiscount),
          selectedItems: payload.selectedFees || [], // Renamed here
          previousDueAmount: Number(payload.previousDueAmount || 0),
        };
      } else {
        bodyData = {
          studentId: student.id,
          month: `${year}-${month}`,
          paymentMode,
          discount: safeDiscount,
          previousDueAmount: Number(prevDueAmount),
          selectedItems: types.filter(t => selectedTypes.has(t.label)).map(t => ({ type: t.label, amount: t.amount }))
        };
      }

      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Payment failed');

      setResult(data);
      sessionStorage.removeItem('pendingPayment');
      toast.success('Payment Recorded Successfully!');

      // Global revalidation to sync Dashboard & Reports
      globalMutate(key => 
        typeof key === 'string' && (
          key.startsWith("/api/students") || 
          key.startsWith("/api/reports")
        )
      );

    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // ── SUCCESS SCREEN ──────────────────────────────────────────────────────
  if (result) {
    const receiptData = {
      ...result.payment, // Spreads current month, paymentItems, previousDueCleared, etc.
      receiptNumber:      result.receiptNumber,
      paymentDate:        new Date(),
      paymentMode,
      discount:           Number(safeDiscount),
      amount:             result.total,
    };

    return (
      <div className="max-w-2xl mx-auto py-12 animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-emerald-100 overflow-hidden text-center">
          <div className="h-2 bg-emerald-500" />
          <div className="p-12">
            <div className="h-24 w-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
               <CheckCircle2 size={48} />
            </div>
            <h1 className="text-4xl font-black text-gray-900 mb-2">Payment Settled</h1>
            <p className="text-gray-500 font-bold mb-8 uppercase tracking-widest text-xs">Receipt No: {result.receiptNumber}</p>
            
            <div className="bg-gray-50 rounded-3xl p-8 mb-8 border border-gray-100">
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Total Amount Received</p>
              <p className="text-5xl font-black text-emerald-700">{fmt(result.total)}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <PDFDownloadLink
                document={
                  <ReceiptPDF
                    payment={receiptData}
                    student={{
                      ...student,
                      fullName: payload?.studentName || student?.fullName,
                      admissionNumber: payload?.admissionNumber || student?.admissionNumber,
                      className: payload?.className || student?.className,
                      fatherName: payload?.fatherName || student?.fatherName,
                      motherName: payload?.motherName || student?.motherName,
                      mobile1: payload?.mobile1 || student?.mobile1,
                    }}
                    settings={settings}
                  />
                }
                fileName={`Receipt_${result.receiptNumber}.pdf`}
              >
                {({ loading }) => (
                  <button className="w-full h-14 bg-blue-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-xl shadow-blue-100">
                    <Download size={20} /> {loading ? 'Preparing...' : 'Get Receipt'}
                  </button>
                )}
              </PDFDownloadLink>
              
              <button onClick={() => router.push(successReturnUrl)} className="w-full h-14 bg-gray-100 text-gray-700 rounded-2xl font-black hover:bg-gray-200 transition-all">
                Return to Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── CONFIGURATION SCREEN ─────────────────────────────────────────────────
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 hover:text-gray-900 font-bold group transition-all">
        <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" /> Back to Student Profile
      </button>

      <div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">
          {student && !payload ? 'Record Student Fee' : 'Voucher Finalization'}
        </h1>
        <p className="text-gray-500 font-medium">
          {student && !payload ? 'Select fees to record and finalize the transaction' : 'Verify payment breakdown and select transaction mode'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* LEFT: SELECTION OR BREAKDOWN */}
        <div className="lg:col-span-3 space-y-6">
          {student && !payload && (
             <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8 space-y-8">
                <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                   <div className="flex items-center gap-4">
                      <div className="h-14 w-14 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-black text-xl">
                        {student.fullName.charAt(0)}
                      </div>
                    <div>
                        <h2 className="text-xl font-black text-gray-900">{student.fullName}</h2>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                             <Zap size={12} /> {student.admissionNumber} • {student.className}
                          </p>
                          {student.isFeeExempt && (
                            <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-lg border border-blue-100 flex items-center gap-1 uppercase">
                               <Zap size={10} className="fill-blue-500" /> Exempt
                            </span>
                          )}
                        </div>
                      </div>
                   </div>
                   <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        {student.isFeeExempt ? 'RECORDING EXTRA' : 'RECORDING FEE'}
                      </p>
                   </div>
                </div>

                {student.isFeeExempt && (
                  <div className="bg-blue-50 border border-blue-100 p-6 rounded-[2.5rem] flex items-start gap-4 mx-4">
                    <div className="h-12 w-12 bg-white rounded-2xl flex items-center justify-center text-blue-600 shadow-sm shrink-0"><Zap size={24} className="fill-blue-500" /></div>
                    <div>
                      <p className="text-sm font-black text-blue-800 uppercase tracking-widest mb-1">Fee Exemption Active</p>
                      <p className="text-xs font-bold text-blue-600 leading-relaxed">
                        This student is exempt from standard monthly fees. Only record a payment if they are paying for optional services like Van, Exams, or specific extras.
                      </p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Target Year</label>
                      <select value={year} onChange={e => setYear(e.target.value)} className="w-full h-12 rounded-xl border-gray-200 bg-gray-50 font-bold px-4">
                        {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                   </div>
                   <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Target Month</label>
                      <select value={month} onChange={e => setMonth(e.target.value)} className="w-full h-12 rounded-xl border-gray-200 bg-gray-50 font-bold px-4">
                         {["01","02","03","04","05","06","07","08","09","10","11","12"].map(m => (
                            <option key={m} value={m}>{new Date(2024, parseInt(m)-1).toLocaleString('en-IN', {month: 'long'})}</option>
                         ))}
                      </select>
                   </div>
                </div>

                <div className="space-y-4">
                   <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Fee Type Selection</p>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {types.map(t => (
                         <label key={t.label} className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                            selectedTypes.has(t.label) ? 'border-blue-600 bg-blue-50' : 'border-gray-50 bg-gray-50/50 hover:bg-gray-100'
                         }`}>
                            <div className="flex items-center gap-3">
                               <input 
                                  type="checkbox" 
                                  checked={selectedTypes.has(t.label)} 
                                  onChange={() => {
                                     const next = new Set(selectedTypes);
                                     if (next.has(t.label)) next.delete(t.label); else next.add(t.label);
                                     setSelectedTypes(next);
                                  }}
                                  className="h-5 w-5 rounded-md border-gray-300 text-blue-600"
                               />
                               <span className="font-bold text-gray-800 text-sm">{t.label}</span>
                            </div>
                            {t.label === "Van Charge" && canAdjust ? (
                               <div className="relative group/van cursor-text">
                                 <input 
                                   type="number"
                                   value={vanAmount === 0 ? '' : vanAmount}
                                   onClick={(e) => e.stopPropagation()}
                                   onChange={(e) => setVanAmount(Number(e.target.value))}
                                   className="w-24 h-10 bg-white border border-gray-200 rounded-xl px-3 text-right font-black text-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                   placeholder="0"
                                 />
                                 <span className="absolute -top-6 right-0 text-[8px] font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover/van:opacity-100 transition-opacity">Adjust Fee</span>
                               </div>
                            ) : (
                               <span className="font-black text-gray-900">{fmt(t.amount)}</span>
                            )}
                         </label>
                      ))}
                   </div>
                </div>

                {remainingPrevDue > 0 && (
                   <div className="pt-6 border-t border-gray-100">
                      <p className="text-[10px] font-black uppercase text-rose-500 tracking-widest pl-1 mb-3 flex items-center gap-2">
                        <AlertCircle size={12} /> Legacy Due Clearance (Max: {fmt(remainingPrevDue)})
                      </p>
                      <div className="relative">
                         <IndianRupee className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-300" size={18} />
                         <input 
                            type="number" 
                            placeholder="Amount to clear..."
                            value={prevDueAmount}
                            onChange={e => setPrevDueAmount(Math.min(remainingPrevDue, Number(e.target.value)))}
                            className="w-full h-14 bg-rose-50/50 border-2 border-rose-100 rounded-2xl pl-12 pr-4 font-black text-rose-700 placeholder:text-rose-200"
                         />
                      </div>
                   </div>
                )}
             </div>
          )}

          <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
             <h2 className="text-xl font-black text-gray-900 mb-6 flex items-center gap-3">
               <AlertCircle size={20} className="text-blue-600" /> Itemized Invoice
             </h2>
             
             <div className="space-y-4">
               {allItems.length === 0 && (
                 <p className="text-center py-8 text-gray-400 italic font-bold">No items selected for recording</p>
               )}
               {allItems.map((item, idx) => (
                 <div key={idx} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-blue-200 transition-all">
                   <div>
                     <p className="text-xs font-black text-gray-900 group-hover:text-blue-700 transition-colors uppercase tracking-widest">{item.feeType}</p>
                     <p className="text-[10px] font-bold text-gray-400">{item.month ? formatMonthLabel(item.month) : 'Onetime Fee'}</p>
                   </div>
                   <p className="font-black text-gray-900">{fmt(item.amount)}</p>
                 </div>
               ))}
             </div>
          </div>
        </div>

        {/* RIGHT: CONTROLS */}
        <div className="lg:col-span-2 space-y-6">
           {/* PAYMENT MODE */}
           <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-8">
              <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6">Execution Mode</h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { mode: 'Cash', icon: <Banknote size={20} /> },
                  { mode: 'UPI', icon: <QrCode size={20} /> },
                  { mode: 'Transfer', icon: <Building2 size={20} /> },
                ].map(({ mode, icon }) => (
                  <button 
                    key={mode} 
                    onClick={() => setPaymentMode(mode)}
                    className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${
                      paymentMode === mode ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100 scale-105' : 'bg-gray-50 border-gray-50 text-gray-400 hover:bg-gray-100 hover:border-gray-100'
                    }`}
                  >
                    {icon}
                    <span className="text-[10px] font-black uppercase tracking-widest">{mode}</span>
                  </button>
                ))}
              </div>
           </div>

           {(paymentMode === 'UPI' || paymentMode === 'Transfer') && (
             <div className="bg-gray-50 rounded-[2rem] border-2 border-gray-100 p-8 animate-in slide-in-from-top-4 duration-500 overflow-hidden">
               {paymentMode === 'UPI' ? (
                 <div className="flex flex-col items-center text-center space-y-4">
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Scan & Capture Transaction</h3>
                   {settings?.upiId ? (
                     <>
                       <div className="bg-white p-4 rounded-3xl shadow-xl shadow-blue-100 border border-blue-50 group hover:scale-105 transition-all duration-300">
                         <img 
                           src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(`upi://pay?pa=${settings.upiId}&pn=${encodeURIComponent(settings.schoolName)}&am=${total}&cu=INR`)}&size=200x200`}
                           alt="Payment QR"
                           className="h-40 w-40"
                         />
                       </div>
                       <div className="space-y-1">
                         <p className="text-lg font-black text-gray-900 tracking-tight">{settings.upiId}</p>
                         <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full inline-block">{settings.schoolName}</p>
                       </div>
                     </>
                   ) : (
                     <div className="p-6 bg-red-50 rounded-2xl text-red-600 border border-red-100 italic">
                       <AlertCircle className="mx-auto mb-2" size={24} />
                       <p className="text-xs font-black uppercase tracking-widest">UPI ID Not Configured</p>
                       <p className="text-[10px] font-bold mt-1 opacity-70">Update Identity in Settings</p>
                     </div>
                   )}
                 </div>
               ) : (
                 <div className="space-y-6">
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-200 pb-4">Bank Transfer Credentials</h3>
                   {(settings?.bankName || settings?.accountNumber) ? (
                     <div className="grid grid-cols-1 gap-4">
                       {[
                         { label: 'Bank Name', value: settings.bankName },
                         { label: 'A/C Number', value: settings.accountNumber, mono: true },
                         { label: 'IFSC Code', value: settings.ifscCode, mono: true },
                         { label: 'Holder Name', value: settings.accountHolder },
                         { label: 'Branch Name', value: settings.branch },
                       ].filter(item => item.value).map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center group">
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{item.label}</span>
                             <span className={`font-black text-gray-900 ${item.mono ? 'font-mono' : ''}`}>{item.value}</span>
                          </div>
                       ))}
                     </div>
                   ) : (
                     <div className="p-6 bg-amber-50 rounded-2xl text-amber-700 text-center border border-amber-100">
                       <Building2 className="mx-auto mb-2 opacity-50" size={24} />
                       <p className="text-xs font-black uppercase tracking-widest">Bank Details Not Found</p>
                       <p className="text-[10px] font-bold mt-1 opacity-70">Please configure in Settings</p>
                     </div>
                   )}
                 </div>
               )}
             </div>
           )}

           {/* SUMMARY & DISCOUNT */}
           <div className="bg-blue-600 rounded-[2rem] shadow-2xl shadow-blue-200 p-8 text-white space-y-6">
              <div className="flex justify-between items-center text-sm font-bold opacity-60 uppercase tracking-[0.2em]">
                <span>Base Amount</span>
                <span>{fmt(baseAmount)}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-black uppercase tracking-widest">Apply Discount (₹)</span>
                <input 
                  type="text"
                  placeholder="0"
                  className="w-24 bg-white/20 border border-white/30 rounded-xl px-4 py-2 text-right font-black outline-none focus:bg-white focus:text-blue-600 transition-all"
                  value={discount === 0 ? '' : discount}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    const num = val ? parseInt(val) : 0;
                    setDiscount(Math.min(num, baseAmount));
                  }}
                />
              </div>

              <div className="h-1 w-full bg-white/10 rounded-full" />

              <div className="flex justify-between items-end">
                <div className="flex-1">
                  <p className="text-[11px] font-black uppercase text-blue-200 tracking-widest">Total Payable</p>
                  <p className="text-4xl font-black">{fmt(total)}</p>
                </div>
                <button 
                  onClick={handleConfirmPayment}
                  disabled={loading}
                  className="px-6 py-3 bg-sky-500 text-white rounded-xl flex items-center justify-center gap-2 shadow-lg hover:bg-sky-600 active:scale-95 transition-all font-black uppercase text-xs tracking-widest disabled:opacity-50"
                >
                  {loading ? (
                    <span className="h-4 w-4 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      FINAL PAY
                    </>
                  )}
                </button>
              </div>
           </div>
           
           {error && (
             <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-xs font-bold animate-shake">
               ⚠️ {error}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
