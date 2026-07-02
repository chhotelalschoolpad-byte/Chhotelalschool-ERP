"use client"

import useSWR from 'swr';
import { useState, useMemo, useEffect } from 'react';
import Badge from '@/components/ui/Badge';
import { DownloadCloud, IndianRupee, PieChart, Banknote, QrCode, CreditCard, CalendarDays, Receipt, Download, Trash2 } from 'lucide-react';
import { PDFDownloadLink } from "@react-pdf/renderer";
import ReceiptPDF from "@/components/pdf/ReceiptPDF";
import { useSchoolSettings } from "@/hooks/useSettings";
import DatePicker from '@/components/ui/DatePicker';
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import toast from "react-hot-toast";
import ConfirmModal from "@/components/ui/ConfirmModal";

function formatMonthLabel(ym) {
  if (!ym) return "N/A";
  const [y, m] = ym.split("-");
  return new Date(parseInt(y), parseInt(m) - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

function formatMonthsRange(payment) {
  if (payment.selectedMonths && Array.isArray(payment.selectedMonths) && payment.selectedMonths.length > 0) {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const shortMonths = {
      "January": "Jan", "February": "Feb", "March": "Mar", "April": "Apr",
      "May": "May", "June": "Jun", "July": "Jul", "August": "Aug",
      "September": "Sep", "October": "Oct", "November": "Nov", "December": "Dec"
    };

    const items = payment.selectedMonths.map(m => {
      const idx = monthNames.indexOf(m.month);
      return {
        month: m.month,
        year: m.year,
        absIdx: m.year * 12 + idx
      };
    }).sort((a, b) => a.absIdx - b.absIdx);

    if (items.length === 12 && (items[11].absIdx - items[0].absIdx === 11) && items[0].absIdx % 12 === 3) {
      const sessionStartYear = Math.floor(items[0].absIdx / 12);
      const nextYearShort = String(sessionStartYear + 1).slice(-2);
      return `${sessionStartYear}-${nextYearShort}`;
    }

    const ranges = [];
    let start = items[0];
    let prev = items[0];

    for (let i = 1; i < items.length; i++) {
      const curr = items[i];
      if (curr.absIdx === prev.absIdx + 1) {
        prev = curr;
      } else {
        if (start.absIdx === prev.absIdx) {
          const yr = String(start.year).slice(-2);
          ranges.push(`${shortMonths[start.month] || start.month} '${yr}`);
        } else {
          const yrStart = String(start.year).slice(-2);
          const yrPrev = String(prev.year).slice(-2);
          if (yrStart === yrPrev) {
            ranges.push(`${shortMonths[start.month] || start.month}-${shortMonths[prev.month] || prev.month} '${yrStart}`);
          } else {
            ranges.push(`${shortMonths[start.month] || start.month} '${yrStart}-${shortMonths[prev.month] || prev.month} '${yrPrev}`);
          }
        }
        start = curr;
        prev = curr;
      }
    }

    if (start.absIdx === prev.absIdx) {
      const yr = String(start.year).slice(-2);
      ranges.push(`${shortMonths[start.month] || start.month} '${yr}`);
    } else {
      const yrStart = String(start.year).slice(-2);
      const yrPrev = String(prev.year).slice(-2);
      if (yrStart === yrPrev) {
        ranges.push(`${shortMonths[start.month] || start.month}-${shortMonths[prev.month] || prev.month} '${yrStart}`);
      } else {
        ranges.push(`${shortMonths[start.month] || start.month} '${yrStart}-${shortMonths[prev.month] || prev.month} '${yrPrev}`);
      }
    }

    return ranges.join(', ');
  }

  if (payment.month && payment.month.includes('-')) {
    const [yStr, mStr] = payment.month.split('-');
    const monthIndex = parseInt(mStr, 10);
    const monthNamesList = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    if (monthIndex >= 1 && monthIndex <= 12) {
      return monthNamesList[monthIndex - 1];
    }
  }

  return payment.month ? formatMonthLabel(payment.month) : 'Onetime';
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

const fetcher = url => fetch(url).then(r => r.json());

export default function ReportsPage() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === "ADMIN";
  const isManager = currentUser?.role === "MANAGER";
  const canArchive = isAdmin || isManager;

  const [activeTab, setActiveTab] = useState('daily');
  const [dateStr, setDateStr] = useState(new Date().toISOString().slice(0, 10));
  const [monthStr, setMonthStr] = useState(new Date().toISOString().slice(0, 7));
  const { settings } = useSchoolSettings();
  const [paymentToArchive, setPaymentToArchive] = useState(null);

  const currentSessionYear = useMemo(() => {
    const today = new Date();
    return today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  }, []);

  const [selectedSession, setSelectedSession] = useState(currentSessionYear);

  const sessions = useMemo(() => {
    const list = [];
    const startYear = currentSessionYear - 10;
    const endYear = currentSessionYear + 1;
    for (let y = startYear; y <= endYear; y++) {
      const nextYearShort = String(y + 1).slice(-2);
      list.push({
        year: y,
        label: `${y}-${nextYearShort}`
      });
    }
    return list;
  }, [currentSessionYear]);

  const endpoint = activeTab === 'daily' ? `/api/reports/daily?date=${dateStr}&session=${selectedSession}` :
    activeTab === 'monthly' ? `/api/reports/monthly?month=${monthStr}&session=${selectedSession}` :
      `/api/reports/pending?session=${selectedSession}`;

  const { data, isLoading, mutate } = useSWR(endpoint, fetcher);
  const reportData = data?.data;

  const handleArchivePayment = async () => {
    if (!paymentToArchive) return;
    const res = await fetch("/api/payments/" + paymentToArchive, { method: "DELETE" });
    if (res.ok) {
      toast.success("Payment archived");
      await mutate();
    } else {
      const e = await res.json();
      toast.error(e.error || "Archive failed");
    }
    setPaymentToArchive(null);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  // Reset page when tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const totalItems = useMemo(() => {
    if (activeTab === 'pending') {
      return reportData?.students?.length || 0;
    }
    return reportData?.payments?.length || 0;
  }, [reportData, activeTab]);

  const totalPages = useMemo(() => {
    return Math.ceil(totalItems / PAGE_SIZE);
  }, [totalItems]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const paginatedPayments = useMemo(() => {
    if (activeTab === 'pending' || !reportData?.payments) return [];
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    return reportData.payments.slice(startIdx, startIdx + PAGE_SIZE);
  }, [reportData?.payments, currentPage, activeTab]);

  const paginatedStudents = useMemo(() => {
    if (activeTab !== 'pending' || !reportData?.students) return [];
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    return reportData.students.slice(startIdx, startIdx + PAGE_SIZE);
  }, [reportData?.students, currentPage, activeTab]);

  const handleExport = (type) => {
    const val = type === 'daily' ? dateStr : type === 'monthly' ? monthStr : '';
    window.location.href = `/api/reports/export?type=${type}&date=${val}&session=${selectedSession}`;
  };

  const formatIN = (num) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(num || 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Financial Reports</h1>
          <p className="text-sm text-gray-500 mt-1">Track collections and outstanding dues</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Academic Session:</span>
          <select
            value={selectedSession || ""}
            onChange={(e) => setSelectedSession(Number(e.target.value))}
            className="px-4 py-2 bg-blue-50 border border-gray-100 rounded-xl text-xs font-black uppercase text-blue-600 outline-none cursor-pointer"
          >
            {sessions.map(s => (
              <option key={s.year} value={s.year} className="font-bold text-gray-700 bg-white">
                Session {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 pt-4 gap-6 bg-gray-50/50">
          {['daily', 'monthly', 'pending'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-2 text-sm font-semibold capitalize transition-all border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              {tab} Collection
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Controls */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center">
              {activeTab !== 'daily' && <CalendarDays className="text-gray-400 mr-3" />}
              {activeTab === 'daily' && <DatePicker value={dateStr} onChange={setDateStr} className="w-52 text-sm" />}
              {activeTab === 'monthly' && <input type="month" value={monthStr} onChange={e => setMonthStr(e.target.value)} className="border border-gray-300 px-3 py-1.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm text-sm" />}
              {activeTab === 'pending' && <span className="font-semibold text-gray-700">All Outstanding Dues</span>}
            </div>
            <button onClick={() => handleExport(activeTab)} className="flex items-center space-x-2 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 px-4 py-2 rounded-lg font-medium transition border border-green-200">
              <DownloadCloud size={18} /> <span>Export Excel</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center"><div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div></div>
          ) : (
            <>
              {/* Summary Cards for Daily/Monthly */}
              {activeTab !== 'pending' && reportData && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                  {/* Total Collected Card */}
                  <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-800 text-[10px] font-black uppercase tracking-[0.2em]">Total Collected</span>
                      <div className="h-8 w-8 bg-white/80 rounded-lg flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-50">
                        <IndianRupee size={16} />
                      </div>
                    </div>
                    <span className="text-3xl font-black text-emerald-600 mt-2 tracking-tight">{formatIN(reportData.totalCollection)}</span>
                  </div>

                  {/* Cash Card */}
                  <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-blue-800 text-[10px] font-black uppercase tracking-[0.2em]">Cash Receipts</span>
                      <div className="h-8 w-8 bg-white/80 rounded-lg flex items-center justify-center text-blue-600 shadow-sm border border-blue-50">
                        <Banknote size={16} />
                      </div>
                    </div>
                    <span className="text-2xl font-black text-emerald-600 mt-2 tracking-tight">{formatIN(reportData.byMode?.Cash)}</span>
                  </div>

                  {/* UPI Card */}
                  <div className="bg-amber-50/50 border border-amber-100/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-amber-800 text-[10px] font-black uppercase tracking-[0.2em]">UPI Payments</span>
                      <div className="h-8 w-8 bg-white/80 rounded-lg flex items-center justify-center text-amber-600 shadow-sm border border-amber-50">
                        <QrCode size={16} />
                      </div>
                    </div>
                    <span className="text-2xl font-black text-emerald-600 mt-2 tracking-tight">{formatIN(reportData.byMode?.UPI)}</span>
                  </div>

                  {/* Bank Transfer Card */}
                  <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <span className="text-indigo-800 text-[10px] font-black uppercase tracking-[0.2em]">Bank Transfers</span>
                      <div className="h-8 w-8 bg-white/80 rounded-lg flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-50">
                        <CreditCard size={16} />
                      </div>
                    </div>
                    <span className="text-2xl font-black text-emerald-600 mt-2 tracking-tight">{formatIN(reportData.byMode?.['Bank Transfer'])}</span>
                  </div>
                </div>
              )}

              {/* Data Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-[13px] font-sans">
                  <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 text-xs uppercase font-semibold">
                    {activeTab !== 'pending' ? (
                      <tr>
                        <th className="px-4 py-3">Receipt ID</th>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Target</th>
                        <th className="px-4 py-3 text-right">Total</th>
                        <th className="px-4 py-3 text-right">Discount Given</th>
                        <th className="px-4 py-3 text-right">Amount Paid</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="px-4 py-3">Student</th>
                        <th className="px-4 py-3">Roll No</th>
                        <th className="px-4 py-3">Class</th>
                        <th className="px-4 py-3">Mobile</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activeTab !== 'pending' && reportData?.payments?.length === 0 ? (
                      <tr><td colSpan="8" className="text-center py-10 text-gray-500"><Receipt className="mx-auto mb-2 text-gray-300" size={32} />No collections found for this period.</td></tr>
                    ) : activeTab !== 'pending' ? (
                      paginatedPayments?.map(p => (
                        <tr
                          key={p.id}
                          onClick={() => router.push(`/students/${p.student?.id}`)}
                          className="cursor-pointer hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-1.5 font-mono text-[11px] text-gray-400 tracking-tighter">{p.receiptNumber}</td>
                          <td className="px-4 py-1.5 font-bold text-gray-900">{p.student?.fullName}</td>
                          <td className="px-4 py-1.5 text-gray-400 text-[11px]">{new Date(p.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                          <td className="px-4 py-1.5 font-medium text-blue-600/70 text-[11px] uppercase">{formatMonthsRange(p)}</td>
                          <td className="px-4 py-1.5 text-gray-600 font-medium text-right whitespace-nowrap">{formatIN(p.amount)}</td>
                          <td className="px-4 py-1.5 text-amber-600 font-medium text-right whitespace-nowrap">{p.discount > 0 ? formatIN(p.discount) : '-'}</td>
                          <td className="px-4 py-1.5 text-emerald-600 font-medium text-right whitespace-nowrap">+{formatIN(p.amount - p.discount)}</td>
                          <td className="px-4 py-1.5 text-center" onClick={(e) => e.stopPropagation()}>
                             <div className="flex items-center justify-center gap-1.5">
                               <PDFDownloadLink document={<ReceiptPDF payment={p} student={p.student} settings={settings} />} fileName={`Receipt_${p.receiptNumber}.pdf`}>
                                 <button className="h-7 w-7 bg-gray-50 hover:bg-blue-600 hover:text-white rounded-lg text-gray-400 transition-all flex items-center justify-center border border-gray-100 shadow-sm">
                                   <Download size={14} />
                                 </button>
                               </PDFDownloadLink>
                               {canArchive && (
                                 <button
                                   onClick={() => setPaymentToArchive(p.id)}
                                   className="h-7 w-7 bg-gray-50 hover:bg-red-500 hover:text-white rounded-lg text-gray-400 transition-all flex items-center justify-center border border-gray-100 shadow-sm"
                                 >
                                   <Trash2 size={14} />
                                 </button>
                               )}
                             </div>
                           </td>
                        </tr>
                      ))
                    ) : activeTab === 'pending' && reportData?.students?.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-10 text-gray-500"><PieChart className="mx-auto mb-2 text-green-300" size={32} />No pending fees. Everything is clear!</td></tr>
                    ) : (
                      paginatedStudents?.map(s => (
                        <tr
                          key={s.id}
                          onClick={() => router.push(`/students/${s.id}`)}
                          className="cursor-pointer hover:bg-gray-100/30 transition-colors"
                        >
                          <td className="px-4 py-1.5 font-bold text-gray-800">{s.fullName}</td>
                          <td className="px-4 py-1.5 font-mono text-[11px] text-gray-500">{s.admissionNumber}</td>
                          <td className="px-4 py-1.5 text-gray-600">
                            {(() => {
                              const jYear = getJoiningYear(s.admissionNumber);
                              const diff = selectedSession - jYear;
                              return getPromotedClass(s.className, diff);
                            })()}
                          </td>
                          <td className="px-4 py-1.5 text-gray-500">{s.mobile1}</td>
                          <td className="px-4 py-1.5 whitespace-nowrap">
                            <div className="flex flex-col items-start gap-1">
                              {s.isMonthlyPending ? (
                                <Badge status="pending" text="Monthly Pending" />
                              ) : (
                                <Badge status="paid" text="Paid" />
                              )}
                              {s.hasLegacyDue && (
                                <Badge status="due" text="Has Legacy Dues" />
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100 gap-4 mt-4 rounded-xl border border-gray-200">
                  <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center sm:text-left">
                    Showing {((currentPage - 1) * PAGE_SIZE) + 1} to {Math.min(currentPage * PAGE_SIZE, totalItems)} of {totalItems} entries
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                      Page {currentPage} of {totalPages}
                    </div>
                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="px-4 py-2 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <ConfirmModal isOpen={!!paymentToArchive} onClose={() => setPaymentToArchive(null)} onConfirm={handleArchivePayment} title="Void Payment?" message="This record will be moved to the archive." />
    </div>
  );
}
