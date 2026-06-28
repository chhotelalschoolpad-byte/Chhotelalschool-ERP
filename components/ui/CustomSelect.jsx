"use client"
import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export default function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder = "Select Option",
  className = "",
  label = ""
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.v === value || opt.value === value);
  const displayLabel = selectedOption ? (selectedOption.l || selectedOption.label) : placeholder;

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 mb-1.5 block">{label}</label>}
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-gray-100 ${isOpen ? 'ring-2 ring-blue-500 border-blue-500 bg-white' : ''}`}
      >
        <span className={!selectedOption ? "text-gray-400" : "text-gray-900"}>{displayLabel}</span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-500' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top">
          <ul className="max-h-56 overflow-y-auto py-2 px-1 custom-scrollbar">
            {options.map((opt) => {
              const optValue = opt.v !== undefined ? opt.v : opt.value;
              const optLabel = opt.l || opt.label;
              const isSelected = optValue === value;

              return (
                <li key={optValue}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(optValue);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm rounded-xl transition-colors text-left ${isSelected ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <span>{optLabel}</span>
                    {isSelected && <Check size={14} className="text-blue-600" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
