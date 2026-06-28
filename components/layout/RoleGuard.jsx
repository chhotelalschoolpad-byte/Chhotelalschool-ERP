"use client"
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function RoleGuard({ children, allowedRoles = [] }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        router.push('/dashboard'); // Or a dedicated 403 page
      }
    }
  }, [user, isLoading, router, allowedRoles]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return null;
  }

  return children;
}
