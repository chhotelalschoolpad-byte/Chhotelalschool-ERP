import Sidebar from '@/components/layout/Sidebar';
import RoleGuard from '@/components/layout/RoleGuard';

export default function DashboardLayout({ children }) {
  return (
    <RoleGuard>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto content-area pt-16 md:pt-0">
          <div className="p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </RoleGuard>
  );
}
