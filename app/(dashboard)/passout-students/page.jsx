"use client"
import { useState, useEffect } from "react";
import { usePassoutStudents, usePassoutStats } from "@/hooks/usePassoutStudents";
import { Plus, Search, FileDown, Database } from "lucide-react";
import StatsGrid from "./StatsGrid";
import StudentTable from "./StudentTable";
import StudentModal from "./StudentModal";
import StudentProfileModal from "./StudentProfileModal";
import toast from "react-hot-toast";
import { useDebounce } from "use-debounce";
import CustomSelect from "@/components/ui/CustomSelect";
import ConfirmCodeModal from "@/components/ui/ConfirmCodeModal";

export default function PassoutPage() {
  const [academicYear, setAcademicYear] = useState("all");
  const [className, setClassName] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const [activeFilter, setActiveFilter] = useState("all");
  const [tcFilter, setTcFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [booksFilter, setBooksFilter] = useState("all");
  const [uniformFilter, setUniformFilter] = useState("all");

  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [deleteStudentId, setDeleteStudentId] = useState(null);

  // Profile modal state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileStudent, setProfileStudent] = useState(null);

  const limit = 20;

  useEffect(() => {
    setPage(1);
  }, [academicYear, className, debouncedSearch, activeFilter, tcFilter, resultFilter, booksFilter, uniformFilter]);

  const queryParams = `?academicYear=${academicYear}&className=${className}&search=${debouncedSearch}&filter=${activeFilter}&tcTaken=${tcFilter}&resultCollected=${resultFilter}&booksPaid=${booksFilter}&uniformPaid=${uniformFilter}&page=${page}&limit=${limit}`;
  const { students, total, isLoading, mutate: mutateList } = usePassoutStudents(queryParams);
  const { stats, mutate: mutateStats } = usePassoutStats(`?academicYear=${academicYear}&className=${className}`);

  const handleSave = async (formData) => {
    try {
      const url = editingStudent ? `/api/passout-students/${editingStudent.id}` : '/api/passout-students';
      const method = editingStudent ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) throw new Error('Failed to save');

      toast.success(editingStudent ? 'Record updated' : 'Student added');
      setIsModalOpen(false);
      setEditingStudent(null);
      mutateList();
      mutateStats();
    } catch (error) {
      toast.error('Error saving record');
    }
  };

  const handleDelete = (id) => {
    setDeleteStudentId(id);
  };

  const executeDelete = async () => {
    if (!deleteStudentId) return;
    try {
      const res = await fetch(`/api/passout-students/${deleteStudentId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      toast.success('Record deleted');
      mutateList();
      mutateStats();
    } catch (error) {
      toast.error('Error deleting record');
    }
  };

  const handleExport = (format) => {
    const exportUrl = `/api/passout-students/export?format=${format}&academicYear=${academicYear}&className=${className}&search=${debouncedSearch}&filter=${activeFilter}&tcTaken=${tcFilter}&resultCollected=${resultFilter}&booksPaid=${booksFilter}&uniformPaid=${uniformFilter}`;
    window.location.href = exportUrl;
  };

  const handleRowClick = (student) => {
    setProfileStudent(student);
    setIsProfileModalOpen(true);
  };

  const academicYears = (() => {
    const years = ["all"];
    const currentYear = new Date().getFullYear();
    // Generate from current year down to 20 years ago
    for (let i = 0; i <= 20; i++) {
        const year = currentYear - i;
        years.push(`${year}-${String(year + 1).slice(2)}`);
    }
    return years;
  })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Database className="text-blue-600" />
            Passout Students
          </h1>
          <p className="text-sm text-gray-500 mt-1 uppercase font-black tracking-widest text-[10px]">
            Manual registry for graduated students and alumni
          </p>
        </div>
        <button
          onClick={() => {
            setEditingStudent(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-200 gap-2"
        >
          <Plus size={18} /> Add Student Record
        </button>
      </div>

      <StatsGrid 
        stats={stats} 
        activeFilter={activeFilter} 
        setActiveFilter={setActiveFilter} 
      />

      {/* Granular Filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
        <FilterSelect label="TC Status" value={tcFilter} onChange={setTcFilter} options={[{v:'all', l:'All TC'}, {v:'true', l:'Taken'}, {v:'false', l:'Not Taken'}]} />
        <FilterSelect label="Result" value={resultFilter} onChange={setResultFilter} options={[{v:'all', l:'All Results'}, {v:'true', l:'Collected'}, {v:'false', l:'Not Collected'}]} />
        <FilterSelect label="Books" value={booksFilter} onChange={setBooksFilter} options={[{v:'all', l:'All Books'}, {v:'true', l:'Paid'}, {v:'false', l:'Not Paid'}]} />
        <FilterSelect label="Uniform" value={uniformFilter} onChange={setUniformFilter} options={[{v:'all', l:'All Uniforms'}, {v:'true', l:'Paid'}, {v:'false', l:'Not Paid'}]} />
      </div>

      {/* Filters & Actions */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center w-full lg:w-auto">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search by student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>

          <CustomSelect 
            className="min-w-[180px]"
            value={academicYear}
            onChange={setAcademicYear}
            options={[
              { v: "all", l: "All Academic Years" },
              ...academicYears.filter(y => y !== 'all').map(y => ({ v: y, l: y }))
            ]}
          />

          <input
            type="text"
            placeholder="Filter by Class..."
            className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
            value={className === 'all' ? '' : className}
            onChange={(e) => setClassName(e.target.value || 'all')}
          />
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <button
            onClick={() => handleExport('excel')}
            className="flex-1 lg:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl text-sm font-bold transition-all gap-2"
          >
            <FileDown size={18} /> Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex-1 lg:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-sm font-bold transition-all gap-2"
          >
            <FileDown size={18} /> PDF
          </button>
        </div>
      </div>

      <StudentTable 
        students={students} 
        isLoading={isLoading}
        page={page}
        setPage={setPage}
        total={total}
        limit={limit}
        onEdit={(s) => {
          setEditingStudent(s);
          setIsModalOpen(true);
        }}
        onDelete={handleDelete}
        onRowClick={handleRowClick}
      />

      <StudentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        student={editingStudent}
      />

      <StudentProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => {
          setIsProfileModalOpen(false);
          setProfileStudent(null);
        }}
        student={profileStudent}
      />

      <ConfirmCodeModal
        key={deleteStudentId}
        isOpen={!!deleteStudentId}
        onClose={() => setDeleteStudentId(null)}
        onConfirm={executeDelete}
        title="Permanently Delete Student Record?"
        message="This action is completely irreversible. The passout student record will be permanently deleted from the registry."
        requiredCode="91234"
        confirmText="Delete Record"
        isDanger={true}
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <CustomSelect 
      label={label}
      value={value}
      onChange={onChange}
      options={options}
    />
  );
}
