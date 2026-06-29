"use client"

import { useState } from 'react';
import Modal from './Modal';
import { AlertCircle, Trash2 } from 'lucide-react';

export default function ConfirmCodeModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  requiredCode = "91234",
  confirmText = "Confirm", 
  isDanger = false 
}) {
  const [inputCode, setInputCode] = useState('');

  const handleConfirm = (e) => {
    if (e) e.preventDefault();
    if (inputCode === requiredCode) {
      onConfirm();
      onClose();
    }
  };

  const isMatched = inputCode === requiredCode;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <form onSubmit={handleConfirm} className="flex flex-col items-center text-center p-2">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
          {isDanger ? <Trash2 size={32} /> : <AlertCircle size={32} />}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-4 px-4">{message}</p>
        
        <div className="w-full px-4 mb-6">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 text-left">
            Enter unique code to delete:
          </label>
          <input
            type="text"
            required
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            placeholder="Enter code"
            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-center font-mono text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500 transition-all text-gray-900"
          />
        </div>
        
        <div className="flex w-full gap-3">
          <button 
            type="button"
            onClick={onClose} 
            className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button 
            type="submit"
            disabled={!isMatched}
            className={`flex-1 px-4 py-3 text-white font-semibold rounded-xl transition shadow-sm ${
              isDanger 
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none' 
                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </form>
    </Modal>
  );
}
