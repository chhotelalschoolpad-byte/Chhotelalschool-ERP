"use client"

import { useState, useMemo, useEffect } from 'react';
import { useStudents, useLateStudents } from '@/hooks/useStudents';
import { useSchoolSettings } from '@/hooks/useSettings';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, IndianRupee, AlertCircle, Settings2, Settings, UserPlus, BarChart3, Eye, Smartphone } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as BarTooltip
} from 'recharts';

const fetcher = url => fetch(url).then(r => r.json());

const fmt = (amt) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amt || 0);

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

export default function Dashboard() {
  const router = useRouter();
  const { total } = useStudents('?limit=1');
  const { students: lateStudents, isLoading: isLateLoading } = useLateStudents();
  
  const [latePage, setLatePage] = useState(1);
  const LATE_PAGE_SIZE = 15;

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

  const totalPages = useMemo(() => {
    return Math.ceil((lateStudents?.length || 0) / LATE_PAGE_SIZE);
  }, [lateStudents]);

  useEffect(() => {
    if (totalPages > 0 && latePage > totalPages) {
      setLatePage(totalPages);
    }
  }, [totalPages, latePage]);

  const paginatedLateStudents = useMemo(() => {
    if (!lateStudents) return [];
    const startIdx = (latePage - 1) * LATE_PAGE_SIZE;
    return lateStudents.slice(startIdx, startIdx + LATE_PAGE_SIZE);
  }, [lateStudents, latePage]);

  const today = new Date().toISOString().slice(0, 10);
  const { data: dailyReport } = useSWR(`/api/reports/daily?date=${today}&session=${selectedSession}`, fetcher);
  const { data: pendingReport } = useSWR(`/api/reports/pending?session=${selectedSession}`, fetcher);

  const todaysCollection = dailyReport?.data?.totalCollection || 0;
  const pendingData = pendingReport?.data;
  const pendingCount = pendingData?.students?.length ?? (Array.isArray(pendingData) ? pendingData.length : 0);
  const totalPreviousDue = pendingData?.totalPreviousDue ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-blue-800 tracking-tight drop-shadow-sm">
            Dashboard
          </h1>
          <p className="text-[10px] font-black uppercase text-gray-400 tracking-[0.2em] mt-1 pl-1">Overview of school operations</p>
        </div>
        <div>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(Number(e.target.value))}
            className="px-4 py-2 rounded-2xl border border-gray-200 text-xs font-black uppercase text-blue-600 bg-blue-50/50 outline-none cursor-pointer shadow-sm hover:bg-blue-50 transition-all"
          >
            {sessions.map(s => (
              <option key={s.year} value={s.year} className="font-bold text-gray-700 bg-white">
                Session {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total Collected (Overall) */}
        <div className="bg-emerald-50/50 rounded-xl shadow-sm p-6 flex items-center border border-emerald-100/50">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mr-4 shrink-0 shadow-sm">
            <IndianRupee className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-800">Total Collected</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(pendingReport?.data?.totalCollectedOverall)}</p>
            <p className="text-[10px] text-emerald-600/60 font-bold uppercase mt-1 tracking-tight">From all students overall</p>
          </div>
        </div>

        {/* Card 2: Total Students */}
        <div className="bg-blue-50/50 rounded-xl shadow-sm p-6 flex items-center border border-blue-100/50">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mr-4 shrink-0 shadow-sm">
            <Users className="w-7 h-7 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800">Total Students</p>
            <p className="text-2xl font-bold text-gray-900">{total || 0}</p>
          </div>
        </div>

        {/* Card 3: Today's Collection */}
        <div className="bg-indigo-50/50 rounded-xl shadow-sm p-6 flex items-center border border-indigo-100/50">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mr-4 shrink-0 shadow-sm">
            <IndianRupee className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-indigo-800">Today's Collection</p>
            <p className="text-2xl font-bold text-gray-900">{fmt(todaysCollection)}</p>
          </div>
        </div>

        {/* Card 4: Monthly Pending */}
        <div className="bg-amber-50/50 rounded-xl shadow-sm p-6 flex items-center border border-amber-100/50">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mr-4 shrink-0 shadow-sm">
            <AlertCircle className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800">Monthly Pending</p>
            <p className="text-2xl font-bold text-gray-900">{pendingReport?.data?.pendingMonthlyCount || 0}</p>
            <p className="text-[10px] text-amber-600/60 font-bold uppercase mt-1 tracking-tight">No payment for current month</p>
          </div>
        </div>
      </div>

      {/* ── Dashboard Charts ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Gender Distribution Pie Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Student Gender Ratio</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pendingReport?.data?.genderStats || []}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={5}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {(pendingReport?.data?.genderStats || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.name === 'Male' ? '#3b82f6' : entry.name === 'Female' ? '#ec4899' : '#9ca3af'}
                      stroke="rgba(255,255,255,0.8)"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <ReTooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 'bold' }}
                />
                <Legend verticalAlign="bottom" height={36} iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Status Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px] flex flex-col">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Payment Status Distribution</h3>
          <div className="flex-1 w-full">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={pendingReport?.data?.statusStats || []} margin={{ top: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6b7280', fontWeight: 600 }} />
                <BarTooltip
                  cursor={{ fill: '#f9fafb' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                  {(pendingReport?.data?.statusStats || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.name.includes('Paid') ? '#10b981' :
                          entry.name.includes('Pending') ? '#f59e0b' : '#ef4444'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────── */}
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/fee-setup" className="bg-white border border-gray-200 rounded-xl p-4 flex items-center hover:bg-blue-50 transition-all shadow-sm group">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors mr-3">
            <Settings2 size={20} />
          </div>
          <span className="font-bold text-gray-800 text-sm">Fee Setup</span>
        </Link>
        <Link href="/students/new" className="bg-white border border-gray-200 rounded-xl p-4 flex items-center hover:bg-emerald-50 transition-all shadow-sm group">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors mr-3">
            <UserPlus size={20} />
          </div>
          <span className="font-bold text-gray-800 text-sm">Add Student</span>
        </Link>
        <Link href="/reports" className="bg-white border border-gray-200 rounded-xl p-4 flex items-center hover:bg-amber-50 transition-all shadow-sm group">
          <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-colors mr-3">
            <BarChart3 size={20} />
          </div>
          <span className="font-bold text-gray-800 text-sm">Reports</span>
        </Link>
        <Link href="/settings" className="bg-white border border-gray-200 rounded-xl p-4 flex items-center hover:bg-indigo-50 transition-all shadow-sm group">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors mr-3">
            <Settings size={20} />
          </div>
          <span className="font-bold text-gray-800 text-sm">Settings</span>
        </Link>
      </div>

      {/* ── Late Fee Reminder Table ───────────────────────────────── */}
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">Late Fee Reminder List</h2>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold tracking-wider">
                <th className="px-6 py-4">Student</th>
                <th className="px-6 py-4">Roll No</th>
                <th className="px-6 py-4">Class</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {isLateLoading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-400">Loading late students...</td>
                </tr>
              ) : lateStudents?.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-3">
                        <span className="text-xl">🎉</span>
                      </div>
                      <p className="font-medium text-gray-900">All caught up!</p>
                      <p className="text-sm mt-1">No students have late fees.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLateStudents?.map((student) => (
                  <tr
                    key={student.id}
                    onClick={() => router.push(`/students/${student.id}`)}
                    className="cursor-pointer hover:bg-gray-50/50 transition-colors border-b border-gray-100 last:border-0"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold uppercase text-sm">
                          {student.fullName.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-[13px] font-bold text-gray-900">{student.fullName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Badge text={student.admissionNumber} /></td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {(() => {
                        const jYear = student.joiningYear || getJoiningYear(student.admissionNumber);
                        const diff = selectedSession - jYear;
                        return getPromotedClass(student.className, diff);
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col items-start gap-1">
                        {student.isMonthlyPending ? (
                          <Badge status="pending" text="Monthly Pending" />
                        ) : (
                          <Badge status="paid" text="Paid" />
                        )}
                        {student.hasLegacyDue && (
                          <Badge status="due" text="Has Legacy Dues" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/students/${student.id}`} className="text-gray-400 hover:text-blue-600 transition-colors bg-gray-50 hover:bg-blue-50 p-2 rounded-lg inline-flex" title="View Profile">
                        <Eye size={18} />
                      </Link>
                      {student.mobile1 && (
                        <Link
                          href={`/messaging?studentId=${student.id}`}
                          className="text-gray-400 hover:text-emerald-600 transition-all bg-gray-50 hover:bg-emerald-50 p-2 rounded-lg inline-flex" title="Open Messaging"
                        >
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.94 3.659 1.437 5.634 1.437h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                        </Link>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100 gap-4">
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-center sm:text-left">
              Showing {((latePage - 1) * LATE_PAGE_SIZE) + 1} to {Math.min(latePage * LATE_PAGE_SIZE, lateStudents.length)} of {lateStudents.length} entries
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={latePage === 1}
                onClick={() => setLatePage(prev => Math.max(1, prev - 1))}
                className="px-4 py-2 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <div className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                Page {latePage} of {totalPages}
              </div>
              <button
                type="button"
                disabled={latePage === totalPages}
                onClick={() => setLatePage(prev => Math.min(totalPages, prev + 1))}
                className="px-4 py-2 border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
