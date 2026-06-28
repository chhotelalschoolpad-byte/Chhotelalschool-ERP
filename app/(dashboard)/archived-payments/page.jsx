"use client"

import { useState } from 'react';
import useSWR from 'swr';
import { ArchiveX, Download, ArrowLeft, ArrowRight, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ConfirmModal from '@/components/ui/ConfirmModal';

const fetcher = url => fetch(url).then(r => r.json());

export default function ArchivedPaymentsPage() {
  const [page, setPage] = useState(1);
  const limit = 20;
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const { data, error, isLoading, mutate } = useSWR(`/api/payments/deleted?page=${page}&limit=${limit}`, fetcher, {
    keepPreviousData: true
  });

  const [exporting, setExporting] = useState(false);

  const handleExportAll = async () => {
    try {
      setExporting(true);
      const res = await fetch(`/api/payments/deleted?page=1&limit=0`);
      const payload = await res.json();
      
      if (!payload.data || payload.data.length === 0) {
        toast.error("No archived payments to export.");
        return;
      }

      // Format for Excel
      const excelData = payload.data.map(item => {
        const snap = item.paymentSnapshot;
        return {
          "Student ID": item.student?.admissionNumber || snap.admissionNumber,
          "Student Name": item.student?.fullName || 'Deleted',
          "Class": item.student?.className || '-',
          "Receipt Number": snap.receiptNumber,
          "Fee Type": snap.feeType,
          "Amount": snap.amount,
          "Payment Mode": snap.paymentMode,
          "Deleted At": new Date(item.deletedAt).toLocaleString(),
          "Deleted By": item.deletedBy || 'System',
          "Auto Delete Scheduled": new Date(item.autoDeleteAt).toLocaleDateString()
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Deleted Payments");
      
      XLSX.writeFile(workbook, `Archived_Payments_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
      toast.success("Excel exported successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export to Excel.");
    } finally {
      setExporting(false);
    }
  };

  const handleDeletePermanent = async () => {
    if (!deleteConfirmId) return;
    try {
      const res = await fetch(`/api/payments/deleted/${deleteConfirmId}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete record');
      }
      toast.success("Archived payment deleted permanently.");
      mutate();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to delete archived payment.");
    } finally {
      setDeleteConfirmId(null);
    }
  };

  if (error) return <div className="p-6 text-red-500 text-center font-medium">Failed to load archived payments. Please try again.</div>;

  const payments = data?.data || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight flex items-center">
            <ArchiveX className="w-6 h-6 mr-2 text-rose-600" />
            Archived Payments
          </h1>
          <p className="text-sm text-gray-500 mt-1">Audit log of intentionally deleted payment receipts.</p>
        </div>
        
        <button
          onClick={handleExportAll}
          disabled={exporting || (payments.length === 0 && !isLoading)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center disabled:opacity-50"
        >
          {exporting ? (
            <span className="w-4 h-4 mr-2 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          {exporting ? 'Compiling...' : 'Export All to Excel'}
        </button>
      </div>

      {/* Auto-Purge banner removed */}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Receipt Info</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Student</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deleted By</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading && payments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                       <span className="w-5 h-5 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></span>
                       <span>Loading records...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                    <div className="flex justify-center items-center space-x-2">
                      <ArchiveX className="w-5 h-5 text-gray-400" />
                      <span>No archived payments found.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                payments.map((log) => {
                  const snap = log.paymentSnapshot;
                  return (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">{snap.receiptNumber}</div>
                        <div className="text-xs text-gray-500">{snap.feeType} • {snap.month || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{log.student?.fullName || 'Unknown'}</div>
                        <div className="text-xs text-gray-500">Class {log.student?.className || '-'} • Roll: {log.student?.admissionNumber || snap.admissionNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-semibold text-gray-900">₹{snap.amount}</div>
                        <div className="text-xs text-gray-500">{snap.paymentMode}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-xs text-gray-900">By: <span className="font-semibold">{log.deletedBy}</span></div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => setDeleteConfirmId(log.id)}
                          className="text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 p-2 rounded-lg inline-flex items-center justify-center transition-colors"
                          title="Permanently Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Logic */}
        {!isLoading && totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing page <span className="font-semibold">{page}</span> of <span className="font-semibold">{totalPages}</span>
            </p>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Prev
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center"
              >
                Next <ArrowRight className="w-4 h-4 ml-1" />
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={handleDeletePermanent}
        title="Permanently Delete Record?"
        message="This action is irreversible. The archived payment record will be permanently deleted from the database."
        confirmText="Delete Permanently"
        isDanger={true}
      />
    </div>
  );
}
