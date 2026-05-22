/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { isFirebaseAvailable } from './lib/firebase';
import { dbService } from './lib/dbService';
import { UserSession, UserRole } from './types';
import Login from './components/LoginPage';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import SuperAdminDashboard from './components/SuperAdminDashboard';

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null);
  const [firebaseStatusText, setFirebaseStatusText] = useState('البث المحلي الآمن');

  useEffect(() => {
    // Check session on start
    const loadedSession = dbService.getCurrentSession();
    if (loadedSession) {
      setSession(loadedSession);
    }

    // Set readable database connectivity label
    if (isFirebaseAvailable) {
      setFirebaseStatusText('متصل بقاعدة Firestore');
    } else {
      setFirebaseStatusText('مستودع البيانات المحلي (الوضع التجريبي)');
    }
  }, []);

  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
  };

  const handleLogout = () => {
    dbService.logout();
    setSession(null);
  };

  return (
    <div className="min-h-screen edu-gradient text-slate-800 font-sans antialiased relative pb-32" dir="rtl">
      
      {/* Upper cheerful decor strip resembling modern educational portal with sky and amber vibes */}
      <div className="h-1.5 bg-gradient-to-r from-sky-400 via-amber-400 to-emerald-400 w-full shadow-sm" />

      {/* Main Container */}
      <main className="w-full">
        {!session ? (
          <Login onLoginSuccess={handleLoginSuccess} />
        ) : session.role === UserRole.SUPERADMIN ? (
          <SuperAdminDashboard 
            session={session} 
            onLogout={handleLogout} 
            firebaseStatus={firebaseStatusText} 
          />
        ) : session.role === UserRole.TEACHER ? (
          <TeacherDashboard 
            session={session} 
            onLogout={handleLogout} 
            firebaseStatus={firebaseStatusText} 
          />
        ) : (
          <StudentDashboard 
            session={session} 
            onLogout={handleLogout} 
            firebaseStatus={firebaseStatusText} 
          />
        )}
      </main>

      {/* MANDATORY: Programmer design layout and signature credits fixed at the bottom of the viewport with medium opacity */}
      <footer 
        id="programmer-signature-footer"
        className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/90 backdrop-blur-md border-t border-slate-800 text-slate-400 py-3.5 px-4 text-center text-[10px] font-bold leading-relaxed shadow-2xl select-none opacity-80 hover:opacity-100 transition-opacity duration-300"
      >
        بوابة التدريس المدمجة | تصميم وبرمجة مهندس البرمجيات المتخصص في التطبيقات التعليمية والربط السحابي بقواعد Firebase © 2026
      </footer>
    </div>
  );
}
