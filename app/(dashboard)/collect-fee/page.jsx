"use client"

import { useSchoolSettings } from '@/hooks/useSettings';
import { useState, useEffect, useMemo } from 'react';
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
  const currentSessionYear = useMemo(() => {
    const today = new Date();
    return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  }, []);

  const [selectedSession, setSelectedSession] = useState(currentSessionYear);
  const [selectedMonthsSet, setSelectedMonthsSet] = useState(new Set());
  const [selectedTypes, setSelectedTypes] = useState(new Set(["Monthly Fee"]));
  const [prevDueAmount, setPrevDueAmount] = useState(0);
  const [vanAmount, setVanAmount] = useState(0);
  const [admissionAmount, setAdmissionAmount] = useState(0);
  const [examAmount, setExamAmount] = useState(0);

  const [paymentMode, setPaymentMode] = useState('Cash');
  const [discount, setDiscount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const monthNames = useMemo(() => [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ], []);

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

  const getJoiningYear = (admissionNumber) => {
    if (!admissionNumber) return new Date().getFullYear();
    const parts = admissionNumber.split("-");
    for (const part of parts) {
      const y = parseInt(part, 10);
      if (!isNaN(y) && y >= 1000 && y <= 9999) {
        return y;
      }
    }
    const firstPart = parseInt(parts[0], 10);
    return isNaN(firstPart) ? new Date().getFullYear() : firstPart;
  };

  const ALL_CLASSES = [
    'LKG', 'UKG', 
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 
    'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 
    'Class 11', 'Class 12'
  ];

  function getPromotedClass(originalClass, diff) {
    if (!originalClass) return '';
    if (diff <= 0) return originalClass;
    
    const norm = (c) => c.toLowerCase().replace(/\s+/g, '');
    const index = ALL_CLASSES.findIndex(c => norm(c) === norm(originalClass));
    
    if (index === -1) {
      const match = originalClass.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        const promotedNum = num + diff;
        return originalClass.replace(/\d+/, promotedNum);
      }
      return originalClass;
    }
    
    const targetIndex = index + diff;
    if (targetIndex >= ALL_CLASSES.length) {
      return 'Alumni';
    }
    return ALL_CLASSES[targetIndex];
  }

  const joiningYear = useMemo(() => {
    if (student?.joiningYear) return student.joiningYear;
    if (!student?.admissionNumber) return null;
    return getJoiningYear(student.admissionNumber);
  }, [student?.joiningYear, student?.admissionNumber]);

  const displayedClassName = useMemo(() => {
    if (!student || !selectedSession) return student?.className || '';
    const jYear = student.joiningYear || (student.admissionNumber ? getJoiningYear(student.admissionNumber) : new Date().getFullYear());
    const diff = selectedSession - jYear;
    return getPromotedClass(student.className, diff);
  }, [student, selectedSession]);

  const activeFeeStructure = feeStructure?.find(f => f.className === displayedClassName);

  useEffect(() => {
    if (student) {
      setSelectedSession(currentSessionYear);
      setSelectedMonthsSet(new Set());
    }
  }, [student, currentSessionYear]);

  const sessions = useMemo(() => {
    const list = [];
    const startYear = joiningYear ? joiningYear : currentSessionYear - 10;
    const endYear = currentSessionYear;
    const actualStart = Math.min(startYear, endYear);
    const actualEnd = Math.max(startYear, endYear);
    for (let y = actualStart; y <= actualEnd; y++) {
      const nextYearShort = String(y + 1).slice(-2);
      list.push({
        year: y,
        label: `${y}-${nextYearShort}`
      });
    }
    return list;
  }, [joiningYear, currentSessionYear]);

  const monthGrid = useMemo(() => {
    if (!student || !selectedSession) return [];
    
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthsInSession = ["04", "05", "06", "07", "08", "09", "10", "11", "12", "01", "02", "03"];
    const payments = student.payments || [];

    const grid = [];
    for (const m of monthsInSession) {
      const monthNum = parseInt(m, 10);
      const calYear = monthNum >= 4 ? selectedSession : selectedSession + 1;
      const ym = `${calYear}-${m}`;
      const curr = new Date(calYear, monthNum - 1, 1);

      // Check if paid
      const isPaid = payments.some(p => {
        if (p.status !== 'SUCCESS') return false;
        if (p.month === ym && p.isMonthlyPaid) return true;
        if (p.selectedMonths && Array.isArray(p.selectedMonths) && p.isMonthlyPaid) {
          const [yStr, mStr] = ym.split('-');
          const yearNum = parseInt(yStr, 10);
          const monthIndex = parseInt(mStr, 10);
          const monthName = monthNames[monthIndex - 1];
          return p.selectedMonths.some(sm => 
            sm.year === yearNum && 
            (sm.month === monthName || sm.month === mStr || String(sm.month).padStart(2, '0') === mStr)
          );
        }
        return false;
      });

      const isPast = curr < currentMonthStart;
      const isFuture = curr > currentMonthStart;

      let state = "gray"; // Future/Pending
      if (student.isFeeExempt) {
        state = "blue"; // EXEMPT
      } else if (isPaid) {
        state = "green"; // Emerald
      } else if (isPast) {
        state = "red";   // Rose (Past-due)
      } else if (!isFuture) {
        state = "red";   // Current month (Past-due if not paid)
      }

      grid.push({
        label: curr.toLocaleString("en-IN", { month: "short" }),
        monthName: monthNames[monthNum - 1],
        year: calYear,
        ym,
        state
      });
    }
    return grid;
  }, [student, selectedSession, monthNames]);

  const handleMonthToggle = (m) => {
    if (m.state === 'green' || m.state === 'blue') return; // Cannot select Paid or Exempt
    
    const next = new Set(selectedMonthsSet);
    if (next.has(m.ym)) {
      next.delete(m.ym);
    } else {
      next.add(m.ym);
    }
    setSelectedMonthsSet(next);
  };

  useEffect(() => {
    if (activeFeeStructure) {
      setVanAmount(activeFeeStructure.vanChargeFee || 0);
      setAdmissionAmount(activeFeeStructure.admissionFee || 0);
      setExamAmount(activeFeeStructure.examFee || 0);
    }
  }, [activeFeeStructure]);
  
  const selectedMonthsCount = selectedMonthsSet.size;

  const types = [
    { label: "Monthly Fee", amount: (activeFeeStructure?.monthlyFee || 0) * selectedMonthsCount, rate: activeFeeStructure?.monthlyFee || 0, isPerMonth: true },
    { label: "Transport", amount: vanAmount, rate: vanAmount, isPerMonth: false },
    { label: "Admission Fee", amount: admissionAmount, rate: admissionAmount, isPerMonth: false },
    { label: "Exam Fee", amount: examAmount, rate: examAmount, isPerMonth: false },
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
        ? [{ feeType: 'Legacy Carry-Forward Due', monthLabel: null, amount: payload.previousDueAmount }] 
        : []),
      ...payload.selectedFees.map(f => ({ feeType: f.type, monthLabel: f.month, amount: f.amount })),
    ];
  } else {
    currentStudentId = student.id;
    successReturnUrl = `/students/${student.id}`;
    
    const itemsList = [];
    
    // Monthly Fee
    if (selectedTypes.has("Monthly Fee") && (activeFeeStructure?.monthlyFee || 0) > 0) {
      selectedMonthsSet.forEach(ym => {
        const [y, m] = ym.split('-');
        const mName = monthNames[parseInt(m, 10) - 1];
        itemsList.push({
          feeType: "Monthly Fee",
          monthLabel: `${mName} ${y}`,
          amount: activeFeeStructure.monthlyFee
        });
      });
    }

    // Transport
    if (selectedTypes.has("Transport") && vanAmount > 0) {
      itemsList.push({
        feeType: "Transport",
        monthLabel: "Onetime Fee",
        amount: vanAmount
      });
    }

    // Admission
    if (selectedTypes.has("Admission Fee") && admissionAmount > 0) {
      itemsList.push({
        feeType: "Admission Fee",
        monthLabel: "Onetime Fee",
        amount: admissionAmount
      });
    }

    // Exam
    if (selectedTypes.has("Exam Fee") && examAmount > 0) {
      itemsList.push({
        feeType: "Exam Fee",
        monthLabel: "Onetime Fee",
        amount: examAmount
      });
    }

    // Legacy Due Payment
    if (prevDueAmount > 0) {
      itemsList.push({
        feeType: "Legacy Due Payment",
        monthLabel: "Onetime Fee",
        amount: prevDueAmount
      });
    }

    allItems = itemsList;
  }

  const baseAmount = allItems.reduce((s, i) => s + i.amount, 0);
  const safeDiscount = Math.min(Math.max(0, discount), baseAmount);
  const total = Math.max(0, baseAmount - safeDiscount);

  const handleConfirmPayment = async () => {
    if (total <= 0) {
      toast.error("Total amount must be greater than zero");
      return;
    }
    if (!payload && selectedTypes.has("Monthly Fee") && selectedMonthsSet.size === 0) {
      toast.error("Please select at least one month in the visualizer grid for Monthly Fee.");
      return;
    }

    setLoading(true);
    setError('');
    try {
      let bodyData = {};
      if (payload) {
        bodyData = {
          studentId: payload.studentId,
          month: payload.month || "",
          paymentMode,
          discount: Number(safeDiscount),
          selectedItems: payload.selectedFees || [],
          previousDueAmount: Number(payload.previousDueAmount || 0),
        };
      } else {
        const payloadMonths = Array.from(selectedMonthsSet).map(ym => {
          const [y, m] = ym.split('-');
          const mIndex = parseInt(m, 10);
          return {
            month: monthNames[mIndex - 1],
            year: parseInt(y, 10)
          };
        });

        const payloadItems = types.filter(t => selectedTypes.has(t.label) && (t.isPerMonth ? selectedMonthsSet.size > 0 : true)).map(t => {
          const itemMonths = t.isPerMonth 
            ? Array.from(selectedMonthsSet).map(ym => {
                const [y, m] = ym.split('-');
                const mIndex = parseInt(m, 10);
                return monthNames[mIndex - 1];
              })
            : undefined;

          return {
            type: t.label === "Monthly Fee" ? "MONTHLY" : (t.label === "Transport" ? "TRANSPORT" : t.label === "Admission Fee" ? "ADMISSION" : "EXAM"),
            months: itemMonths,
            rate: t.rate,
            quantity: t.isPerMonth ? selectedMonthsSet.size : 1,
            total: t.amount
          };
        });

        bodyData = {
          studentId: student.id,
          months: payloadMonths,
          paymentItems: payloadItems,
          paymentMode,
          discount: safeDiscount,
          previousDueAmount: Number(prevDueAmount)
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

      // Revalidate SWR key for this student
      if (student?.id) {
        globalMutate(`/api/students/${student.id}`);
      }

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
                             <Zap size={12} /> {student.admissionNumber} • {displayedClassName}
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
                        This student is exempt from standard monthly fees. Only record a payment if they are paying for optional services like Transport, Exams, or specific extras.
                      </p>
                    </div>
                  </div>
                )}

                 <div className="space-y-4 pt-2">
                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                      <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest pl-1">Select Months to Pay</p>
                      {sessions.length > 0 && (
                        <select
                          value={selectedSession}
                          onChange={(e) => {
                            setSelectedSession(Number(e.target.value));
                            setSelectedMonthsSet(new Set());
                          }}
                          className="px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-black uppercase text-blue-600 bg-blue-50 outline-none cursor-pointer"
                        >
                          {sessions.map(s => (
                            <option key={s.year} value={s.year} className="font-bold text-gray-700 bg-white">
                              Session {s.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                      {monthGrid.map(m => {
                        const isSelected = selectedMonthsSet.has(m.ym);
                        return (
                          <div 
                            key={m.ym} 
                            onClick={() => handleMonthToggle(m)}
                            className={`group relative rounded-2xl p-4 border transition-all cursor-pointer text-center ${
                              m.state === 'green' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 cursor-not-allowed opacity-65' :
                              m.state === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-600 cursor-not-allowed opacity-65' :
                              isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-100' :
                              m.state === 'red' ? 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100/50' :
                              'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
                            }`}
                          >
                            <p className="text-[9px] font-black uppercase opacity-60">{m.year}</p>
                            <p className="text-sm font-black">{m.label}</p>
                            
                            {/* Tooltip detail */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                              <div className="bg-gray-900 text-white text-[8px] font-bold px-2 py-1 rounded-lg whitespace-nowrap shadow-xl uppercase tracking-widest">
                                {m.state === 'green' ? 'Paid' : m.state === 'blue' ? 'Exempt' : isSelected ? 'Selected' : m.state === 'red' ? 'Pending' : 'Upcoming'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
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
                                <div className="flex flex-col">
                                  <span className="font-bold text-gray-800 text-sm">{t.label}</span>
                                  <span className="text-xs text-gray-400 font-bold">₹{t.rate}{t.isPerMonth ? '/month' : ''}</span>
                                </div>
                             </div>
                             {(t.label === "Transport" || t.label === "Admission Fee" || t.label === "Exam Fee") && canAdjust ? (
                                <div className="relative group/adjust cursor-text">
                                  <input 
                                    type="number"
                                    value={
                                      t.label === "Transport" ? (vanAmount === 0 ? '' : vanAmount) :
                                      t.label === "Admission Fee" ? (admissionAmount === 0 ? '' : admissionAmount) :
                                      (examAmount === 0 ? '' : examAmount)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => {
                                      const val = Number(e.target.value);
                                      if (t.label === "Transport") {
                                        setVanAmount(val);
                                      } else if (t.label === "Admission Fee") {
                                        setAdmissionAmount(val);
                                      } else {
                                        setExamAmount(val);
                                      }
                                    }}
                                    className="w-24 h-10 bg-white border border-gray-200 rounded-xl px-3 text-right font-black text-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                                    placeholder="0"
                                  />
                                  <span className="absolute -top-6 right-0 text-[8px] font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover/adjust:opacity-100 transition-opacity">Adjust Fee</span>
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
