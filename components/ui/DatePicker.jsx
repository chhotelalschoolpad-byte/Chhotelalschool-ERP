"use client"
import { useState, useRef, useEffect, useMemo } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

// Helper to parse date from manual text formats
const parseDateString = (str) => {
  if (!str) return null;
  const cleaned = str.trim();
  
  // 1. DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  let match = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    return validateAndCreateDate(year, month, day);
  }

  // 2. DD/MM/YY, DD-MM-YY, DD.MM.YY (2-digit year)
  match = cleaned.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    let year = parseInt(match[3], 10);
    year = year < 50 ? 2000 + year : 1900 + year;
    return validateAndCreateDate(year, month, day);
  }

  // 3. YYYY-MM-DD, YYYY/MM/DD, YYYY.MM.DD
  match = cleaned.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const day = parseInt(match[3], 10);
    return validateAndCreateDate(year, month, day);
  }

  return null;
};

const validateAndCreateDate = (year, month, day) => {
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() === year && d.getMonth() === month - 1 && d.getDate() === day) {
    return d;
  }
  return null;
};

// Helper to format date as DD/MM/YYYY when user focuses for editing
const formatInputDate = (date) => {
  if (!date) return "";
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

export default function DatePicker({ 
  value, 
  onChange, 
  placeholder = "Select Date",
  className = "",
  label = "",
  minDate,
  maxDate
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [typedValue, setTypedValue] = useState(null);
  const containerRef = useRef(null);

  // Parse current value (YYYY-MM-DD)
  const selectedDate = useMemo(() => {
    if (!value) return null;
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }, [value]);

  // View state (What month/year the calendar is showing)
  const [viewDate, setViewDate] = useState(selectedDate || new Date());

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync viewDate when modal opens or value changes
  useEffect(() => {
    if (isOpen && selectedDate) {
      setViewDate(selectedDate);
    }
  }, [isOpen, selectedDate]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleYearChange = (e) => {
    setViewDate(new Date(parseInt(e.target.value), viewDate.getMonth(), 1));
  };

  const handleDateSelect = (day) => {
    const d = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    onChange(formatted);
    setTypedValue(null);
    setIsOpen(false);
  };

  const formatDate = (date) => {
    if (!date) return "";
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const displayValue = useMemo(() => {
    if (typedValue !== null) return typedValue;
    return selectedDate ? formatDate(selectedDate) : "";
  }, [typedValue, selectedDate]);

  const handleInputChange = (e) => {
    const text = e.target.value;
    setTypedValue(text);
    
    // Attempt to parse text on every change
    const parsed = parseDateString(text);
    if (parsed) {
      const formatted = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
      onChange(formatted);
    }
  };

  const handleFocus = () => {
    setIsOpen(true);
    if (selectedDate) {
      setTypedValue(formatInputDate(selectedDate));
    }
  };

  const handleBlur = (e) => {
    // Delay blur parsing to allow button clicks inside component
    setTimeout(() => {
      const activeEl = document.activeElement;
      if (containerRef.current && containerRef.current.contains(activeEl)) {
        return;
      }
      if (typedValue !== null) {
        const parsed = parseDateString(typedValue);
        if (parsed) {
          const formatted = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
          onChange(formatted);
        } else if (typedValue.trim() === "") {
          onChange("");
        }
        setTypedValue(null);
      }
    }, 150);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const parsed = parseDateString(typedValue || "");
      if (parsed) {
        const formatted = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
        onChange(formatted);
        setTypedValue(null);
        setIsOpen(false);
      } else if (typedValue?.trim() === "") {
        onChange("");
        setTypedValue(null);
        setIsOpen(false);
      }
      e.currentTarget.blur();
    }
  };

  const handleClear = () => {
    onChange("");
    setTypedValue(null);
    setIsOpen(false);
  };

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth();
  const years = Array.from({ length: 130 }, (_, i) => new Date().getFullYear() + 5 - i);

  const grid = useMemo(() => {
    const days = [];
    const firstDay = firstDayOfMonth(currentYear, currentMonth);
    const totalDays = daysInMonth(currentYear, currentMonth);

    // Padding for start of month
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }
    // Days of month
    for (let d = 1; d <= totalDays; d++) {
        days.push(d);
    }
    return days;
  }, [currentYear, currentMonth]);

  const isToday = (day) => {
    const now = new Date();
    return now.getFullYear() === currentYear && now.getMonth() === currentMonth && now.getDate() === day;
  };

  const isSelected = (day) => {
    return selectedDate && 
           selectedDate.getFullYear() === currentYear && 
           selectedDate.getMonth() === currentMonth && 
           selectedDate.getDate() === day;
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="text-[10px] font-black uppercase text-gray-400 tracking-widest px-1 mb-1.5 block">{label}</label>}
      
      <div className="relative group">
        <CalendarIcon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors pointer-events-none z-10 ${isOpen ? 'text-blue-600' : 'text-gray-400'}`} size={16} />
        <input
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={`w-full text-left pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all hover:bg-gray-100 ${isOpen ? 'ring-2 ring-blue-500 border-blue-500 bg-white' : ''} ${!selectedDate && !typedValue ? "text-gray-400" : "text-gray-900"}`}
        />
        {value && (
          <button 
             type="button" 
             onClick={handleClear}
             className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-gray-600 transition-colors z-10"
          >
             <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-2 bg-white border border-gray-100 shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] rounded-[2rem] p-4 animate-in fade-in zoom-in-95 duration-200 origin-top w-72">
          {/* Header */}
          <div className="flex items-center justify-between mb-4 px-2">
            <button type="button" onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-blue-600 transition-all">
              <ChevronLeft size={18} />
            </button>
            <div className="flex items-center gap-1">
               <span className="text-sm font-black text-gray-900">{months[currentMonth]}</span>
            <div className="relative group/year">
               <button 
                 type="button"
                 className="text-sm font-black text-blue-600 hover:underline flex items-center gap-0.5"
                 onClick={() => setIsYearOpen(!isYearOpen)}
               >
                 {currentYear}
               </button>
               {isYearOpen && (
                 <div 
                   className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white border border-gray-100 shadow-2xl rounded-2xl z-[60] w-24"
                   onMouseLeave={() => setIsYearOpen(false)}
                 >
                    <div className="max-h-48 overflow-y-auto py-2 custom-scrollbar">
                      {years.map(y => (
                        <button
                          key={y}
                          type="button"
                          onClick={() => {
                            handleYearChange({ target: { value: y } });
                            setIsYearOpen(false);
                          }}
                          className={`w-full px-4 py-1.5 text-xs font-bold transition-colors ${y === currentYear ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          {y}
                        </button>
                      ))}
                    </div>
                 </div>
               )}
            </div>
            </div>
            <button type="button" onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-blue-600 transition-all">
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-center text-[9px] font-black uppercase text-gray-400 py-1">{d}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {grid.map((day, i) => (
              <div key={i} className="aspect-square">
                {day && (
                  <button
                    type="button"
                    onClick={() => handleDateSelect(day)}
                    className={`w-full h-full rounded-xl text-xs font-bold transition-all flex items-center justify-center ${
                      isSelected(day) 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                        : isToday(day) 
                            ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent hover:border-gray-100'
                    }`}
                  >
                    {day}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between">
             <button 
                type="button"
                onClick={() => {
                  const now = new Date();
                  const formatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
                  onChange(formatted);
                  setTypedValue(null);
                  setIsOpen(false);
                }}
                className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline"
             >
                Today
             </button>
             {selectedDate && (
               <button 
                  type="button"
                  onClick={handleClear}
                  className="text-[10px] font-black text-rose-500 uppercase tracking-widest hover:underline"
               >
                  Clear
               </button>
             )}
          </div>
        </div>
      )}
      
      <style jsx>{`
        /* Hide default browser picker if it still shows */
        input[type="date"]::-webkit-inner-spin-button,
        input[type="date"]::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }
      `}</style>
    </div>
  );
}
