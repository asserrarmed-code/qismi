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
  Database,
  FileUp,
  UploadCloud
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
  const [newSubject, setNewSubject] = useState<string>('اللغة العربية');
  const [newAssignedClasses, setNewAssignedClasses] = useState<string[]>([]);
  const [errorForm, setErrorForm] = useState<string | null>(null);
  
  // Edit User Modal state
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState('');
  const [editingUsername, setEditingUsername] = useState('');
  const [editingRole, setEditingRole] = useState<'superadmin' | 'teacher' | 'student'>('teacher');
  const [editingLevel, setEditingLevel] = useState<'5' | '6'>('5');
  const [editingSubject, setEditingSubject] = useState<string>('اللغة العربية');
  const [editingAssignedClasses, setEditingAssignedClasses] = useState<string[]>([]);
  const [editingPassword, setEditingPassword] = useState('');
  const [errorEditForm, setErrorEditForm] = useState<string | null>(null);

  // CSV Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFileError, setImportFileError] = useState<string | null>(null);
  const [importedList, setImportedList] = useState<any[]>([]);
  const [defaultImportLevel, setDefaultImportLevel] = useState<'5' | '6'>('5');
  const [isImporting, setIsImporting] = useState(false);

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
        level: newRole === 'student' ? newLevel : undefined,
        subject: newRole === 'teacher' ? newSubject : undefined,
        assignedClasses: newRole === 'teacher' ? newAssignedClasses : undefined
      });

      triggerToast(`تم إنشاء حساب (${newDisplayName}) بنجاح!`);
      // Reset Form
      setNewDisplayName('');
      setNewUsername('');
      setNewPassword('');
      setNewSubject('اللغة العربية');
      setNewAssignedClasses([]);
      setShowAddModal(false);
      
      // Refresh list
      fetchUsersList();
    } catch (err: any) {
      setErrorForm(err.message || 'فشلت عملية حفظ الحساب في Firestore.');
    }
  };

  const handleUpdateUser = async (e: FormEvent) => {
    e.preventDefault();
    setErrorEditForm(null);

    if (!editingDisplayName.trim() || !editingUsername.trim() || !editingPassword.trim()) {
      setErrorEditForm('الرجاء ملء جميع الحقول الإلزامية.');
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(editingUsername.trim())) {
      setErrorEditForm('اسم المستخدم يجب أن يحتوي على أحرف وأرقام معيارية فقط دون فراغات (مثال: teacher_ahmed).');
      return;
    }

    // Check duplicate username
    const exists = users.some(u => u.id !== editingUser.id && u.username?.toLowerCase() === editingUsername.trim().toLowerCase());
    if (exists) {
      setErrorEditForm('اسم المستخدم هذا مسجل مسبقاً في النظام. الرجاء تعيين اسم مستخدم فريد.');
      return;
    }

    try {
      await dbService.saveUserAccount({
        id: editingUser.id,
        username: editingUsername.trim().toLowerCase(),
        displayName: editingDisplayName.trim(),
        role: editingRole,
        level: editingRole === 'student' ? editingLevel : undefined,
        subject: editingRole === 'teacher' ? editingSubject : undefined,
        assignedClasses: editingRole === 'teacher' ? editingAssignedClasses : undefined,
        password: editingPassword.trim()
      });

      triggerToast(`تم تحديث حساب (${editingDisplayName}) بنجاح!`);
      setShowEditUserModal(false);
      setEditingUser(null);
      fetchUsersList();
    } catch (err: any) {
      setErrorEditForm(err.message || 'فشلت عملية تحديث الحساب في Firestore.');
    }
  };

  const translitArabicToEnglish = (name: string): string => {
    let clean = name.trim();
    const map: { [key: string]: string } = {
      'أ': 'a', 'إ': 'i', 'ا': 'a', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
      'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
      'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
      'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
      'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'h', 'ئ': 'e', 'ؤ': 'o', 'ء': 'a'
    };
    
    let result = '';
    for (let i = 0; i < clean.length; i++) {
      const char = clean[i];
      if (map[char]) {
        result += map[char];
      } else if (/[a-zA-Z0-9_]/.test(char)) {
        result += char.toLowerCase();
      } else if (char === ' ' || char === '-') {
        result += '_';
      }
    }
    result = result.replace(/_+/g, '_').replace(/^_+|_+$/g, '');
    return result || 'student';
  };

  const handleCsvFileLoad = (text: string) => {
    setImportFileError(null);
    const lines = text.split(/\r?\n/);
    const parsed: any[] = [];
    
    lines.forEach((line) => {
      const val = line.trim();
      if (!val) return;
      
      const cols = val.split(/[;,]/).map(c => c.replace(/^["']|["']$/g, '').trim());
      if (cols.length === 0 || !cols[0]) return;
      
      let displayName = cols[0];
      let level: '5' | '6' = defaultImportLevel;
      
      // If there is an explicit level column
      if (cols.length > 1) {
        const customLvlStr = cols[1];
        if (customLvlStr.includes('6')) {
          level = '6';
        } else if (customLvlStr.includes('5')) {
          level = '5';
        }
      }
      
      // Skip common CSV headers
      const lowerHeader = displayName.toLowerCase();
      if (lowerHeader === 'name' || lowerHeader === 'displayName' || lowerHeader === 'الاسم' || lowerHeader === 'اسم التلميذ' || lowerHeader === 'الاسم الكامل') {
        return;
      }
      
      // Generate clean username prefix from English transliteration of their name
      const enPrefix = translitArabicToEnglish(displayName);
      const randSuffix = Math.floor(100 + Math.random() * 900).toString(); // 3 digit unique random identifier
      const generatedUsername = `${enPrefix}_${randSuffix}`;
      
      // Generate standard clean 6-digit PIN password
      const generatedPassword = Math.floor(100000 + Math.random() * 900000).toString();
      
      parsed.push({
        displayName,
        username: generatedUsername,
        password: generatedPassword,
        level,
        role: 'student'
      });
    });
    
    if (parsed.length === 0) {
      setImportFileError('عذراً، لم نعثر على أي أسماء تلاميذ صالحة داخل الملف المرفوع. الرجاء التحقق من صياغته.');
    } else {
      setImportedList(parsed);
    }
  };

  const handleFileDrop = (e: any) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileSelect = (e: any) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      handleCsvFileLoad(text);
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (importedList.length === 0) return;
    setIsImporting(true);
    setImportFileError(null);
    
    let successCount = 0;
    try {
      for (const item of importedList) {
        await dbService.saveUserAccount({
          displayName: item.displayName,
          username: item.username,
          password: item.password,
          role: 'student',
          level: item.level
        });
        successCount++;
      }
      triggerToast(`🎉 تم بنجاح استيراد وتوليد حسابات لـ (${successCount}) تلاميذ دفعة واحدة!`);
      setShowImportModal(false);
      setImportedList([]);
      fetchUsersList();
    } catch (err: any) {
      setImportFileError('حدث خطأ أثناء رفع الحسابات: ' + err.message);
    } finally {
      setIsImporting(false);
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

          {/* Add Account Trigger Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto shrink-0 justify-end">
            <button
              onClick={() => {
                setImportedList([]);
                setImportFileError(null);
                setShowImportModal(true);
              }}
              className="px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-650 hover:from-emerald-600 hover:to-teal-700 active:scale-95 text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
            >
              <FileUp className="h-4.5 w-4.5" />
              <span>رفع لائحة التلاميذ (CSV) 📂</span>
            </button>

            <button
              onClick={() => setShowAddModal(true)}
              className="px-5 py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 active:scale-95 text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-lg shadow-sky-500/10 cursor-pointer"
            >
              <UserPlus className="h-4.5 w-4.5" />
              <span>إنشاء حساب مستخدم جديد</span>
            </button>
          </div>

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
                        
                        {/* Edit Account Action */}
                        <button
                          onClick={() => {
                            setEditingUser(u);
                            setEditingDisplayName(u.displayName || '');
                            setEditingUsername(u.username || '');
                            setEditingRole(u.role || 'teacher');
                            setEditingLevel(u.level || '5');
                            setEditingSubject(u.subject || 'اللغة العربية');
                            setEditingAssignedClasses(u.assignedClasses || []);
                            setEditingPassword(u.password || '');
                            setShowEditUserModal(true);
                          }}
                          className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-600 hover:text-sky-700 border border-sky-200/50 rounded-xl text-[11px] font-bold cursor-pointer transition select-none inline-flex items-center gap-1"
                        >
                          <Sliders className="h-3.5 w-3.5" />
                          <span>تعديل الحساب</span>
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

                {/* Teacher specific settings (Subject & Assigned Classes) */}
                {newRole === 'teacher' && (
                  <div className="space-y-3.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-xs font-black text-slate-800 block">إسناد الصلاحيات التدريسية للأستاذ:</span>
                    
                    {/* Subject */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">المادة الموكلة إليه:</label>
                      <select
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-400"
                      >
                        <option value="اللغة العربية">اللغة العربية</option>
                        <option value="اللغة الفرنسية">اللغة الفرنسية</option>
                        <option value="الرياضيات">الرياضيات</option>
                      </select>
                    </div>

                    {/* Assigned classes / levels */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">الأقسام والفصول المسندة (الرجاء اختيار الأقسام التي يدرس بها):</label>
                      <div className="flex gap-4 mt-1.5">
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newAssignedClasses.includes('5')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewAssignedClasses(prev => [...prev, '5']);
                              } else {
                                setNewAssignedClasses(prev => prev.filter(c => c !== '5'));
                              }
                            }}
                            className="h-4 w-4 text-sky-500 rounded border-slate-300 focus:ring-sky-450"
                          />
                          <span>المستوى الخامس (Level 5)</span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newAssignedClasses.includes('6')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewAssignedClasses(prev => [...prev, '6']);
                              } else {
                                setNewAssignedClasses(prev => prev.filter(c => c !== '6'));
                              }
                            }}
                            className="h-4 w-4 text-sky-500 rounded border-slate-300 focus:ring-sky-450"
                          />
                          <span>المستوى السادس (Level 6)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

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

      {/* POPUP MODAL 2: COMPLETE ACCOUNT EDITOR */}
      <AnimatePresence>
        {showEditUserModal && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" 
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-sky-100 rounded-[28px] w-full max-w-lg p-6 sm:p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-sky-50 mb-6">
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <Sliders className="h-5 w-5 text-sky-500" />
                  <span>تعديل بيانات وصلاحيات الحساب الدراسي</span>
                </h3>
                <button 
                  onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 hover:bg-slate-100 rounded-lg text-sm transition"
                >
                  ✕
                </button>
              </div>

              {errorEditForm && (
                <div className="bg-rose-50 text-rose-700 border-r-4 border-rose-500 p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2">
                  <span className="shrink-0 text-red-500">⚠</span>
                  <span>{errorEditForm}</span>
                </div>
              )}

              <form onSubmit={handleUpdateUser} className="space-y-4">
                
                {/* Select Role */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700">تحديد نوع الصلاحية ودور الحساب:</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { role: 'teacher', label: '👨‍🏫 أستاذ مقتدر' },
                      { role: 'student', label: '🎓 تلميذ رسمي' },
                      { role: 'superadmin', label: '👑 مشرف عام' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.role}
                        onClick={() => setEditingRole(item.role as any)}
                        className={`py-2 px-1 border rounded-xl text-[11px] font-black tracking-tight transition cursor-pointer text-center ${
                          editingRole === item.role
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
                {editingRole === 'student' && (
                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/50">
                    <label className="block text-xs font-black text-slate-700">تحديد المستوى الدراسي للتلميذ:</label>
                    <div className="flex items-center gap-4 mt-2">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="edit_lvl"
                          value="5"
                          checked={editingLevel === '5'}
                          onChange={() => setEditingLevel('5')}
                          className="h-4 w-4 text-sky-500 border-slate-300"
                        />
                        <span>المستوى الخامس ابتدائي</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="edit_lvl"
                          value="6"
                          checked={editingLevel === '6'}
                          onChange={() => setEditingLevel('6')}
                          className="h-4 w-4 text-sky-500 border-slate-300"
                        />
                        <span>المستوى السادس ابتدائي</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700">الاسم الكامل للمستفيد:</label>
                  <input
                    type="text"
                    required
                    value={editingDisplayName}
                    onChange={(e) => setEditingDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-400 rounded-xl text-xs font-bold text-slate-800 transition"
                  />
                </div>

                {/* Username */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700">اسم المستخدم (username) بالإنجليزية:</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 font-mono font-black text-xs">@</span>
                    <input
                      type="text"
                      required
                      value={editingUsername}
                      onChange={(e) => setEditingUsername(e.target.value)}
                      className="w-full pl-4 pr-9 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-400 rounded-xl text-xs font-bold text-slate-800 font-mono transition"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-700">الرمز السري المعين للولوج:</label>
                  <input
                    type="text"
                    required
                    value={editingPassword}
                    onChange={(e) => setEditingPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:border-sky-400 rounded-xl text-xs font-bold text-slate-800 font-mono transition"
                  />
                </div>

                {/* Teacher specific settings */}
                {editingRole === 'teacher' && (
                  <div className="space-y-3.5 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                    <span className="text-xs font-black text-slate-800 block">إسناد الصلاحيات التدريسية للأستاذ:</span>
                    
                    {/* Subject */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">المادة الموكلة إليه:</label>
                      <select
                        value={editingSubject}
                        onChange={(e) => setEditingSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-sky-400"
                      >
                        <option value="الرياضيات">الرياضيات</option>
                        <option value="اللغة العربية">اللغة العربية</option>
                        <option value="اللغة الفرنسية">اللغة الفرنسية</option>
                      </select>
                    </div>

                    {/* Assigned classes / levels */}
                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-600">الأقسام والفصول المسندة للتأطير:</label>
                      <div className="flex gap-4 mt-1.5">
                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingAssignedClasses.includes('5')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingAssignedClasses(prev => [...prev, '5']);
                              } else {
                                setEditingAssignedClasses(prev => prev.filter(c => c !== '5'));
                              }
                            }}
                            className="h-4 w-4 text-sky-500 rounded border-slate-300 focus:ring-sky-450"
                          />
                          <span>المستوى الخامس (Level 5)</span>
                        </label>

                        <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingAssignedClasses.includes('6')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingAssignedClasses(prev => [...prev, '6']);
                              } else {
                                setEditingAssignedClasses(prev => prev.filter(c => c !== '6'));
                              }
                            }}
                            className="h-4 w-4 text-sky-500 rounded border-slate-300 focus:ring-sky-450"
                          />
                          <span>المستوى السادس (Level 6)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <div className="pt-4 grid grid-cols-2 gap-3 border-t border-sky-50 mt-6 font-sans">
                  <button
                    type="submit"
                    className="py-3 px-4 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-black transition cursor-pointer shadow-md shadow-sky-500/10"
                  >
                    💾 حفظ البيانات المعدلة
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowEditUserModal(false); setEditingUser(null); }}
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

      {/* POPUP MODAL 3: BATCH STUDENT CSV IMPORTER */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { if (!isImporting) setShowImportModal(false); }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" 
            />

            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white border border-emerald-100 rounded-[28px] w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative z-10 max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-emerald-50 mb-6 font-sans">
                <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-emerald-500" />
                  <span>رفع واستيراد لائحة التلاميذ دفعة واحدة (CSV) 📊</span>
                </h3>
                <button 
                  disabled={isImporting}
                  onClick={() => setShowImportModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 hover:bg-slate-100 rounded-lg text-sm transition disabled:opacity-30"
                >
                  ✕
                </button>
              </div>

              {importFileError && (
                <div className="bg-rose-50 text-rose-700 border-r-4 border-rose-500 p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2 font-sans">
                  <span className="shrink-0 text-red-500">⚠</span>
                  <span>{importFileError}</span>
                </div>
              )}

              {importedList.length === 0 ? (
                <div className="space-y-5">
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl text-xs text-slate-700 leading-relaxed font-sans space-y-1.5">
                    <p className="font-extrabold text-emerald-950">💡 إرشادات صياغة ملف CSV للتلاميذ:</p>
                    <p>1. قم بصياغة ملف نصّي عادي بامتداد <code className="bg-emerald-100/60 px-1 py-0.5 rounded text-emerald-800 text-[10px] font-mono">.csv</code>.</p>
                    <p>2. اكتب في كل سطر: <code className="bg-emerald-100/60 px-1.5 py-0.5 rounded text-emerald-800 text-[10px] font-mono">اسم التلميذ,المستوى</code> (أو فقط اسم التلميذ بمفرده ليعتمد المستوى الافتراضي المحدد بالأسفل).</p>
                    <p>3. صياغة نموذجية:</p>
                    <pre className="bg-slate-900 text-slate-200 p-2.5 rounded-xl text-[10px] font-mono leading-normal text-left" dir="ltr">
{`الاسم الكامل,المستوى
علي العلمي,5
سعاد الفاسي,6
أنس التازي`}
                    </pre>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-black text-slate-705 text-slate-700">المستوى الدراسي الافتراضي (في حالة لم يحدد بالملف):</label>
                    <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="import_def_lvl"
                          value="5"
                          checked={defaultImportLevel === '5'}
                          onChange={() => setDefaultImportLevel('5')}
                          className="h-4 w-4 text-emerald-500 border-slate-300"
                        />
                        <span>المستوى الخامس ابتدائي</span>
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="import_def_lvl"
                          value="6"
                          checked={defaultImportLevel === '6'}
                          onChange={() => setDefaultImportLevel('6')}
                          className="h-4 w-4 text-emerald-500 border-slate-300"
                        />
                        <span>المستوى السادس ابتدائي</span>
                      </label>
                    </div>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div 
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                    className="border-2 border-dashed border-emerald-200 hover:border-emerald-400 bg-emerald-50/10 hover:bg-emerald-50/25 p-10 rounded-[22px] text-center cursor-pointer transition-all duration-300 group"
                  >
                    <input 
                      type="file" 
                      id="csv-file-uploader" 
                      accept=".csv,.txt"
                      className="hidden" 
                      onChange={handleFileSelect}
                    />
                    <label htmlFor="csv-file-uploader" className="cursor-pointer space-y-3 block">
                      <UploadCloud className="h-10 w-10 text-emerald-400 mx-auto group-hover:scale-110 transition-transform duration-300" />
                      <div>
                        <p className="text-xs font-black text-slate-800">اسحب وأفلت ملف CSV الخاص بالتلاميذ هنا 📂</p>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">أو انقر لتصفح واختيار اللائحة من جهازك</p>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4 font-sans">
                  <div className="flex items-center justify-between bg-emerald-50 border border-emerald-100 p-3 rounded-2xl">
                    <div>
                      <span className="text-xs font-black text-emerald-950 block">تم تحليل وهيكلة ملف اللائحة بنجاح!</span>
                      <span className="text-[10px] font-bold text-emerald-700 block mt-0.5">جاهز لتوليد وتصدير حسابات لـ ({importedList.length}) تلاميذ مسجلين بالملف.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImportedList([])}
                      className="text-[10px] bg-white border border-emerald-200 text-emerald-750 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-xl font-bold transition"
                    >
                      إعادة اختيار الملف ✕
                    </button>
                  </div>

                  {/* Preview Table */}
                  <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-right text-[11px] font-bold text-slate-700 border-collapse">
                      <thead className="bg-slate-50 text-[10px] font-black text-slate-500 sticky top-0">
                        <tr className="border-b border-slate-100">
                          <th className="py-2.5 px-4">الترتيب</th>
                          <th className="py-2.5 px-4">الاسم الكامل للتلميذ</th>
                          <th className="py-2.5 px-4">اسم المستخدم المولد (Login)</th>
                          <th className="py-2.5 px-4">رمز المرور السرّي (PIN)</th>
                          <th className="py-2.5 px-4">المستوى المرصود</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {importedList.map((st, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="py-2 px-4 font-mono text-slate-400">{i + 1}</td>
                            <td className="py-2 px-4 font-black text-slate-900">{st.displayName}</td>
                            <td className="py-2 px-4 font-mono text-emerald-600 font-black">@{st.username}</td>
                            <td className="py-2 px-4 font-mono text-slate-600 bg-slate-50/30">{st.password}</td>
                            <td className="py-2 px-4 text-[10px] font-extrabold text-indigo-505 text-indigo-600">المستوى {st.level}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Actions summary */}
                  <div className="bg-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100 text-[11px] font-semibold text-slate-700 space-y-1">
                    <p>⚡ <span className="font-extrabold text-emerald-900">الأتمتة التوليدية:</span> سيقوم النظام تزامنا بإنشاء كافة حسابات التلاميذ وتشفيرها داخل السحابة الإلكترونية.</p>
                    <p>📝 <span className="font-extrabold text-emerald-900">نصيحة ذهبية:</span> يرجى أخذ لقطة شاشة للائحة أو كتابة بيانات الولوج لتسليم رموز التلاميذ.</p>
                  </div>

                  <div className="pt-4 grid grid-cols-2 gap-3 border-t border-slate-100">
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={handleConfirmImport}
                      className="py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-black transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-55 shadow-md shadow-emerald-500/10"
                    >
                      {isImporting ? (
                        <>
                          <div className="w-4 h-4 rounded-full border-2 border-t-transparent border-white animate-spin" />
                          <span>جاري توليد وتوثيق الحسابات ({importedList.length})...</span>
                        </>
                      ) : (
                        <span>🚀 توليد ورفع كافة الحسابات دفعة واحدة</span>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isImporting}
                      onClick={() => setShowImportModal(false)}
                      className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-black transition cursor-pointer disabled:opacity-40"
                    >
                      إلغاء الأمر والتراجع
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
