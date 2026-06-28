import { AuthProvider } from '@/context/AuthContext';
import ToastProvider from '@/components/ui/ToastProvider';
import { Inter, Poppins } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'], 
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-inter'
});

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-poppins'
});

import { prisma } from '@/lib/prisma';

export async function generateMetadata() {
  const settings = await prisma.schoolSettings.findFirst();
  const schoolName = settings?.schoolName || 'School Management System';
  
  return {
    title: schoolName,
    description: `Official management portal for ${schoolName}`,
    icons: {
      icon: '/school-logo.png',
      apple: '/school-logo.png',
    }
  };
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="bg-gray-50 text-gray-900 antialiased selection:bg-blue-100 selection:text-blue-900">
        <AuthProvider>
          {children}
        </AuthProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
