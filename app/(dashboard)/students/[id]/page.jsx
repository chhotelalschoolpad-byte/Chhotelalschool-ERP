"use client"

import { useStudent } from "@/hooks/useStudents";
import { useSchoolSettings } from "@/hooks/useSettings";
import { useAuth } from "@/context/AuthContext";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { mutate as globalMutate } from "swr";
import Badge from "@/components/ui/Badge";
import {
  User, Phone, MapPin, Calendar, BookOpen,
  Trash2, MessageCircle, AlertCircle, CreditCard,
  Download, Clock, CheckCircle2, Edit3,
  Info, IndianRupee, Layers, Zap,
  CheckCircle, ChevronDown, ChevronUp, History,
  PlusCircle, Calculator, Fingerprint, Users
} from "lucide-react";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReceiptPDF from "@/components/pdf/ReceiptPDF";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n || 0);

function formatMonthLabel(ym) {
  if (!ym) return "N/A";
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

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

const getSessionBounds = (sessionStartYear) => {
  const year = Number(sessionStartYear);
  return {
    start: new Date(year, 3, 1, 0, 0, 0, 0),      // April 1
    end: new Date(year + 1, 2, 31, 23, 59, 59, 999)    // March 31
  };
};

export default function StudentProfile() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const canArchive = isAdmin || isManager;

  const { student, isLoading, mutate } = useStudent(id);
  const { settings } = useSchoolSettings();

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [paymentToArchive, setPaymentToArchive] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [feeStructure, setFeeStructure] = useState(null);
  const [siblings, setSiblings] = useState([]);
  const [isExemptLoading, setIsExemptLoading] = useState(false);

  const currentSessionYear = useMemo(() => {
    const today = new Date();
    return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  }, []);

  const [selectedSession, setSelectedSession] = useState(currentSessionYear);

  useEffect(() => {
    if (id) {
      setSelectedSession(currentSessionYear);
    }
  }, [id, currentSessionYear]);

  const joiningYear = useMemo(() => {
    if (!student?.admissionNumber) return null;
    return getJoiningYear(student.admissionNumber);
  }, [student?.admissionNumber]);

  useEffect(() => {
    if (joiningYear && selectedSession && selectedSession < joiningYear) {
      setSelectedSession(currentSessionYear);
    }
  }, [joiningYear, selectedSession, currentSessionYear]);

  const sessions = useMemo(() => {
    if (joiningYear === null) return [];
    const list = [];
    for (let y = joiningYear; y <= currentSessionYear; y++) {
      const nextYearShort = String(y + 1).slice(-2);
      list.push({
        year: y,
        label: `${y}-${nextYearShort}`
      });
    }
    return list;
  }, [joiningYear, currentSessionYear]);

  // -- Fetch Fee Structure --
  useEffect(() => {
    fetch("/api/fees")
      .then(r => r.json())
      .then(res => {
        if (res.data) setFeeStructure(res.data);
      })
      .catch(() => { });
  }, []);

  const activeFeeStructure = useMemo(() =>
    feeStructure?.find(f => f.className === student?.className),
    [feeStructure, student]);

  useEffect(() => {
    if (id) {
      fetch(`/api/students/${id}/siblings`)
        .then(r => r.json())
        .then(res => { if (res.data) setSiblings(res.data); })
        .catch(() => { });
    }
  }, [id]);

  const handleExemptToggle = async () => {
    try {
      setIsExemptLoading(true);
      const res = await fetch(`/api/students/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isFeeExempt: !student.isFeeExempt,
          exemptionReason: !student.isFeeExempt ? "Sibling / Management Discretion" : null
        })
      });

      if (!res.ok) throw new Error("Failed to update status");

      toast.success(student.isFeeExempt ? "Exemption Removed" : "Student Marked as Exempt");
      await mutate();

      // Global revalidation
      globalMutate(key => typeof key === 'string' && (key.startsWith("/api/students") || key.startsWith("/api/reports")));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsExemptLoading(false);
    }
  };


  // -- Computed Stats --
  const payments = useMemo(() => student?.payments || [], [student]);

  const filteredPayments = useMemo(() => {
    if (!selectedSession) return payments;
    return payments.filter(p => {
      let pSessionYear;
      if (p.month && p.month.includes('-')) {
        const [y, m] = p.month.split('-');
        pSessionYear = Number(y);
      }
      if (pSessionYear === undefined) {
        const pDate = new Date(p.paymentDate);
        const y = pDate.getFullYear();
        const m = pDate.getMonth() + 1;
        pSessionYear = m >= 4 ? y : y - 1;
      }
      return Number(pSessionYear) === Number(selectedSession);
    });
  }, [payments, selectedSession]);

  const remainingPrevDue = Math.max(0, (student?.previousDue || 0) - (student?.previousDuePaid || 0));

  const lastMonthlyPayment = useMemo(() => {
    const monthlyOnes = payments
      .filter(p => p.isMonthlyPaid && p.month)
      .sort((a, b) => b.month.localeCompare(a.month));
    return monthlyOnes[0]?.month || null;
  }, [payments]);

  const totalPaidInSession = useMemo(() =>
    filteredPayments.reduce((sum, p) => sum + p.amount, 0),
    [filteredPayments]);

  // -- Month Visualizer Logic (Refined) --
  const monthGrid = useMemo(() => {
    if (!student || !selectedSession) return [];

    console.log("monthGrid payments.length:", payments.length, "first payment month:", payments[0]?.month);

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthsInSession = ["04", "05", "06", "07", "08", "09", "10", "11", "12", "01", "02", "03"];

    const grid = [];
    for (const m of monthsInSession) {
      const ym = `${selectedSession}-${m}`;
      const monthNum = parseInt(m, 10);
      const calYear = monthNum >= 4 ? selectedSession : selectedSession + 1;
      const curr = new Date(calYear, monthNum - 1, 1);

      const monthPayments = payments.filter(p => p.month === ym);
      const isPaid = monthPayments.some(p => p.isMonthlyPaid && p.status === 'SUCCESS');
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
        year: calYear,
        ym,
        state
      });
    }
    return grid;
  }, [student, payments, selectedSession]);

  const hasDues = useMemo(() => {
    return monthGrid.some(m => m.state === "red") || remainingPrevDue > 0;
  }, [monthGrid, remainingPrevDue]);

  const firstPendingMonth = useMemo(() => {
    return monthGrid.find(m => m.state === "red");
  }, [monthGrid]);

  // -- Handlers --
  const handleDelete = async () => {
    const res = await fetch("/api/students/" + id + "?confirm=true", { method: "DELETE" });
    if (res.ok) { toast.success("Student removed"); router.push("/students"); }
    else { const e = await res.json(); toast.error(e.error || "Delete failed"); }
    setDeleteConfirmOpen(false);
  };

  const handleArchivePayment = async () => {
    if (!paymentToArchive) return;
    const res = await fetch("/api/payments/" + paymentToArchive, { method: "DELETE" });
    if (res.ok) {
      toast.success("Payment archived");
      await mutate();

      // Global revalidation to sync Dashboard & Reports
      globalMutate(key =>
        typeof key === 'string' && (
          key.startsWith("/api/students") ||
          key.startsWith("/api/reports")
        )
      );
    } else {
      const e = await res.json();
      toast.error(e.error || "Archive failed");
    }
    setPaymentToArchive(null);
  };

  if (isLoading) return <div className="p-20 text-center font-black animate-pulse text-blue-600">LOADING PROFILE...</div>;
  if (!student) return <div className="p-20 text-center font-black text-red-600">STUDENT NOT FOUND</div>;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-40">

      {/* HEADER CARD */}
      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
        <div className="h-24 bg-blue-700 relative">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]" />
        </div>
        <div className="px-8 pb-8 pt-0">
          <div className="flex flex-col md:flex-row gap-8 items-start relative -mt-12">
            <div className="h-32 w-32 bg-white rounded-full p-1.5 shadow-2xl relative z-10">
              <div className="h-full w-full rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-black text-4xl border-4 border-white">
                {student.fullName.charAt(0)}
              </div>
            </div>
            <div className="mt-2 md:mt-12 flex-1">
              <div className="flex flex-wrap items-center gap-4 mb-4">
                <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">{student.fullName}</h1>
                <Badge status={hasDues ? "due" : (lastMonthlyPayment ? "paid" : "pending")} />
                {student.isFeeExempt && (
                  <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-100 shadow-sm">
                    <Zap size={12} className="fill-blue-500" /> Fee Exempt
                  </span>
                )}
                {student.isExisting && (
                  <span className="flex items-center gap-1.5 bg-amber-50 text-amber-700 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-widest border border-amber-100">
                    <Clock size={12} /> Legacy Student
                  </span>
                )}
              </div>
            </div>
            <div className="md:mt-12 w-full md:w-auto flex flex-col sm:flex-row gap-4">
              <button
                disabled={isNavigating}
                onClick={() => {
                  setIsNavigating(true);
                  router.push(`/collect-fee?studentId=${id}`);
                }}
                className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black shadow-xl transition-all uppercase text-sm tracking-widest ${isNavigating ? 'bg-emerald-600 shadow-emerald-100 text-white' : 'bg-emerald-500 text-white shadow-emerald-100 hover:bg-emerald-600'
                  }`}
              >
                <PlusCircle size={20} /> {isNavigating ? 'NAVIGATING...' : student.isFeeExempt ? 'RECORD EXTRA' : 'RECORD PAYMENT'}
              </button>

              <button
                disabled={student.isFeeExempt}
                onClick={() => {
                  const now = new Date();
                  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
                  const currentLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' });

                  const monthLabel = firstPendingMonth ? `${firstPendingMonth.label} ${firstPendingMonth.year}` : currentLabel;
                  const monthYm = firstPendingMonth?.ym || currentYM;
                  const amount = activeFeeStructure?.monthlyFee || '0';
                  router.push(`/messaging?studentId=${id}&month=${encodeURIComponent(monthLabel)}&monthYm=${monthYm}&amount=${amount}`);
                }}
                className={`flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black shadow-xl transition-all uppercase text-sm tracking-widest ${student.isFeeExempt ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none border border-gray-200' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'
                  }`}
              >
                <MessageCircle size={20} /> REMIND
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-10 gap-y-6 mt-6 w-full border-t border-gray-50 pt-6">
            <div className="flex items-center gap-2.5">
              <Layers size={18} className="text-blue-500 shrink-0" />
              <p className="text-sm font-bold text-gray-900">
                <span className="text-[10px] uppercase text-gray-400 tracking-widest mr-2">Class:</span>
                {student.className}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Fingerprint size={18} className="text-indigo-500 shrink-0" />
              <p className="text-sm font-bold text-gray-900">
                <span className="text-[10px] uppercase text-gray-400 tracking-widest mr-2">ADM ID:</span>
                {student.admissionNumber}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Phone size={18} className="text-emerald-500 shrink-0" />
              <p className="text-sm font-bold text-gray-900">
                <span className="text-[10px] uppercase text-gray-400 tracking-widest mr-2">Contact:</span>
                +91 {student.mobile1}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <User size={18} className="text-amber-500 shrink-0" />
              <p className="text-sm font-bold text-gray-900">
                <span className="text-[10px] uppercase text-gray-400 tracking-widest mr-2">Parent:</span>
                {student.fatherName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* EXPANDED BIO SNAPSHOT (FULL ROW) */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 p-8 pt-10 animate-in fade-in slide-in-from-top-4 duration-700">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
            <Info size={24} className="text-blue-600" /> Comprehensive Bio Profile
          </h2>
          <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-1.5 rounded-full border border-blue-100 uppercase tracking-widest">
            Verified Student Identity
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-y-10 gap-x-8">
          {/* FAMILY & CONTACT */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 border border-blue-100 shrink-0"><Users size={20} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-blue-400 mb-1">Parental Guardians</p>
                <p className="text-xs font-bold text-gray-700"><span className="opacity-50">Father:</span> {student.fatherName}</p>
                <p className="text-xs font-bold text-gray-700"><span className="opacity-50">Mother:</span> {student.motherName || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-500 border border-emerald-100 shrink-0"><Phone size={20} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Contact Channels</p>
                <p className="text-xs font-bold text-gray-700"><span className="opacity-50">P:</span> +91 {student.mobile1}</p>
                {student.mobile2 && <p className="text-xs font-bold text-gray-700"><span className="opacity-50">S:</span> +91 {student.mobile2}</p>}
              </div>
            </div>
          </div>

          {/* IDENTITY KEYS */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500 border border-indigo-100 shrink-0"><Fingerprint size={20} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">Student Aadhaar</p>
                <p className="text-xs font-black text-gray-900 tracking-widest font-mono">{student.aadhaarNumber || 'NOT RECORDED'}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-violet-50 rounded-xl flex items-center justify-center text-violet-500 border border-violet-100 shrink-0"><CheckCircle2 size={20} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-violet-400 mb-1">Parent Aadhaar</p>
                <p className="text-xs font-black text-gray-900 tracking-widest font-mono">{student.parentAadhaarNumber || 'NOT RECORDED'}</p>
              </div>
            </div>
          </div>

          {/* DEMOGRAPHICS */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100 shrink-0"><Calendar size={20} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-amber-400 mb-1">Chronological Info</p>
                <p className="text-xs font-bold text-gray-700"><span className="opacity-50">DOB:</span> {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('en-IN') : 'N/A'}</p>
                <p className="text-xs font-bold text-gray-700"><span className="opacity-50">Joined:</span> {new Date(student.admissionDate).toLocaleDateString('en-IN')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 border border-orange-100 shrink-0"><User size={20} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-orange-400 mb-1">Personal Profile</p>
                <p className="text-xs font-bold text-gray-700">{student.gender} / {student.religion || 'N/A'}</p>
                {student.caste && <p className="text-xs font-bold text-gray-700 font-black text-blue-600">Caste: {student.caste}</p>}
              </div>
            </div>
          </div>

          {/* LOCATION & SCHOLASTIC */}
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 border border-rose-100 shrink-0"><MapPin size={20} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-rose-400 mb-1">Residence Location</p>
                <p className="text-xs font-bold text-gray-700 leading-relaxed truncate">{student.address || 'N/A'}</p>
                <p className="text-xs font-bold text-gray-700 opacity-60 italic">{student.state || 'N/A'}, {student.country}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 bg-teal-50 rounded-xl flex items-center justify-center text-teal-500 border border-teal-100 shrink-0"><BookOpen size={20} /></div>
              <div>
                <p className="text-[10px] font-black uppercase text-teal-400 mb-1">Academic Roots</p>
                <p className="text-xs font-bold text-gray-700 italic">{student.previousSchool || 'First Enrollment'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-gray-50 flex justify-end gap-3">
          {canArchive && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExemptToggle}
                disabled={isExemptLoading}
                className={`flex items-center gap-2 font-semibold text-[10px] uppercase tracking-widest px-4 py-2 rounded-xl transition-all border ${student.isFeeExempt
                  ? 'text-gray-400 bg-gray-50 border-gray-100 hover:bg-gray-100'
                  : 'text-amber-600 bg-amber-50 border-amber-100 hover:bg-amber-100'
                  }`}
              >
                {isExemptLoading ? 'Syncing...' : (student.isFeeExempt ? 'Undo Exemption' : 'Exempt from Fees')}
              </button>
              <button
                onClick={() => router.push(`/students/${id}/edit`)}
                className="flex items-center gap-2 text-blue-600 font-semibold text-[10px] uppercase tracking-widest hover:bg-blue-50 px-4 py-2 rounded-xl transition-all"
              >
                <Edit3 size={14} /> Update Information
              </button>
            </div>
          )}
          <button onClick={() => setDeleteConfirmOpen(true)} className="flex items-center gap-2 text-rose-500 font-semibold text-[10px] uppercase tracking-widest hover:bg-rose-50 px-4 py-2 rounded-xl transition-all">
            <Trash2 size={14} /> Clear Student Record
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN: VISUALIZER & HISTORY */}
        <div className="lg:col-span-2 space-y-8">

          {/* MONTH VISUALIZER */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-gray-100">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-3">
                  <Calendar size={24} className="text-blue-600" /> Payment Visualizer
                </h2>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedSession || ""}
                    onChange={(e) => setSelectedSession(Number(e.target.value))}
                    className="px-3 py-1.5 rounded-xl border border-gray-100 text-xs font-black uppercase text-blue-600 bg-blue-50 outline-none cursor-pointer"
                  >
                    {sessions.map(s => (
                      <option key={s.year} value={s.year} className="font-bold text-gray-700 bg-white">
                        Session {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase"><div className="h-2 w-2 rounded-full bg-emerald-500" /> Paid</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase"><div className="h-2 w-2 rounded-full bg-blue-500" /> Exempt</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase"><div className="h-2 w-2 rounded-full bg-amber-500" /> Partial</span>
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase"><div className="h-2 w-2 rounded-full bg-gray-200" /> Upcoming</span>
              </div>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {monthGrid.map(m => (
                <div key={m.ym} className={`group relative rounded-2xl p-4 border transition-all ${m.state === 'green' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                  m.state === 'blue' ? 'bg-blue-50 border-blue-100 text-blue-700' :
                    m.state === 'red' ? 'bg-rose-50 border-rose-100 text-rose-700' :
                      'bg-gray-50 border-gray-100 text-gray-400'
                  }`}>
                  <p className="text-[10px] font-black uppercase opacity-60">{m.year}</p>
                  <p className="text-lg font-black">{m.label}</p>

                  {/* Tooltip detail */}
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg whitespace-nowrap shadow-xl uppercase tracking-widest">
                      {m.state === 'green' ? 'Monthly Fee Paid' : m.state === 'blue' ? 'Fee Exempted' : m.state === 'red' ? 'Pending Due' : 'Upcoming Session'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-black text-gray-900 flex items-center gap-3">
                <History className="text-blue-600" /> Transaction History
              </h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full border border-gray-100">
                {filteredPayments.length} Records Found
              </p>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[400px]">
              <table className="w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-100">
                  <tr>
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest">Receipt ID</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest">Student</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Date Paid</th>
                    <th className="px-8 py-5 text-left text-[10px] font-black uppercase text-gray-400 tracking-widest text-center">Target</th>
                    <th className="px-8 py-5 text-right text-[10px] font-black uppercase text-gray-400 tracking-widest">Amount</th>
                    <th className="px-8 py-5 text-center text-[10px] font-black uppercase text-gray-400 tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPayments.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-8 py-12 text-center text-gray-400 italic font-medium">No records available for this student.</td>
                    </tr>
                  )}
                  {filteredPayments.sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate)).map(p => (
                    <tr key={p.id} className="group hover:bg-gray-50/50 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center font-medium text-[10px]">
                            {p.paymentMode.charAt(0)}
                          </div>
                          <div>
                            <p className="font-mono text-gray-400 text-[11px] tracking-tighter">{p.receiptNumber}</p>
                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-tight">{p.paymentMode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <p className="font-bold text-gray-900 text-sm">{student.fullName}</p>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <p className="text-xs text-gray-500 font-medium">{new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                      </td>
                      <td className="px-8 py-5 text-center">
                        {p.month ? (
                          <span className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-xl text-[10px] font-medium uppercase tracking-tight border border-blue-100 shadow-sm shadow-blue-50">
                            {formatMonthLabel(p.month)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-medium text-gray-400 uppercase italic">Onetime</span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right whitespace-nowrap">
                        <p className="text-sm font-medium text-emerald-600">+{fmt(p.amount)}</p>
                        {p.discount > 0 && <p className="text-[9px] font-bold text-emerald-600/60">discount:{fmt(p.discount)}</p>}
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center justify-center gap-2">
                          <PDFDownloadLink document={<ReceiptPDF payment={p} student={student} settings={settings} />} fileName={`Receipt_${p.receiptNumber}.pdf`}>
                            <button className="h-9 w-9 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-xl text-gray-400 transition-all flex items-center justify-center border border-gray-100 shadow-sm">
                              <Download size={16} />
                            </button>
                          </PDFDownloadLink>
                          {canArchive && (
                            <button
                              onClick={() => setPaymentToArchive(p.id)}
                              className="h-9 w-9 bg-gray-50 hover:bg-red-500 hover:text-white rounded-xl text-gray-400 transition-all flex items-center justify-center border border-gray-100 shadow-sm"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SUMMARY CARDS & BIO */}
        <div className="space-y-8">

          {/* LEDGER CARDS */}
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-blue-600 rounded-[2rem] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden group">
              <Calculator className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
              <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Total Paid This Session</p>
              <h3 className="text-4xl font-black mb-6">{fmt(totalPaidInSession)}</h3>
              <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-xl border border-white/10">
                <CheckCircle size={14} className="text-blue-200" />
                <p className="text-[10px] font-black uppercase">Successful Collection</p>
              </div>
            </div>

            {remainingPrevDue > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-[2rem] p-8 group">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-400 mb-2">Legacy Dues Remaining</p>
                <h3 className="text-4xl font-black text-rose-700 mb-4">{fmt(remainingPrevDue)}</h3>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-rose-500">
                  <AlertCircle size={14} /> Critical Attention
                </div>
              </div>
            )}

            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Last Monthly Paid</p>
              <h3 className="text-2xl font-black text-gray-900">{lastMonthlyPayment ? formatMonthLabel(lastMonthlyPayment) : 'No Records Found'}</h3>
            </div>
          </div>

          {/* SIBLINGS / FAMILY DETECTED */}
          {siblings.length > 0 && (
            <div className="bg-white rounded-[2rem] border border-gray-100 p-8 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4">
                <Users className="text-gray-100 w-16 h-16 rotate-12" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-4 flex items-center gap-2">
                <Users size={12} /> Family Detected ({siblings.length})
              </p>

              <div className="space-y-4 relative z-10">
                {siblings.map(sib => (
                  <div key={sib.id} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-black text-gray-900">{sib.fullName}</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase">{sib.className} • ADM: {sib.admissionNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {sib.isFeeExempt && (
                        <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase">Exempt</span>
                      )}
                      <button
                        onClick={() => router.push(`/students/${sib.id}`)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <PlusCircle size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-gray-400 mt-4 leading-relaxed italic">
                Shared Parent&apos;s Aadhaar or Contact Number detected. Sibling policy allows for one student to be exempted.
              </p>
            </div>
          )}

        </div>
      </div>

      {/* CONFIRM MODALS */}
      <ConfirmModal isOpen={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)} onConfirm={handleDelete} title="Confirm Deletion?" message="This will permanently delete the student and all payment logs." />
      <ConfirmModal isOpen={!!paymentToArchive} onClose={() => setPaymentToArchive(null)} onConfirm={handleArchivePayment} title="Void Payment?" message="This record will be moved to the archive." />

    </div>
  );
}
