/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { dbService } from '../lib/dbService';
import { UserSession, UserRole } from '../types';
import { 
  Users, 
  UserPlus, 
  KeyRound, 
  Trash2, 
  Search, 
  LogOut, 
  ShieldAlert, 
  RefreshCw, 
  UserCheck, 
  Activity, 
  GraduationCap, 
  Sliders, 
  CheckCircle, 
  Database 
} from 'lucide-react';

interface SuperAdminDashboardProps {
  session: UserSession;
  onLogout: () => void;
  firebaseStatus: string;
}

export default function SuperAdminDashboard({ session, onLogout, firebaseStatus }: SuperAdminDashboardProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  
  // Create User Form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'superadmin' | 'teacher' | 'student'>('teacher');
  const [newLevel, setNewLevel] = useState<'5' | '6'>('5');
  const [errorForm, setErrorForm] = useState<string | null>(null);
  
  // Edit Password Modal state
  const [showEditPassModal, setShowEditPassModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingNewPassword, setEditingNewPassword] = useState('');
  const [errorEditForm, setErrorEditForm] = useState<string | null>(null);

  // Success Feedback Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchUsersList = async () => {
    setLoading(true);
    try {
      const allUsers = await dbService.getAllUsers();
      setUsers(allUsers);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersList();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setErrorForm(null);

    if (!newDisplayName.trim() || !newUsername.trim() || !newPassword.trim()) {
      setErrorForm('الرجاء ملء جميع الحقول الإلزامية.');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(newUsername.trim())) {
      setErrorForm('اسم المستخدم يجب أن يحتوي على أحرف وأرقام معيارية فقط دون فراغات (مثال: teacher_ahmed).');
      return;
    }

    // Check duplicate username
    const exists = users.some(u => u.username?.toLowerCase() === newUsername.trim().toLowerCase());
    if (exists) {
      setErrorForm('اسم المستخدم هذا مسجل مسبقاً في النظام. الرجاء تعيين اسم مستخدم فريد.');
      return;
    }

    try {
      await dbService.saveUserAccount({
        displayName: newDisplayName.trim(),
        username: newUsername.trim().toLowerCase(),
        password: newPassword.trim(),
        role: newRole,
        level: newRole === 'student' ? newLevel : undefined
      });

      triggerToast(`تم إنشاء حساب (${newDisplayName}) بنجاح!`);
      // Reset Form
      setNewDisplayName('');
      setNewUsername('');
      setNewPassword('');
      setShowAddModal(false);
      
      // Refresh list
      fetchUsersList();
    } catch (err: any) {
      setErrorForm(err.message || 'فشلت عملية حفظ الحساب في Firestore.');
    }
  };

  const handleUpdatePassword = async (e: FormEvent) => {
    e.preventDefault();
    setErrorEditForm(null);

    if (!editingNewPassword.trim()) {
      setErrorEditForm('الرجاء إدخال كلمة المرور الجديدة.');
      return;
    }

    try {
      await dbService.saveUserAccount({
        id: editingUser.id,
        username: editingUser.username,
        displayName: editingUser.displayName,
        role: editingUser.role,
        level: editingUser.level,
        password: editingNewPassword.trim()
      });

      triggerToast(`تم تحديث كلمة مرور الحساب (${editingUser.displayName}) بنجاح!`);
      setShowEditPassModal(false);
      setEditingUser(null);
      setEditingNewPassword('');
      fetchUsersList();
    } catch (err: any) {
      setErrorEditForm(err.message || 'فشلت عملية تحديث الحساب في Firestore.');
    }
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    if (uid === session.uid || uid === 'uid_superadmin') {
      alert('⚠️ لا يمكنك حذف حساب المشرف الفعلي الذي تسجل به دخولك حالياً.');
      return;
    }

    if (confirm(`⚠️ تحذير نهائي: هل أنت متأكد من حذف الحساب الدراسي لـ (${name}) بشكل كامل ونهائي من الخادم السحابي وقاعدة البيانات؟`)) {
      try {
        await dbService.deleteUserAccount(uid);
        triggerToast(`تمت إزالة الحساب الدراسي لـ (${name}) بنجاح.`);
        fetchUsersList();
      } catch (err: any) {
        alert('حدث خطأ أثناء إجراء الحذف من قاعدة البيانات: ' + err.message);
      }
    }
  };

  // Stats Counters
  const totalAdmins = users.filter(u => u.role === 'superadmin' || u.role === UserRole.SUPERADMIN).length;
  const totalTeachers = users.filter(u => u.role === 'teacher' || u.role === UserRole.TEACHER).length;
  const totalStudents = users.filter(u => u.role === 'student' || u.role === UserRole.STUDENT_5 || u.role === UserRole.STUDENT_6).length;

  // Filter & Search Logic
  const filteredUsers = users.filter(u => {
    const rawRole = (u.role || '').toLowerCase();
    
    // Filter by type
    if (selectedRoleFilter !== 'all') {
      if (selectedRoleFilter === 'superadmin' && rawRole !== 'superadmin' && u.role !== UserRole.SUPERADMIN) return false;
      if (selectedRoleFilter === 'teacher' && rawRole !== 'teacher' && u.role !== UserRole.TEACHER) return false;
      if (selectedRoleFilter === 'student_5' && u.role !== UserRole.STUDENT_5 && !(rawRole === 'student' && u.level === '5')) return false;
      if (selectedRoleFilter === 'student_6' && u.role !== UserRole.STUDENT_6 && !(rawRole === 'student' && u.level === '6')) return false;
    }

    // Filter by search query
    const matchName = (u.displayName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchUser = (u.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchName || matchUser;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16" dir="rtl">
      
      {/* Upper Status Feedback Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-6 left-1/2 transform -translate-x-1/2 z-50 bg-slate-900 text-emerald-400 border border-emerald-500/30 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 text-xs font-bold font-mono"
          >
            <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Glass Header */}
      <div className="bg-white border border-sky-100 rounded-[28px] p-6 sm:p-8 shadow-xl shadow-sky-100/15 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-sky-200/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 left-0 w-32 h-32 bg-amber-200/5 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <span className="p-1.5 px-3 bg-red-50 text-red-600 rounded-xl text-[10px] font-black tracking-wide border border-red-100 uppercase inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span>نظام المشرف العام المغلق | Super Admin</span>
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              لوحة التحكم والإشراف الفيدرالي
            </h1>
            <p className="text-xs text-slate-500 font-bold font-sans">
              مرحباً بك يا <span className="text-sky-600">{session.displayName}</span>. يمكنك حصر، إنشاء، وتعديل صلاحيات كافة الحسابات التعليمية داخل منصتك وإدارتها بمرونة سحابية كاملة.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto shrink-0 justify-end">
            <div className="px-4 py-2 bg-slate-50 border border-slate-200/80 rounded-2xl text-[10px] sm:text-xs font-bold text-slate-600 flex items-center gap-1.5 font-sans">
              <Database className="h-3.5 w-3.5 text-sky-500" />
              <span>قناة الاتصال الحالية:</span>
              <span className="text-sky-600 font-extrabold">{firebaseStatus}</span>
            </div>

            <button
              onClick={onLogout}
              className="px-4.5 py-2.5 bg-rose-500 hover:bg-rose-600 active:bg-rose-700 text-white rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-rose-500/10 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      </div>

      {/* Numerical Performance Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-lg shadow-sky-100/10 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-slate-500">إجمالي الحسابات المسجلة</p>
            <p className="text-2xl font-black text-slate-900 font-sans tracking-tight">{users.length}</p>
          </div>
          <div className="p-3.5 bg-slate-50 text-slate-700 rounded-2xl border border-slate-100">
            <Users className="h-6 w-6 text-slate-600" />
          </div>
        </div>

        <div className="bg-white border border-rose-100 rounded-3xl p-5 shadow-lg shadow-rose-100/5 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-slate-500">حسابات المشرفين (Super Admin)</p>
            <p className="text-2xl font-black text-rose-600 font-sans tracking-tight">{totalAdmins}</p>
          </div>
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-sky-100 rounded-3xl p-5 shadow-lg shadow-sky-100/10 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-slate-500">حسابات السادة الأساتذة</p>
            <p className="text-2xl font-black text-sky-600 font-sans tracking-tight">{totalTeachers}</p>
          </div>
          <div className="p-3.5 bg-sky-50 text-sky-600 rounded-2xl border border-sky-100">
            <GraduationCap className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-white border border-emerald-100 rounded-3xl p-5 shadow-lg shadow-emerald-100/10 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-black text-slate-500">حسابات التلاميذ المقيدين</p>
            <p className="text-2xl font-black text-emerald-600 font-sans tracking-tight">{totalStudents}</p>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Activity className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Grid Filtering, Search Inputs & Add Account Button */}
      <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xl shadow-sky-100/5 mb-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
          
          {/* Filters & Inputs Column */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 w-full lg:w-3/4">
            
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="h-4 w-4" />
              </div>
              <input
                type="text"
                placeholder="ابحث عن مستخدم بالاسم أو المعرف السري..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 rounded-2xl text-xs font-bold text-slate-800 transition-all font-sans"
              />
            </div>

            {/* Role Filter Selector */}
            <div className="sm:col-span-4 relative">
              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="w-full px-4 pr-10 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 rounded-2xl text-xs font-bold text-slate-800 transition-all"
              >
                <option value="all">كل الرتب والصلاحيات</option>
                <option value="superadmin">المشرفين العامين (Super Admin)</option>
                <option value="teacher">الأساتذة (Teachers)</option>
                <option value="student_5">تلاميذ المستوى الخامس</option>
                <option value="student_6">تلاميذ المستوى السادس</option>
              </select>
            </div>

            {/* Sync Refresh Button */}
            <button
              type="button"
              onClick={fetchUsersList}
              disabled={loading}
              className="sm:col-span-2 px-3 py-3 bg-slate-50 hover:bg-slate-100 active:bg-slate-200 text-slate-700 font-extrabold border border-slate-200 rounded-2xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 text-sky-500 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">مزامنة</span>
            </button>

          </div>

          {/* Add Account Trigger Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full lg:w-auto px-6 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white rounded-2xl text-xs font-black shrink-0 transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/10 cursor-pointer"
          >
            <UserPlus className="h-4.5 w-4.5" />
            <span>إنشاء حساب مستخدم جديد</span>
          </button>

        </div>
      </div>

      {/* Main Users Registry List Grid */}
      <div className="bg-white border border-sky-100 rounded-3xl shadow-xl shadow-sky-100/10 overflow-hidden">
        
        <div className="bg-slate-50 p-4 border-b border-sky-50 flex items-center justify-between">
          <h2 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
            <Users className="h-4.5 w-4.5 text-sky-500" />
            <span>سجل الحسابات والولوجيات الفعال ({filteredUsers.length} مستخدم مدرج)</span>
          </h2>
          <span className="text-[10px] font-sans font-extrabold text-slate-400">انقر على الخيارات لإدارة الحسابات</span>
        </div>

        {loading ? (
          <div className="py-20 text-center space-y-3">
            <span className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin inline-block" />
            <p className="text-xs text-slate-500 font-bold">جاري استيراد الحسابات من مستندات لقواعد Firestore السحابية...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-4">
            <p className="text-xs text-slate-500 font-bold">لم نعثر على أي نتائج للمستخدمين المطابقين لمعايير الفلترة أو التصفية.</p>
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(''); setSelectedRoleFilter('all'); }} 
                className="text-xs font-bold text-sky-500 hover:underline"
              >
                مسح مربع التصفية
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-sky-50 text-[11px] font-black text-slate-600">
                  <th className="py-4.5 px-6">المستفيد والاسم الكامل</th>
                  <th className="py-4.5 px-6">اسم مستخدم الحساب</th>
                  <th className="py-4.5 px-6">التبعية والمستوى التعليمي</th>
                  <th className="py-4.5 px-6">كلمة المرور الحالية</th>
                  <th className="py-4.5 px-6 text-left">أدوات التحكم والإشراف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-50/50">
                {filteredUsers.map((u) => {
                  const rawRole = (u.role || '').toLowerCase();
                  const isSA = rawRole === 'superadmin' || u.role === UserRole.SUPERADMIN;
                  const isTeach = rawRole === 'teacher' || u.role === UserRole.TEACHER;
                  const isStud = rawRole === 'student' || u.role === UserRole.STUDENT_5 || u.role === UserRole.STUDENT_6;
                  
                  return (
                    <tr key={u.id || u.username} className="hover:bg-slate-50/40 transition">
                      
                      {/* Full Name & Role Badge */}
                      <td className="py-4.5 px-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${
                            isSA ? 'bg-rose-50 border-rose-100 text-rose-500' :
                            isTeach ? 'bg-sky-50 border-sky-100 text-sky-500' :
                            'bg-emerald-50 border-emerald-100 text-emerald-500'
                          }`}>
                            <UserCheck className="h-4 w-4 shrink-0" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">{u.displayName}</p>
                            <div className="flex items-center gap-1 mt-1">
                              {isSA && (
                                <span className="bg-rose-50 text-rose-600 px-2 py-0.5 border border-rose-100 rounded-lg text-[9px] font-bold">
                                  👑 مشرف عام (Super Admin)
                                </span>
                              )}
                              {isTeach && (
                                <span className="bg-blue-50 text-blue-600 px-2 py-0.5 border border-blue-100 rounded-lg text-[9px] font-bold">
                                  👨‍🏫 أستاذ مقتدر (Teacher)
                                </span>
                              )}
                              {isStud && (
                                <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 border border-emerald-100 rounded-lg text-[9px] font-bold">
                                  🎓 تلميذ المستوى {u.level || '5'} (Student)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username */}
                      <td className="py-4.5 px-6 font-mono text-xs font-bold text-slate-600">
                        @{u.username}
                      </td>

                      {/* Level and Category */}
                      <td className="py-4.5 px-6">
                        {isStud ? (
                          <span className="text-xs font-bold text-slate-800">
                            المستوى {u.level === '6' ? 'السادس ابتدائي' : 'الخامس ابتدائي'}
                          </span>
                        ) : isTeach ? (
                          <span className="text-xs text-slate-500 font-bold">القسم التدريسي الموحد</span>
                        ) : (
                          <span className="text-xs text-rose-500 font-black">تحكم سحابي شامل</span>
                        )}
                      </td>

                      {/* Current Safe Password */}
                      <td className="py-4.5 px-6">
                        <div className="inline-flex items-center gap-1.5 bg-slate-55 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-xl text-xs font-mono font-bold">
                          <KeyRound className="h-3 w-3 text-slate-500" />
                          <span>{u.password || '******'}</span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4.5 px-6 text-left space-x-2 space-x-reverse">
                        
                        {/* Change Password Action */}
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditingNewPassword(u.password || '');
                            setShowEditPassModal(true);
                          }}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 hover:text-sky-700 border border-sky-200/50 rounded-xl text-[11px] font-bold cursor-pointer transition select-none inline-flex items-center gap-1"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>تعديل الرمز السرّي</span>
                        </button>

                        {/* Delete Action button */}
                        <button
                          onClick={() => handleDeleteUser(u.id || `uid_${u.username}`, u.displayName)}
                          disabled={u.username === 'superadmin' || u.id === session.uid}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 border border-rose-200/50 rounded-xl text-[11px] font-bold cursor-pointer transition select-none inline-flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>حذف الحساب</span>
                        </button>

                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POPUP MODAL 1: CREATE NEW ACCOUNT */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" 
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-sky-100 rounded-[28px] w-full max-w-lg p-6 sm:p-8 shadow-2xl relative z-10"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-sky-50 mb-6">
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-sky-500" />
                  <span>توليد حساب مستخدم جديد وتوثيقه</span>
                </h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 hover:bg-slate-100 rounded-lg text-sm transition"
                >
                  ✕
                </button>
              </div>

              {errorForm && (
                <div className="bg-rose-55 bg-rose-50 text-rose-700 border-r-4 border-rose-500 p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                  <span className="shrink-0 text-red-500">⚠</span>
                  <span>{errorForm}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                
                {/* Select Role */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-705 text-slate-700">تحديد نوع الصلاحية ودور الحساب:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { role: 'teacher', label: '👨‍🏫 أستاذ مقتدر' },
                      { role: 'student', label: '🎓 تلميذ رسمي' },
                      { role: 'superadmin', label: '👑 مشرف عام' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.role}
                        onClick={() => setNewRole(item.role as any)}
                        className={`py-2 px-1 border rounded-xl text-[11px] font-black tracking-tight transition cursor-pointer text-center ${
                          newRole === item.role
                            ? 'bg-sky-50 border-sky-400 text-sky-600 font-extrabold ring-2 ring-sky-100'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100/30'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Level selection (for student) */}
                {newRole === 'student' && (
                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/50">
                    <label className="block text-xs font-black text-slate-700">تحديد المستوى الدراسي للتلميذ:</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="new_lvl"
                          value="5"
                          checked={newLevel === '5'}
                          onChange={() => setNewLevel('5')}
                          className="h-4 w-4 text-sky-500 focus:ring-sky-450 border-slate-300"
                        />
                        <span>المستوى الخامس ابتدائي</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="new_lvl"
                          value="6"
                          checked={newLevel === '6'}
                          onChange={() => setNewLevel('6')}
                          className="h-4 w-4 text-sky-500 focus:ring-sky-450 border-slate-300"
                        />
                        <span>المستوى السادس ابتدائي</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700">الاسم الكامل والمحترم للمستفيد:</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: ذ. ربيع الإدريسي أو صفاء العلمي"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-55 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 rounded-xl text-xs font-bold text-slate-803 transition"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700">اسم المستخدم للولوج (username) بالإنجليزية:</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 font-mono font-black text-xs">@</span>
                    <input
                      type="text"
                      required
                      placeholder="مثال: rabie_teacher أو safae5"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full pl-4 pr-9 py-3 bg-slate-55 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 rounded-xl text-xs font-bold text-slate-803 font-mono transition"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700">كلمة المرور الرسمية المعينة للحساب:</label>
                  <input
                    type="password"
                    required
                    placeholder="اكتب كلمة مرور واضحة"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-55 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:focus:border-sky-400 focus:ring-4 focus:ring-sky-100 rounded-xl text-xs font-bold text-slate-803 font-mono transition"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-4 grid grid-cols-2 gap-3 border-t border-sky-50 mt-6">
                  <button
                    type="submit"
                    className="py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-sky-500/10"
                  >
                    💾 تأكيد وإنشاء الحساب الدراسي
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    إلغاء الأمر
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* POPUP MODAL 2: EDIT USER PASSWORD */}
      <AnimatePresence>
        {showEditPassModal && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowEditPassModal(false); setEditingUser(null); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" 
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-sky-100 rounded-[28px] w-full max-w-md p-6 sm:p-8 shadow-2xl relative z-10"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-sky-50 mb-6">
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-sky-500" />
                  <span>تعديل كلمة مرور الحساب الدراسي</span>
                </h3>
                <button 
                  onClick={() => { setShowEditPassModal(false); setEditingUser(null); }}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 hover:bg-slate-100 rounded-lg text-sm transition"
                >
                  ✕
                </button>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-150 text-xs font-medium space-y-1 text-slate-700 mb-4">
                <p>صاحب الحساب: <span className="font-black text-slate-900">{editingUser.displayName}</span></p>
                <p>اسم المستخدم: <span className="font-black text-slate-900 font-mono">@{editingUser.username}</span></p>
              </div>

              {errorEditForm && (
                <div className="bg-rose-50 text-rose-700 border-r-4 border-rose-500 p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                  <span className="shrink-0 text-red-500">⚠</span>
                  <span>{errorEditForm}</span>
                </div>
              )}

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                
                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700">أدخل كلمة المرور الجديدة:</label>
                  <input
                    type="text"
                    required
                    placeholder="اكتب كلمة مرور جديدة هنا"
                    value={editingNewPassword}
                    onChange={(e) => setEditingNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-55 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100 rounded-xl text-xs font-bold text-slate-803 font-mono transition"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-4 grid grid-cols-2 gap-3 border-t border-sky-50 mt-6">
                  <button
                    type="submit"
                    className="py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-sky-500/10"
                  >
                    💾 حفظ الرمز الجديد
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowEditPassModal(false); setEditingUser(null); }}
                    className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition cursor-pointer"
                  >
                    إلغاء الأمر
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
