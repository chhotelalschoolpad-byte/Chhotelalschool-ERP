"use client"

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';

const AuthContext = createContext(null);

const fetcher = url => fetch(url).then(r => r.json());

export function AuthProvider({ children }) {
  const router = useRouter();
  const { data, error, isLoading } = useSWR('/api/auth/me', fetcher, {
    shouldRetryOnError: false,
    revalidateOnFocus: false
  });

  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    if (!isLoading) {
      if (data?.data) {
        setUser(data.data);
      } else {
        setUser(null);
      }
      setIsInitializing(false);
    }
  }, [data, isLoading]);

  const login = async (username, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    
    const contentType = res.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const result = await res.json();
      if (!res.ok) throw new Error(result.error?.[0]?.message || result.error || 'Login failed');
      setUser(result.data.user);
      router.push('/dashboard');
    } else {
      const text = await res.text();
      console.error('Unexpected response:', text);
      throw new Error(`Server error: ${res.status} ${res.statusText}`);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  const signup = async (username, password, role, secretKey) => {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role, secretKey })
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error[0]?.message || result.error || 'Signup failed');
    
    setUser(result.data.user);
    router.push('/dashboard');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading: isLoading || isInitializing, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
