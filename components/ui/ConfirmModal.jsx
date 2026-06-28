import Modal from './Modal';
import { AlertCircle, Trash2 } from 'lucide-react';

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", isDanger = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="flex flex-col items-center text-center p-2">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${isDanger ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
          {isDanger ? <Trash2 size={32} /> : <AlertCircle size={32} />}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-500 mb-6 px-4">{message}</p>
        
        <div className="flex w-full gap-3">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button 
            onClick={() => { onConfirm(); onClose(); }} 
            className={`flex-1 px-4 py-3 text-white font-semibold rounded-xl transition shadow-sm ${isDanger ? 'bg-red-600 hover:bg-red-700 shadow-red-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}
