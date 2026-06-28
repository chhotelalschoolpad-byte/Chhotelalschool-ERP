"use client"

import { useStudents, useStudent } from '@/hooks/useStudents';
import { useSchoolSettings, useSystemSettings } from '@/hooks/useSettings';
import { useState, useEffect, useMemo } from 'react';
import Badge from '@/components/ui/Badge';
import { Search, MonitorSmartphone, MessageSquare, Smartphone, MessagesSquare, Users, Eye, MessageCircle, User, CheckCircle, ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import toast from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

const TEMPLATES = {
  feeReminder: "आदरणीय अभिभावक, {Name} की {Month} माह की फीस ₹{Amount} अभी तक जमा नहीं हुई है। कृपया विलंब से बचने हेतु शीघ्र भुगतान करें। — {SchoolName}",
  admissionConfirmation: "आदरणीय अभिभावक, क्या आप {Name} का {Class} में {SchoolName} में प्रवेश लेना चाहते हैं? कृपया अपनी सहमति की पुष्टि करें। धन्यवाद।",
  examNotice: "प्रिय अभिभावक, {Class} की परीक्षाएं आने वाली हैं। परीक्षा शुल्क ₹{ExamFee} है। कृपया अंतिम तिथि से पहले भुगतान करें। धन्यवाद! — {SchoolName}",
  custom: ""
};

export default function MessagingPage() {
  const searchParams = useSearchParams();
  const studentIdParam = searchParams.get('studentId');
  const monthParam = searchParams.get('month');
  const monthYmParam = searchParams.get('monthYm');
  const amountParam = searchParams.get('amount');

  const { student: fullStudent, isLoading: isStudentLoading } = useStudent(studentIdParam);
  const { settings: schoolSettings } = useSchoolSettings();
  
  const [template, setTemplate] = useState('feeReminder');
  const [customMsg, setCustomMsg] = useState(TEMPLATES.feeReminder);
  const [showPreview, setShowPreview] = useState(false);

  // 1. Auto-detect first pending month if not provided in URL
  const autoDetectDues = useMemo(() => {
    if (isStudentLoading || !fullStudent) return null;

    const payments = fullStudent.payments || [];
    const admDate = new Date(fullStudent.admissionDate || fullStudent.createdAt);
    const start = new Date(admDate.getFullYear(), admDate.getMonth(), 1);
    const today = new Date();
    
    // Find latest range to check
    const latestPaymentDate = payments.reduce((latest, p) => {
        const [y, m] = p.month.split('-').map(Number);
        const d = new Date(y, m-1, 1);
        return d > latest ? d : latest;
    }, today);
    
    const end = latestPaymentDate > today ? latestPaymentDate : today;
    const endBound = new Date(end.getFullYear(), end.getMonth(), 1);

    let curr = new Date(start.getFullYear(), start.getMonth(), 1);
    while (curr <= endBound) {
      const ym = `${curr.getFullYear()}-${String(curr.getMonth() + 1).padStart(2, "0")}`;
      const isPaid = payments.some(p => p.month === ym && p.isMonthlyPaid && p.status === 'SUCCESS');
      const isPastOrCurrent = curr <= new Date(today.getFullYear(), today.getMonth(), 1);

      if (!isPaid && isPastOrCurrent) {
        return {
          ym,
          label: curr.toLocaleString('default', { month: 'long', year: 'numeric' }),
          // Note: In a real app we'd fetch the actual fee for this student's class, 
          // but for now we follow the existing code's fallback logic.
          amount: '500' 
        };
      }
      curr.setMonth(curr.getMonth() + 1);
    }
    return null; // All up to date
  }, [fullStudent, isStudentLoading]);

  // 2. Check if the current month is paid (useful for students on the "Paid" list)
  const isCurrentMonthPaid = useMemo(() => {
    if (isStudentLoading || !fullStudent) return false;
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const studentPayments = fullStudent.payments || [];
    return studentPayments.some(p => 
      p.month === currentYM && 
      p.isMonthlyPaid === true && 
      p.status === 'SUCCESS'
    );
  }, [fullStudent, isStudentLoading]);

  // 3. Resolve finalized values (URL params take precedence)
  const resolvedMonthYm    = monthYmParam || autoDetectDues?.ym;
  const resolvedMonthLabel = monthParam   || autoDetectDues?.label || new Date().toLocaleString('default', { month: 'long', year: 'numeric' });
  const resolvedAmount     = amountParam  || autoDetectDues?.amount || '500';

  // 4. Check if already paid for the resolved month
  const isPaid = useMemo(() => {
    if (isStudentLoading || !fullStudent) return false;
    
    // If we have a specific month to check, check its status
    if (resolvedMonthYm) {
      const studentPayments = fullStudent.payments || [];
      const paidAgainstResolved = studentPayments.some(p => 
        p.month === resolvedMonthYm && 
        p.isMonthlyPaid === true && 
        p.status === 'SUCCESS'
      );
      if (paidAgainstResolved) return true;
    }
    
    // Safety check for students on the "Paid" list (even if auto-detect found an old gap)
    // If no specific month was requested via URL and the current month is paid, 
    // we block the fee reminder to respect the "Paid" status seen in lists.
    if (!monthYmParam && isCurrentMonthPaid) {
      return true;
    }

    // If auto-detection found NO dues at all
    if (!monthYmParam && autoDetectDues === null) {
      return true; 
    }

    // 5. Explicit Exemption Check
    if (fullStudent.isFeeExempt) return true;

    return false;
  }, [fullStudent, resolvedMonthYm, autoDetectDues, isCurrentMonthPaid, isStudentLoading]);

  const handleTemplateChange = (t) => {
    setTemplate(t);
    setCustomMsg(TEMPLATES[t]);
  };

  const generateMessage = (student) => {
    if (!student) return "[Select Student]";
    let msg = customMsg;
    msg = msg.replace(/{Name}/g, student?.fullName || '[Name]');

    // Use resolved values
    msg = msg.replace(/{Month}/g, resolvedMonthLabel);
    msg = msg.replace(/{Amount}/g, resolvedAmount);

    msg = msg.replace(/{SchoolName}/g, schoolSettings?.schoolName || '[School Name]');
    msg = msg.replace(/{Class}/g, student?.className || '[Class]');
    msg = msg.replace(/{RollNo}/g, student?.admissionNumber || '[Roll No]');
    msg = msg.replace(/{ExamFee}/g, '200' /* Placeholder for demo */);
    return msg;
  };

  const handleWhatsAppSend = () => {
    if (!fullStudent) return toast.error('No student selected.');
    if (!fullStudent.mobile1) return toast.error('No mobile number found for this student.');
    if (isPaid && template === 'feeReminder') return toast.error('Fee already paid for this month.');

    const text = encodeURIComponent(generateMessage(fullStudent));
    window.open(`https://wa.me/91${fullStudent.mobile1}?text=${text}`, '_blank');
    toast.success('WhatsApp chat opened!');
  };

  return (
    <div className="flex flex-col gap-6 h-[calc(100vh-8rem)] max-w-4xl mx-auto">

      {/* Message Compose Panel */}
      <div className="w-full flex flex-col h-full bg-white rounded-[2.5rem] shadow-xl shadow-gray-100 border border-gray-100 overflow-hidden">
        <div className="p-8 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-100">
              <MessageSquare size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 leading-tight">Compose Message</h2>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Connect with Guardian</p>
            </div>
          </div>

          {fullStudent && (
             <Link 
               href={`/students/${fullStudent.id}`}
               className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm hover:border-blue-300 transition-all group"
             >
              <div className="h-8 w-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-black text-xs group-hover:bg-blue-600 group-hover:text-white transition-colors">
                {fullStudent.fullName?.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black uppercase text-gray-400 flex items-center gap-1">Recipient <ExternalLink size={8} /></p>
                <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{fullStudent.fullName}</p>
              </div>
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">

          {!fullStudent && !studentIdParam && !isStudentLoading && (
            <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl text-amber-700 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="h-10 w-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0 mt-1"><User size={20} /></div>
              <div>
                <p className="font-black uppercase text-xs tracking-widest mb-1">No Recipient Selected</p>
                <p className="text-sm font-medium opacity-80">Please return to a student profile and click the "Message" button to begin composition.</p>
              </div>
            </div>
          )}

          {fullStudent && fullStudent.isFeeExempt && template === 'feeReminder' && (
            <div className="p-6 bg-blue-50 border border-blue-100 rounded-3xl text-blue-700 flex items-start gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0 mt-1"><Zap size={20} className="fill-blue-500" /></div>
              <div>
                <p className="font-black uppercase text-xs tracking-widest mb-1">Fee Exempted</p>
                <p className="text-sm font-bold">This student is marked as Fee Exempt. Reminders for monthly dues are disabled for this account.</p>
              </div>
            </div>
          )}

          {fullStudent && !fullStudent.isFeeExempt && isPaid && template === 'feeReminder' && (
            <div className="p-6 bg-rose-50 border border-rose-100 rounded-3xl text-rose-700 flex items-start gap-4 animate-in slide-in-from-top-2 duration-300">
              <div className="h-10 w-10 bg-rose-100 rounded-xl flex items-center justify-center shrink-0 mt-1"><AlertTriangle size={20} /></div>
              <div>
                <p className="font-black uppercase text-xs tracking-widest mb-1">Payment Detected</p>
                <p className="text-sm font-bold">This student has already paid the fee for {monthParam || 'this month'}. Sending a reminder is not recommended.</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-[0.2em] ml-1">Message Template</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.keys(TEMPLATES).map(t => (
                  <button
                    key={t}
                    onClick={() => handleTemplateChange(t)}
                    className={`px-4 py-3 rounded-2xl border-2 font-bold text-xs transition-all uppercase tracking-widest ${template === t ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-100' : 'bg-gray-50 border-gray-50 text-gray-400 hover:bg-gray-100 hover:border-gray-200'
                      }`}
                  >
                    {t.replace(/([A-Z])/g, ' $1').trim()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3 ml-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Message Body</label>
                <span className="text-[10px] text-gray-300 font-bold">{customMsg.length} / 1000</span>
              </div>
              <textarea
                value={customMsg}
                onChange={(e) => setCustomMsg(e.target.value)}
                readOnly={template !== 'custom'}
                rows="6"
                className={`w-full px-6 py-4 border-2 rounded-[2rem] text-sm font-medium focus:outline-none transition-all resize-none shadow-inner ${template !== 'custom'
                  ? 'bg-gray-50 border-gray-50 text-gray-500'
                  : 'bg-white border-blue-100 focus:border-blue-500 text-gray-900'
                  }`}
                placeholder="Enter your message here..."
              ></textarea>
              {template !== 'custom' && (
                <p className="text-[10px] font-bold text-blue-500 mt-2 ml-1 flex items-center gap-1.5 grayscale opacity-60">
                  <Eye size={12} /> Select "Custom" to manually edit the message
                </p>
              )}
            </div>

            <div>
              <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-[0.2em] ml-1 text-center">Live Preview Visualization</label>
              <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-8 relative shadow-2xl shadow-emerald-100 group overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform duration-700"><MessageCircle size={120} /></div>
                <p className="text-white text-lg font-bold leading-relaxed relative z-10 whitespace-pre-wrap italic opacity-90">
                  "{generateMessage(fullStudent)}"
                </p>
                <div className="mt-8 pt-6 border-t border-white/20 relative z-10 flex justify-between items-center">
                  <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em]">Sent via School CMS</p>
                  <div className="flex gap-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-white/40" />
                    <div className="h-1.5 w-4 rounded-full bg-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 border-t border-gray-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleWhatsAppSend}
            disabled={isStudentLoading || !fullStudent || (isPaid && template === 'feeReminder')}
            className={`w-full text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-95 uppercase tracking-widest text-sm flex items-center justify-center gap-3 ${
              isStudentLoading || !fullStudent || (isPaid && template === 'feeReminder')
                ? 'bg-gray-300 cursor-not-allowed shadow-none'
                : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-100'
            }`}
          >
            {isStudentLoading ? <Loader2 className="animate-spin" size={20} /> : (fullStudent?.isFeeExempt && template === 'feeReminder' ? <Zap size={20} className="fill-blue-400" /> : isPaid && template === 'feeReminder' ? <Badge status="paid" /> : <MessageCircle size={20} />)} 
            {isStudentLoading ? 'LOADING RECIPIENT...' : (fullStudent?.isFeeExempt && template === 'feeReminder' ? 'STUDENT IS EXEMPT' : isPaid && template === 'feeReminder' ? 'FEE ALREADY PAID' : 'Launch WhatsApp')}
          </button>
          <button
            onClick={() => setShowPreview(true)}
            disabled={isStudentLoading || !fullStudent}
            className="w-full bg-gray-900 text-white font-black py-4 rounded-2xl hover:bg-black shadow-xl shadow-gray-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 uppercase tracking-widest text-sm"
          >
            <MonitorSmartphone size={20} /> Simulate Delivery
          </button>
        </div>
      </div>

      <Modal isOpen={showPreview} onClose={() => setShowPreview(false)} title="Delivery Simulation">
        <div className="space-y-6">
          <div className="bg-gray-100 rounded-3xl p-6 relative border-l-8 border-blue-500">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">Incoming Message</p>
            <p className="text-blue-600 font-black text-xs mb-2">{fullStudent?.fullName} ({fullStudent?.className})</p>
            <p className="text-sm font-bold text-gray-800 leading-relaxed italic">"{generateMessage(fullStudent)}"</p>
            <p className="text-[9px] font-black text-gray-400 text-right mt-6">NOW • {schoolSettings?.schoolName || 'School CMS'}</p>
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl flex items-center gap-3 border border-blue-100">
            <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-blue-600 shadow-sm shrink-0"><CheckCircle size={20} /></div>
            <p className="text-xs font-bold text-blue-700">This simulation ensures the message formatting and placeholders are correctly resolved before actual transmission.</p>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
          <button className="px-8 py-3 bg-gray-900 text-white rounded-xl font-black uppercase text-xs tracking-widest hover:bg-black transition-all" onClick={() => setShowPreview(false)}>Confirm & Dismiss</button>
        </div>
      </Modal>

    </div>
  );
}
