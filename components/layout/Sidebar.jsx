"use client"
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useSchoolSettings } from '@/hooks/useSettings';
import {
  LayoutDashboard, Users, UserPlus, Settings2,
  CreditCard, MessageCircle, BarChart3, Settings, LogOut, Menu, X, ArchiveX, GraduationCap, CloudUpload, Download
} from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Admission Form', href: '/students/new', icon: UserPlus },
  { name: 'Passout Students', href: '/passout-students', icon: GraduationCap },
  { name: 'Fee Setup', href: '/fee-setup', icon: Settings2 },
  { name: 'Messaging', href: '/messaging', icon: MessageCircle },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
  { name: 'Archived Payments', href: '/archived-payments', icon: ArchiveX },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { settings } = useSchoolSettings();
  const [isOpen, setIsOpen] = useState(false);

  const handleDownloadLocal = () => {
    toast.loading('Generating local database backup ZIP...', { id: 'local-backup', duration: 4000 });
    window.location.href = '/api/backup/generate';
  };

  const schoolName = settings?.schoolName || 'School System';

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50 flex items-center justify-between px-4">
        <div className="flex items-center">
          {settings?.logoBase64 ? (
            <img src={settings.logoBase64} alt="Logo" className="h-10 w-auto mr-3 rounded" />
          ) : (
            <img src="/school-logo.png" alt="Logo" className="h-10 w-10 mr-3 rounded shrink-0 object-contain" />
          )}
          <span className="font-semibold text-gray-800 text-lg line-clamp-1">{schoolName}</span>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-gray-500 hover:text-gray-700">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setIsOpen(false)}></div>
      )}

      {/* Sidebar Content */}
      <div className={`${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:static top-0 left-0 z-50 h-screen w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ease-in-out shrink-0`}>

        {/* Logo Area */}
        <div className="h-24 flex items-center px-6 border-b border-gray-100 bg-white md:bg-transparent mt-16 md:mt-0">
          {settings?.logoBase64 ? (
            <img src={settings.logoBase64} alt="Logo" className="h-14 w-auto mr-3 rounded transition-transform hover:scale-110 duration-300 cursor-pointer" />
          ) : (
            <img src="/school-logo.png" alt="Logo" className="h-14 w-14 mr-3 rounded shrink-0 object-contain transition-transform hover:scale-110 duration-300 cursor-pointer" />
          )}
          <span className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
            {schoolName}
          </span>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <Icon className={`mr-3 h-5 w-5 shrink-0 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                {item.name}
              </Link>
            );
          })}
          
          {user?.role === 'ADMIN' && (
            <button
              onClick={handleDownloadLocal}
              className="w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors cursor-pointer"
            >
              <Download className="mr-3 h-5 w-5 shrink-0 text-gray-400" />
              Download Backup
            </button>
          )}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-gray-100 pb-24 md:pb-4">
          <div className="flex items-center mb-4 px-2">
            <div className="h-9 w-9 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.username || 'User'}</p>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {user?.role || 'USER'}
              </span>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-gray-400 shrink-0" />
            Logout
          </button>
        </div>
      </div>

    </>
  );
}
