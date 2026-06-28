"use client"

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { useState } from 'react';
import { Eye, EyeOff, XCircle } from 'lucide-react';
import Image from 'next/image';
import { loginSchema, signupSchema } from '@/validations/authSchemas';
import { useEffect } from 'react';

export default function LoginPage() {
  const { login, signup } = useAuth();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);

  const { register, handleSubmit, formState: { errors }, reset, watch } = useForm({
    resolver: zodResolver(isLogin ? loginSchema : signupSchema),
    defaultValues: { role: 'USER' }
  });

  const selectedRole = watch('role');

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    reset();
  };

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError('');
      if (isLogin) {
        await login(data.username, data.password);
      } else {
        await signup(data.username, data.password, data.role, data.secretKey);
      }
    } catch (err) {
      setError(err.message || (isLogin ? 'Login failed' : 'Signup failed'));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105"
        style={{ backgroundImage: "url('/school-bg.jpg')" }}
      >
        <div className="absolute inset-0 bg-blue-900/60 backdrop-blur-[1px]" />
      </div>

      <div className="relative z-10 bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="bg-white/50 p-6 flex flex-col items-center justify-center border-b border-gray-100/50">
          <div className="w-32 h-32 bg-white rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-gray-50 overflow-hidden group hover:scale-105 transition-transform duration-300">
            <img 
              src="/school-logo.png" 
              alt="School Logo" 
              className="w-full h-full object-contain p-0 transform scale-125"
            />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
          <p className="text-xs font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-2 uppercase tracking-wide">
            School Fee Management System
          </p>
        </div>

        {/* Error Toast Modal */}
        {error && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
            <div className="bg-white border-l-4 border-red-500 shadow-xl rounded-lg p-4 flex items-start max-w-sm w-full">
              <XCircle className="w-5 h-5 text-red-500 mr-3 shrink-0" />
              <div className="flex-1 mt-0.5">
                <h3 className="text-sm font-semibold text-gray-900">Authentication Error</h3>
                <p className="text-sm text-gray-600 mt-1">{error}</p>
              </div>
              <button onClick={() => setError('')} className="text-gray-400 hover:text-gray-600 ml-3">
                <span className="sr-only">Dismiss</span>
                &times;
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
            <input
              type="text"
              {...register('username')}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-400 font-normal"
              placeholder="Enter your username"
            />
            {errors.username && <p className="text-red-500 text-xs mt-1.5">{errors.username.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                {...register('password')}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-400 font-normal"
                placeholder={isLogin ? "Enter your password" : "Min 6 characters"}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1.5">{errors.password.message}</p>}
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Select Role</label>
                <div className="grid grid-cols-3 gap-3">
                  {['USER', 'MANAGER', 'ADMIN'].map((r) => (
                    <label 
                      key={r}
                      className={`
                        flex flex-col items-center justify-center py-2 px-1 border-2 rounded-xl cursor-pointer transition-all
                        ${selectedRole === r ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}
                      `}
                    >
                      <input 
                        type="radio" 
                        {...register('role')} 
                        value={r} 
                        className="hidden"
                      />
                      <span className="text-[10px] font-semibold tracking-wider">{r}</span>
                    </label>
                  ))}
                </div>
              </div>

              {(selectedRole === 'MANAGER' || selectedRole === 'ADMIN') && (
                <div className="animate-in zoom-in-95 duration-200">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Secret Phrase</label>
                  <input
                    type="password"
                    {...register('secretKey')}
                    className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder-gray-400 font-normal"
                    placeholder={`Enter ${selectedRole} secret key`}
                  />
                  {errors.secretKey && <p className="text-red-500 text-xs mt-1.5">{errors.secretKey.message}</p>}
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-all focus:ring-4 focus:ring-blue-100 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
            ) : (
              isLogin ? 'Sign In' : 'Sign Up'
            )}
          </button>
          
          <div className="text-center mt-6 border-t border-gray-100 pt-6 text-sm text-gray-600">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button" 
              onClick={toggleMode}
              className="font-semibold text-blue-600 hover:text-blue-800 transition-colors"
            >
              {isLogin ? 'Sign up' : 'Sign in'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
