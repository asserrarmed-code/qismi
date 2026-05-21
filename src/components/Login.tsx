/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { motion } from 'motion/react';
import { dbService, PRE_CREATED_ACCOUNTS } from '../lib/dbService';
import { UserSession } from '../types';
import { User, Lock, GraduationCap, Sparkles, AlertCircle, ArrowLeftRight, UserCheck, BookOpen } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const session = await dbService.login(username, password);
      onLoginSuccess(session);
    } catch (error: any) {
      setErrorMessage(error.message || 'فشلت عملية المصادقة، يرجى التثبت من البيانات.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (acc: typeof PRE_CREATED_ACCOUNTS[0]) => {
    setUsername(acc.username);
    setPassword(acc.password);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] px-4 py-12 select-none" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md bg-white/95 rounded-3xl p-1.5 shadow-2xl border border-sky-100/80 backdrop-blur-md relative"
      >
        {/* Animated decorative sparks for joyful pedagogical feel */}
        <div className="absolute top-2 left-6 text-amber-400 animate-pulse">
          <Sparkles className="h-6 w-6" />
        </div>

        <div className="bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 text-white py-10 px-6 text-center rounded-[22px] shadow-sm relative overflow-hidden">
          {/* Decorative bubble decoration behind */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-sky-300/20 rounded-full blur-lg pointer-events-none" />

          {/* Icon Badge */}
          <div className="mx-auto mb-4 bg-white/95 p-3.5 rounded-2xl w-16 h-16 flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <GraduationCap className="h-10 w-10 text-sky-500" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-wide">بوابة الولوج الموحدة</h1>
          <p className="text-xs text-sky-100 mt-2 font-semibold">
            منصة التدريس الرقمية المدمجة لتدبير الفروض والأنشطة
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 text-red-700 border-r-4 border-red-500 px-4 py-3 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 "
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 tracking-wider">
              اسم المستخدم المعتمد:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-sky-500">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/70 text-sm font-semibold text-slate-800 placeholder:text-slate-400 transition-all duration-200"
                placeholder="مثال: teacher أو student5"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 tracking-wider">
              كلمة المرور الرسمية:
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-sky-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                className="w-full pl-4 pr-11 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/70 text-sm font-sans font-semibold text-slate-800 placeholder:text-slate-400 transition-all duration-200"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-[0.98] text-white font-extrabold py-3.5 px-6 rounded-2xl text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-sky-200/80 disabled:bg-slate-350 disabled:shadow-none flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                <span>جاري التحقق من الهوية التعليمية...</span>
              </>
            ) : (
              <>
                <UserCheck className="h-4 w-4" />
                <span>تسجيل الدخول المباشر للمنصة</span>
              </>
            )}
          </button>
        </form>

        <div className="bg-slate-50/70 p-6 sm:p-8 rounded-[20px] m-1.5 border-t border-slate-100/80">
          <p className="text-xs font-extrabold text-slate-800 mb-4 flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            <BookOpen className="h-4 w-4 text-sky-500" />
            <span>حسابات الولوج السريع المعينة مسبقاً (تجربتي):</span>
          </p>
          <div className="space-y-2.5">
            {PRE_CREATED_ACCOUNTS.map((acc) => (
              <div 
                key={acc.username}
                onClick={() => handleQuickLogin(acc)}
                className="flex items-center justify-between p-3.5 bg-white border border-slate-150 hover:border-sky-400 rounded-2xl text-xs cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-sky-100 select-none"
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-slate-800 text-xs flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    {acc.displayName}
                  </div>
                  <div className="text-slate-500 text-[11px] font-semibold leading-relaxed">
                    المعرف: <span className="font-bold text-sky-600">{acc.username}</span> | الرمز: <span className="font-bold text-sky-600 font-sans">{acc.password}</span>
                  </div>
                </div>
                <div className="text-[9px] tracking-wider bg-sky-50 text-sky-600 px-3 py-1.5 rounded-xl font-bold border border-sky-100 flex items-center gap-1">
                  <ArrowLeftRight className="h-3 w-3" />
                  <span>تلقائي</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
