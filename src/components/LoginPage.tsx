/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent, useEffect } from 'react';
import { motion } from 'motion/react';
import { dbService } from '../lib/dbService';
import { UserSession } from '../types';
import { 
  User, 
  Lock, 
  GraduationCap, 
  Sparkles, 
  AlertCircle, 
  UserCheck, 
  ShieldCheck, 
  CheckCircle,
  FileText,
  TrendingUp,
  Clock
} from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (session: UserSession) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (!username.trim() || !password.trim()) {
        throw new Error('الرجاء إدخال اسم المستخدم وكلمة المرور للولوج.');
      }
      const session = await dbService.login(username, password);
      onLoginSuccess(session);
    } catch (error: any) {
      setErrorMessage(error.message || 'بيانات الولوج غير صحيحة أو الحساب غير مسجل حالياً.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] px-4 py-8 lg:py-12 select-none" dir="rtl">
      
      {/* Outer Card with glass effect */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }} 
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-xl bg-white/95 rounded-[32px] p-2 shadow-2xl border border-sky-100/90 backdrop-blur-md relative"
      >
        {/* Animated decorative sparks for joyful pedagogical feel */}
        <div className="absolute top-4 left-8 text-amber-400 animate-pulse">
          <Sparkles className="h-6 w-6" />
        </div>

        {/* 1. Introductory Professional Header */}
        <div className="bg-gradient-to-br from-indigo-600 via-blue-600 to-sky-500 text-white py-12 px-6 sm:px-8 text-center rounded-[26px] shadow-md relative overflow-hidden">
          {/* Decorative back blur */}
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-sky-300/20 rounded-full blur-xl pointer-events-none" />

          {/* Icon Badge */}
          <div className="mx-auto mb-4 bg-white/95 p-3.5 rounded-2xl w-16 h-16 flex items-center justify-center shadow-lg transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <GraduationCap className="h-10 w-10 text-blue-600" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mb-2">
            منصة التميز التعليمية الموحدة
          </h1>
          <p className="text-xs sm:text-sm text-sky-100 max-w-md mx-auto leading-relaxed font-bold">
            الفضاء الرقمي الإداري المتكامل لإدارة الحصص، رصد غياب وتأخر المتعلمين، وتقييم نتائج الفروض الدراسية للمستويين الخامس والسادس ابتدائي.
          </p>
        </div>

        {/* 2. Professional Features Showcase Section */}
        <div className="p-6 sm:p-8 bg-slate-50/50 border-b border-slate-100 rounded-b-none rounded-3xl grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          <div className="bg-white border border-slate-200/50 p-4 rounded-2xl flex items-start gap-3">
            <div className="p-1 px-2.2 bg-sky-50 text-sky-600 rounded-xl text-xs font-black self-start mt-0.5">
              <FileText className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[11px] font-black text-slate-900">إدارة الأنشطة والتمارين</h3>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">نشر الفروض والدروس والتطبيقات المنزلية المحددة لكل مستوى.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/50 p-4 rounded-2xl flex items-start gap-3">
            <div className="p-1 px-2.2 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-black self-start mt-0.5">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[11px] font-black text-slate-900">رصد معدلات الفروض</h3>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">تحصيل نقاط المراقبة المستمرة والامتحانات وإصدار تقارير مبيانية دقيقة.</p>
            </div>
          </div>

          <div className="bg-white border border-slate-200/50 p-4 rounded-2xl flex items-start gap-3">
            <div className="p-1 px-2.2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black self-start mt-0.5">
              <Clock className="h-4.5 w-4.5" />
            </div>
            <div className="space-y-0.5">
              <h3 className="text-[11px] font-black text-slate-900">متابعة دقيقة للغياب</h3>
              <p className="text-[10px] text-slate-500 font-bold leading-relaxed">تسجيل تواريخ الغياب اليومية وتوثيق الأعذار المبررة قانونياً.</p>
            </div>
          </div>

        </div>

        {/* 3. Secure Login Form Section */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="text-center sm:text-right border-b border-slate-100 pb-3">
            <h2 className="text-xs sm:text-sm font-black text-slate-800 flex items-center justify-center sm:justify-start gap-1.5">
              <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
              <span>فضاء مصادقة الولوج الآمن للأنظمة</span>
            </h2>
          </div>

          {errorMessage && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-rose-50 text-rose-700 border-r-4 border-rose-500 px-4 py-3 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2"
            >
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                اسم مستخدم الحساب المعتمد:
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4.5 w-4.5 text-blue-500" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="مثال: superadmin أو اسم المستخدم الخاص بك"
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-xs sm:text-sm font-bold text-slate-800 placeholder:text-slate-400 transition-all font-sans"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-700">
                الرمز أو المفتاح السري للولوج:
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4.5 w-4.5 text-blue-500" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 text-xs sm:text-sm font-sans font-bold text-slate-800 placeholder:text-slate-400 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 active:scale-[0.98] text-white font-extrabold rounded-2xl text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-blue-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <span className="w-4.5 h-4.5 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                  <span>جاري التحقق من الصلاحيات وربط الخادم...</span>
                </>
              ) : (
                <>
                  <UserCheck className="h-4.5 w-4.5" />
                  <span>تسجيل الدخول والنفاذ للبوابة</span>
                </>
              )}
            </button>
          </form>
        </div>

      </motion.div>
    </div>
  );
}
