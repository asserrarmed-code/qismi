/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';
import { dbService } from '../lib/dbService';
import { UserSession, Exercise, Score, Absence, EduDocument } from '../types';
import { 
  GraduationCap, 
  BookOpen, 
  Award, 
  Calendar, 
  Clock, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Users, 
  Smile, 
  Compass, 
  Sparkles, 
  BookMarked,
  Layers,
  CalendarDays,
  FolderOpen,
  FileText,
  FileDown,
  Paperclip,
  UploadCloud,
  FileUp,
  Image as ImageIcon,
  MessageSquare,
  Settings,
  Key,
  User,
  Lock
} from 'lucide-react';

interface TeacherDashboardProps {
  session: UserSession;
  onLogout: () => void;
  firebaseStatus: string;
}

export default function TeacherDashboard({ session, onLogout, firebaseStatus }: TeacherDashboardProps) {
  // Exercises States
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [exerciseText, setExerciseText] = useState('');
  const [exerciseLevel, setExerciseLevel] = useState<'5' | '6'>(() => {
    const assigned = session.assignedClasses || [];
    return assigned.includes('6') && !assigned.includes('5') ? '6' : '5';
  });
  const [exerciseCategory, setExerciseCategory] = useState<'تمرين' | 'فرض' | 'مراقبة مستمرة'>('تمرين');
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [exerciseSuccess, setExerciseSuccess] = useState<string | null>(null);

  // AI Question Generator States
  const [aiLevel, setAiLevel] = useState<'5' | '6'>(() => {
    const assigned = session.assignedClasses || [];
    return assigned.includes('6') && !assigned.includes('5') ? '6' : '5';
  });
  const [aiComponent, setAiComponent] = useState<string>('التراكيب');
  const [aiLanguage, setAiLanguage] = useState<'auto' | 'ar_vocalized' | 'fr'>('auto');
  const [aiLessonName, setAiLessonName] = useState('');
  const [aiQuestionCount, setAiQuestionCount] = useState<number>(3);
  const [aiGeneratedQuestions, setAiGeneratedQuestions] = useState<{question: string; correctAnswer: string; wrongAnswer1: string; wrongAnswer2: string}[]>([]);
  const [aiGeneratedQuestion, setAiGeneratedQuestion] = useState('');
  const [aiCorrectAnswer, setAiCorrectAnswer] = useState('');
  const [aiWrongAnswer1, setAiWrongAnswer1] = useState('');
  const [aiWrongAnswer2, setAiWrongAnswer2] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiGeneratorError, setAiGeneratorError] = useState<string | null>(null);
  const [aiGeneratorSuccess, setAiGeneratorSuccess] = useState<string | null>(null);
  const [showAiPreview, setShowAiPreview] = useState(false);

  // Scores States
  const [scores, setScores] = useState<Score[]>([]);
  const [scoreStudentName, setScoreStudentName] = useState('');
  const [scoreLevel, setScoreLevel] = useState<'5' | '6'>(() => {
    const assigned = session.assignedClasses || [];
    return assigned.includes('6') && !assigned.includes('5') ? '6' : '5';
  });
  const [scoreSubject, setScoreSubject] = useState(() => {
    return session.subject || '';
  });
  const [scoreValue, setScoreValue] = useState('');
  const [scoreType, setScoreType] = useState<'نقطة المراقبة المستمرة' | 'الفرض'>('نقطة المراقبة المستمرة');
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreSuccess, setScoreSuccess] = useState<string | null>(null);

  // Absences States
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [absenceStudentName, setAbsenceStudentName] = useState('');
  const [absenceLevel, setAbsenceLevel] = useState<'5' | '6'>(() => {
    const assigned = session.assignedClasses || [];
    return assigned.includes('6') && !assigned.includes('5') ? '6' : '5';
  });
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().substring(0, 10));
  const [absenceType, setAbsenceType] = useState<'غياب مبرر' | 'غياب غير مبرر'>('غياب غير مبرر');
  const [absenceError, setAbsenceError] = useState<string | null>(null);
  const [absenceSuccess, setAbsenceSuccess] = useState<string | null>(null);

  // Documents States
  const [documents, setDocuments] = useState<EduDocument[]>([]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLevel, setDocLevel] = useState<'5' | '6'>(() => {
    const assigned = session.assignedClasses || [];
    return assigned.includes('6') && !assigned.includes('5') ? '6' : '5';
  });
  const [docFileType, setDocFileType] = useState('وثيقة تربوية');
  const [docError, setDocError] = useState<string | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // General Filter
  const [viewLevel, setViewLevel] = useState<'all' | '5' | '6'>(() => {
    const assigned = session.assignedClasses || [];
    if (assigned.length === 1) {
      return assigned[0] as '5' | '6';
    }
    return 'all';
  });
  const [activeTab, setActiveTab] = useState<'exercises' | 'scores' | 'absences' | 'documents' | 'notes' | 'accounts' | 'settings'>('exercises');

  const [isLoading, setIsLoading] = useState(true);

  // Student Notes Management States
  const [studentNotes, setStudentNotes] = useState<{ id: string; username: string; displayName: string; level: '5' | '6'; notes: string }[]>([]);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editingNoteValue, setEditingNoteValue] = useState<string>('');
  const [notesSuccessMessage, setNotesSuccessMessage] = useState<string | null>(null);
  const [notesErrorMessage, setNotesErrorMessage] = useState<string | null>(null);
  const [isSavingNote, setIsSavingNote] = useState<boolean>(false);

  // Dynamic Student Account States
  const [studentAccounts, setStudentAccounts] = useState<any[]>([]);
  const [newAccName, setNewAccName] = useState('');
  const [newAccLevel, setNewAccLevel] = useState<'5' | '6'>(() => {
    const assigned = session.assignedClasses || [];
    return assigned.includes('6') && !assigned.includes('5') ? '6' : '5';
  });
  const [newAccUsername, setNewAccUsername] = useState('');
  const [newAccPassword, setNewAccPassword] = useState('');
  const [accSuccess, setAccSuccess] = useState<string | null>(null);
  const [accError, setAccError] = useState<string | null>(null);
  const [isCreatingAcc, setIsCreatingAcc] = useState<boolean>(false);
  const [isDeletingAccId, setIsDeletingAccId] = useState<string | null>(null);

  // Transliterate simple letters and append numeric offset to guarantee a clean username
  const generateUsernameFromName = (name: string): string => {
    const clean = name.trim()
      .replace(/\s+/g, '_')
      .replace(/[أإآ]/g, 'a')
      .replace(/[ب]/g, 'b')
      .replace(/[تث]/g, 't')
      .replace(/[ج]/g, 'j')
      .replace(/[حخ]/g, 'h')
      .replace(/[دذ]/g, 'd')
      .replace(/[ر]/g, 'r')
      .replace(/[ز]/g, 'z')
      .replace(/[سش]/g, 's')
      .replace(/[صضطظ]/g, 's')
      .replace(/[عغ]/g, 'g')
      .replace(/[ف]/g, 'f')
      .replace(/[قك]/g, 'k')
      .replace(/[لم]/g, 'l')
      .replace(/[ن]/g, 'n')
      .replace(/[ه]/g, 'h')
      .replace(/[و]/g, 'w')
      .replace(/[يىئ]/g, 'y');
    let latinOnly = clean.toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!latinOnly) {
      latinOnly = 'student';
    }
    const randSuffix = Math.floor(10 + Math.random() * 90);
    return `${latinOnly}${randSuffix}`;
  };

  const generateRandomPassword = (): string => {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    let pass = '';
    for (let i = 0; i < 6; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pass;
  };

  // Batch student import states for teacher
  const [showTeacherImportModal, setShowTeacherImportModal] = useState(false);
  const [teacherImportLvl, setTeacherImportLvl] = useState<'5' | '6'>(() => {
    const assigned = session.assignedClasses || [];
    return assigned.includes('6') && !assigned.includes('5') ? '6' : '5';
  });
  const [teacherImportedList, setTeacherImportedList] = useState<any[]>([]);
  const [teacherImportError, setTeacherImportError] = useState<string | null>(null);
  const [teacherIsImporting, setTeacherIsImporting] = useState(false);

  const handleTeacherExcelFileLoad = (rows: any[][]) => {
    setTeacherImportError(null);
    const parsed: any[] = [];
    
    rows.forEach((row) => {
      if (!row || row.length === 0) return;
      
      const displayName = String(row[0] || '').trim();
      if (!displayName) return;
      
      // Skip common excel headings
      const lowerHeader = displayName.toLowerCase();
      if (lowerHeader === 'name' || lowerHeader === 'displayname' || lowerHeader === 'الاسم' || lowerHeader === 'اسم التلميذ' || lowerHeader === 'الاسم الكامل') {
        return;
      }
      
      // Since teacher has specific assigned level, we assign teacherImportLvl
      const level = teacherImportLvl;
      
      const generatedUsername = generateUsernameFromName(displayName);
      const generatedPassword = generateRandomPassword();
      
      parsed.push({
        displayName,
        username: generatedUsername,
        password: generatedPassword,
        level,
        role: 'student'
      });
    });
    
    if (parsed.length === 0) {
      setTeacherImportError('عذراً، لم نعثر على أي أسماء تلاميذ صالحة داخل الملف المرفوع. الرجاء التحقق من صياغته.');
    } else {
      setTeacherImportedList(parsed);
    }
  };

  const processTeacherFile = (file: File) => {
    setTeacherImportError(null);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        handleTeacherExcelFileLoad(rows);
      } catch (err: any) {
        setTeacherImportError('عذراً، حدث خطأ أثناء قراءة وتحليل ملف Excel/CSV: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleTeacherConfirmImport = async () => {
    if (teacherImportedList.length === 0) return;
    setTeacherIsImporting(true);
    setTeacherImportError(null);
    
    let successCount = 0;
    try {
      const addedList: any[] = [];
      const addedNotes: any[] = [];

      for (const item of teacherImportedList) {
        const added = await dbService.addStudentAccount(
          item.displayName,
          item.level,
          item.username,
          item.password
        );
        addedList.push(added);
        addedNotes.push({
          id: added.id,
          username: added.username,
          displayName: added.displayName,
          level: added.level,
          notes: ''
        });
        successCount++;
      }
      
      // Refresh local Lists immediately without full reload
      setStudentAccounts(prev => [...addedList, ...prev]);
      setStudentNotes(prev => [...addedNotes, ...prev]);
      
      setShowTeacherImportModal(false);
      setTeacherImportedList([]);
      setAccSuccess(`🎉 تم بنجاح استيراد وتوليد حسابات لـ (${successCount}) من تلاميذك دفعة واحدة!`);
    } catch (err: any) {
      setTeacherImportError('حدث خطأ أثناء رفع الحسابات: ' + err.message);
    } finally {
      setTeacherIsImporting(false);
    }
  };

  // Auto populate credentials as teacher types student name
  const handleNameChange = (val: string) => {
    setNewAccName(val);
    if (val.trim()) {
      setNewAccUsername(generateUsernameFromName(val));
      setNewAccPassword(generateRandomPassword());
    } else {
      setNewAccUsername('');
      setNewAccPassword('');
    }
  };

  const handleCreateStudentAccount = async (e: FormEvent) => {
    e.preventDefault();
    setAccSuccess(null);
    setAccError(null);

    if (!newAccName.trim() || !newAccUsername.trim() || !newAccPassword.trim()) {
      setAccError('يرجى ملء جميع الحقول لتوليد الحساب الجديد.');
      return;
    }

    setIsCreatingAcc(true);
    try {
      const added = await dbService.addStudentAccount(
        newAccName.trim(),
        newAccLevel,
        newAccUsername.trim().toLowerCase(),
        newAccPassword.trim()
      );
      // Refresh Lists
      setStudentAccounts(prev => [added, ...prev]);
      
      // Update notes local state so they show up on Notes tab
      setStudentNotes(prev => [
        {
          id: added.id,
          username: added.username,
          displayName: added.displayName,
          level: added.level,
          notes: ''
        },
        ...prev
      ]);

      setAccSuccess(`تم توليد حساب التلميذ(ة) "${newAccName}" بنجاح! يمكنه الآن تسجيل الدخول مباشرة.`);
      
      // Reset Form fields
      setNewAccName('');
      setNewAccUsername('');
      setNewAccPassword('');
    } catch (err: any) {
      console.error("Error creating student account:", err);
      setAccError('فشلت عملية إنشاء الحساب. يُرجى التحقق من الاتصال.');
    } finally {
      setIsCreatingAcc(false);
    }
  };

  const handleDeleteStudentAccount = async (uid: string, displayName: string) => {
    if (!window.confirm(`هل أنت متأكد من رغبتك في حذف حساب التلميذ(ة): "${displayName}" نهائياً من قاعدة البيانات والتطبيق؟`)) {
      return;
    }

    setIsDeletingAccId(uid);
    try {
      await dbService.deleteStudentAccount(uid);
      setStudentAccounts(prev => prev.filter(acc => acc.id !== uid));
      setStudentNotes(prev => prev.filter(n => n.id !== uid));
      setAccSuccess(`تم حذف حساب التلميذ "${displayName}" وملاحظاته بنجاح.`);
    } catch (err) {
      console.error("Error deleting account:", err);
      setAccError('تعذر حذف حساب التلميذ. يرجى تكرار المحاولة لاحقاً.');
    } finally {
      setIsDeletingAccId(null);
    }
  };

  const handlePrintAccounts = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('الرجاء السماح بالنوافذ المنبثقة لطباعة حسابات التلاميذ.');
      return;
    }

    const levelText = viewLevel === 'all' ? 'جميع المستويات' : `المستوى ${viewLevel === '5' ? 'الخامس' : 'السادس'}`;
    const filtered = studentAccounts.filter(acc => viewLevel === 'all' || acc.level === viewLevel);

    let cardsHtml = '';
    let rowsHtml = '';

    filtered.forEach((acc, i) => {
      cardsHtml += `
        <div class="card">
          <div class="card-header">
            <span class="badge">المستوى ${acc.level} ابتدائي</span>
            <strong>بطاقة ولوج المنصة التعليمية الرقمية</strong>
          </div>
          <div class="card-body">
            <div class="field"><span class="label">اسم التلميذ(ة):</span> <span class="value">${acc.displayName}</span></div>
            <div class="field"><span class="label">اسم المستخدم:</span> <span class="value font-mono">${acc.username}</span></div>
            <div class="field"><span class="label">الرقم السري للولوج:</span> <span class="value font-mono highlight">${acc.password || 'primary' + acc.level}</span></div>
          </div>
          <div class="card-footer">
            <span>بوابة الدخول التعليمية: ${window.location.host}</span>
            <span style="font-size: 8px; color: #888;">ملاحظة: احتفظ بهذه البطاقة بعناية ولا تشارك رقمك السري مع زملائك.</span>
          </div>
          <div class="cut-line">✂️ خط المقص للتوزيع والتقطيع التربوي ✂️</div>
        </div>
      `;

      rowsHtml += `
        <tr>
          <td style="text-align: center; font-weight: bold;">${i + 1}</td>
          <td>${acc.displayName}</td>
          <td style="text-align: center;">المستوى ${acc.level} ابتدائي</td>
          <td class="font-mono">${acc.username}</td>
          <td class="font-mono highlight-text">${acc.password || 'primary' + acc.level}</td>
          <td class="font-mono" style="font-size: 8px; color: #777;">uid_${acc.username}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تصدير حسابات ولوج التلاميذ - ${levelText}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
          
          body {
            font-family: 'Cairo', 'Inter', sans-serif;
            margin: 40px;
            color: #1e293b;
            background: #fff;
            direction: rtl;
          }

          h1 {
            font-size: 20px;
            font-weight: 800;
            text-align: center;
            margin-bottom: 5px;
            color: #0f172a;
          }

          .subtitle {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
            color: #64748b;
            margin-bottom: 30px;
          }

          .print-btn-container {
            display: flex;
            justify-content: center;
            gap: 15px;
            margin-bottom: 40px;
          }

          .btn {
            font-family: 'Cairo', sans-serif;
            padding: 10px 22px;
            font-size: 12px;
            font-weight: 800;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
          }

          .btn-primary {
            background: #2563eb;
            color: #fff;
          }

          .btn-secondary {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
          }

          .btn:hover {
            opacity: 0.9;
            transform: translateY(-1px);
          }

          .section-title {
            font-size: 14px;
            font-weight: 800;
            border-right: 4px solid #3b82f6;
            padding-right: 10px;
            margin-top: 40px;
            margin-bottom: 20px;
            color: #1e3a8a;
          }

          .cards-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            page-break-after: always;
          }

          .card {
            border: 2px dashed #94a3b8;
            border-radius: 16px;
            padding: 18px;
            background: #faf8f5;
            position: relative;
            box-sizing: border-box;
            break-inside: avoid;
          }

          .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 12px;
          }

          .card-header strong {
            font-size: 10px;
            color: #1e40af;
            font-weight: 800;
          }

          .badge {
            background: #dbeafe;
            color: #1e40af;
            font-size: 9px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 6px;
          }

          .field {
            margin-bottom: 8px;
            font-size: 11px;
          }

          .label {
            font-weight: 700;
            color: #64748b;
            display: inline-block;
            width: 90px;
          }

          .value {
            font-weight: 800;
            color: #0f172a;
          }

          .font-mono {
            font-family: 'JetBrains Mono', monospace;
            letter-spacing: 0.5px;
          }

          .highlight {
            color: #d97706;
            background: #fef3c7;
            padding: 1px 6px;
            border-radius: 4px;
            font-weight: bold;
          }

          .card-footer {
            border-top: 1px solid #e2e8f0;
            padding-top: 8px;
            margin-top: 12px;
            font-size: 9px;
            color: #475569;
            display: flex;
            justify-content: space-between;
            font-weight: bold;
          }

          .cut-line {
            text-align: center;
            font-size: 8px;
            color: #94a3b8;
            margin-top: 15px;
            font-weight: bold;
            border-top: 1px dotted #94a3b8;
            padding-top: 8px;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            font-size: 11px;
            break-inside: auto;
          }

          tr {
            break-inside: avoid;
            break-after: auto;
          }

          th {
            background: #f1f5f9;
            color: #334155;
            font-weight: 800;
            padding: 12px 10px;
            border: 1px solid #cbd5e1;
            text-align: right;
          }

          td {
            padding: 10px;
            border: 1px solid #e2e8f0;
            text-align: right;
            font-weight: 600;
          }

          .highlight-text {
            color: #b45309;
            font-weight: bold;
          }

          @media print {
            body {
              margin: 0;
              padding: 20px;
            }
            .print-btn-container {
              display: none !important;
            }
            .card {
              background: #fff !important;
              border: 2px dashed #64748b !important;
            }
            .highlight {
              background: none !important;
              border: 1px solid #cbd5e1;
              padding: 1px 4px;
            }
            table th {
              background-color: #f1f5f9 !important;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-btn-container">
          <button class="btn btn-primary" onclick="window.print()">🖨️ طباعة أو الحفظ كـ PDF</button>
          <button class="btn btn-secondary" onclick="window.close()">إغلاق النافذة</button>
        </div>

        <h1>لائحة حسابات ولوج التلاميذ المحدثة</h1>
        <div class="subtitle">تاريخ الإصدار: ${new Date().toLocaleDateString('ar-MA')} | الفلتر: ${levelText} | إجمالي المسجلين: ${filtered.length} تلميذ(ة)</div>

        <div class="section-title">أولاً: بطاقات التوزيع الفردية للطلبة (قص ووزع)</div>
        <div class="cards-grid">
          ${cardsHtml}
        </div>

        <div style="page-break-before: always;"></div>

        <div class="section-title">ثانياً: جدول المرجعية الشامل للأستاذ (للأرشيف والتقييد)</div>
        <table>
          <thead>
            <tr>
              <th style="width: 50px; text-align: center;">الرقم</th>
              <th>الاسم الكامل للتلميذ(ة)</th>
              <th style="width: 120px; text-align: center;">المستوى الدراسي</th>
              <th style="width: 150px;">اسم المستخدم</th>
              <th style="width: 150px;">كلمة المرور</th>
              <th style="width: 180px;">الرقم الفريد للمعرف (UID)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <script>
          window.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => {
              window.print();
            }, 600);
          });
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Fetch data
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      const exData = await dbService.getExercises();
      const scData = await dbService.getScores();
      const abData = await dbService.getAbsences();
      const docsData = await dbService.getDocuments();
      let notesData: any[] = [];
      let accountsData: any[] = [];
      try {
        notesData = await dbService.getStudentNotes();
        accountsData = await dbService.getStudentsForTeacher(session.uid);
      } catch (notesErr) {
        console.error("Error loading student notes in teacher dashboard:", notesErr);
      }
      setExercises(exData || []);
      setScores(scData || []);
      setAbsences(abData || []);
      setDocuments(docsData || []);

      const assignedLevels = session.assignedClasses || [];
      const filteredNotes = (notesData || []).filter(note => assignedLevels.includes(note.level));
      setStudentNotes(filteredNotes);
      setStudentAccounts(accountsData || []);
    } catch (e) {
      console.error("خطأ أثناء جلب السجلات التربوية والوثائق:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // Generate AI Interactive Question
  const handleGenerateAiQuestion = async (e: FormEvent) => {
    e.preventDefault();
    setAiGeneratorError(null);
    setAiGeneratorSuccess(null);
    setShowAiPreview(false);
    setAiGeneratedQuestions([]);

    if (!aiLessonName.trim()) {
      setAiGeneratorError('يرجى أولاً كتابة اسم الدرس المستهدف لتوليد السؤال.');
      return;
    }

    setIsAiGenerating(true);
    try {
      const response = await fetch('/api/generate-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          level: aiLevel,
          component: aiComponent,
          lessonName: aiLessonName.trim(),
          count: aiQuestionCount,
          language: aiLanguage
        })
      });

      const contentType = response.headers.get('content-type');
      if (!response.ok) {
        let errorMsg = 'حدث فشل غير معروف أثناء محاولة الاتصال بالسيرفر.';
        if (contentType && contentType.includes('application/json')) {
          const resData = await response.json();
          errorMsg = resData.error || errorMsg;
        } else {
          const text = await response.text();
          if (response.status === 404) {
            errorMsg = "مسار التوليد غير متوفر (404 Not Found). في حال الاستضافة على Vercel، يرجى التأكد من تفعيل الدوال السحابية Serverless Functions والتحقق من بقية الملفات.";
          } else {
            errorMsg = `خطأ في الخادم (كود ${response.status}): ${text.slice(0, 150)}`;
          }
        }
        throw new Error(errorMsg);
      }

      if (!contentType || !contentType.includes('application/json')) {
        throw new Error("سيرفر الاستضافة أرجع استجابة غير صالحة بغير صيغة JSON. تأكد من تفعيل الدوال السحابية /api/generate-question على خادم المستضيف.");
      }

      const resData = await response.json();

      if (resData.success && resData.data && Array.isArray(resData.data)) {
        setAiGeneratedQuestions(resData.data);
        setShowAiPreview(true);
        setAiGeneratorSuccess(`تم بنجاح صياغة ${resData.data.length} أسئلة تفاعلية! قم بمراجعتها وتدقيق خياراتها ثم اختر نشرها.`);
      } else {
        throw new Error('الاستجابة المستلمة من السيرفر غير مطابقة للتعليمات البنيوية.');
      }
    } catch (err: any) {
      console.error("AI Generation failed:", err);
      const isHtmlResponse = err.message?.includes('غير صالحة بغير صيغة JSON') || err.message?.includes('DOCTYPE') || err.message?.includes('<html');
      
      let finalMessage = err.message || String(err);
      if (isHtmlResponse) {
        finalMessage = 'الخادم أرجع صفحة ويب بدلاً من بيانات JSON. هذا يحدث غالباً عند استضافة التطبيق كموقع ساكن (Static Site) على Vercel دون تفعيل الـ API بالكامل. يرجى تفعيل الدوال السحابية (Serverless Functions) وتحميل مجلد /api، والتأكد من تواجد مفتاح الـ API.';
      }
      setAiGeneratorError(finalMessage);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleEditAiQuestionField = (index: number, field: 'question' | 'correctAnswer' | 'wrongAnswer1' | 'wrongAnswer2', value: string) => {
    setAiGeneratedQuestions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handlePublishSingleAiQuestion = async (index: number) => {
    setAiGeneratorError(null);
    setAiGeneratorSuccess(null);

    const qItem = aiGeneratedQuestions[index];
    if (!qItem) return;

    if (!qItem.question.trim() || !qItem.correctAnswer.trim() || !qItem.wrongAnswer1.trim() || !qItem.wrongAnswer2.trim()) {
      setAiGeneratorError('يرجى التأكد من ملء نص السؤال وجميع الخيارات المقترحة أولاً.');
      return;
    }

    try {
      const formattedText = `سؤال تفاعلي ذكي 🤖✨
المكون: ${aiComponent}
الدرس: ${aiLessonName.trim()}

السؤال: ${qItem.question.trim()}

✔️ الجواب الصحيح: ${qItem.correctAnswer.trim()}
❌ خيار خاطئ أول: ${qItem.wrongAnswer1.trim()}
❌ خيار خاطئ ثان: ${qItem.wrongAnswer2.trim()}`;

      const added = await dbService.addExercise(formattedText, aiLevel, 'تمرين', session.uid);
      setExercises(prev => [added, ...prev]);

      // Remove the successfully published item from current generated list
      setAiGeneratedQuestions(prev => prev.filter((_, idx) => idx !== index));
      
      setAiGeneratorSuccess('تم حفظ ونشر السؤال التفاعلي المختار وتوجيهه فوراً للصف المستهدف.');
      setTimeout(() => setAiGeneratorSuccess(null), 5000);
    } catch (err: any) {
      setAiGeneratorError('فشلت عملية النشر على السيرفر: ' + err.message);
    }
  };

  const handlePublishAllAiQuestions = async () => {
    setAiGeneratorError(null);
    setAiGeneratorSuccess(null);

    if (aiGeneratedQuestions.length === 0) return;

    let successCount = 0;
    try {
      for (const qItem of aiGeneratedQuestions) {
        if (!qItem.question.trim() || !qItem.correctAnswer.trim() || !qItem.wrongAnswer1.trim() || !qItem.wrongAnswer2.trim()) {
          continue;
        }

        const formattedText = `سؤال تفاعلي ذكي 🤖✨
المكون: ${aiComponent}
الدرس: ${aiLessonName.trim()}

السؤال: ${qItem.question.trim()}

✔️ الجواب الصحيح: ${qItem.correctAnswer.trim()}
❌ خيار خاطئ أول: ${qItem.wrongAnswer1.trim()}
❌ خيار خاطئ ثان: ${qItem.wrongAnswer2.trim()}`;

        const added = await dbService.addExercise(formattedText, aiLevel, 'تمرين', session.uid);
        setExercises(prev => [added, ...prev]);
        successCount++;
      }

      setAiGeneratedQuestions([]);
      setShowAiPreview(false);
      setAiLessonName('');

      setAiGeneratorSuccess(`تم بنجاح نشر وتوجيه جميع الأسئلة التفاعلية (${successCount} أسئلة) إلى قاعدة البيانات وتوجيهها للصف بنجاح!`);
      setTimeout(() => setAiGeneratorSuccess(null), 5000);
    } catch (err: any) {
      setAiGeneratorError('فشلت عملية النشر الجماعي: ' + err.message);
    }
  };

  const handleSaveStudentNote = async (studentId: string, displayName: string, level: '5' | '6') => {
    setIsSavingNote(true);
    setNotesSuccessMessage(null);
    setNotesErrorMessage(null);
    try {
      await dbService.saveStudentNote(studentId, editingNoteValue, displayName, level);
      setNotesSuccessMessage(`تم بنجاح حفظ وتحديث الملاحظة الشخصية للتلميذ: "${displayName}"`);
      setEditingStudentId(null);
      setEditingNoteValue('');
      const updatedNotes = await dbService.getStudentNotes();
      setStudentNotes(updatedNotes || []);
    } catch (err: any) {
      setNotesErrorMessage(`فشلت عملية حفظ الملاحظة: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Publish AI Interactive Question to Exercises group
  const handlePublishAiQuestion = async (e: FormEvent) => {
    e.preventDefault();
    setAiGeneratorError(null);
    setAiGeneratorSuccess(null);

    if (!aiGeneratedQuestion.trim() || !aiCorrectAnswer.trim() || !aiWrongAnswer1.trim() || !aiWrongAnswer2.trim()) {
      setAiGeneratorError('يرجى التأكد من ملء نص السؤال وجميع الخيارات المقترحة أولاً.');
      return;
    }

    try {
      const formattedText = `سؤال تفاعلي ذكي 🤖✨
المكون: ${aiComponent}
الدرس: ${aiLessonName.trim()}

السؤال: ${aiGeneratedQuestion.trim()}

✔️ الجواب الصحيح: ${aiCorrectAnswer.trim()}
❌ خيار خاطئ أول: ${aiWrongAnswer1.trim()}
❌ خيار خاطئ ثان: ${aiWrongAnswer2.trim()}`;

      const added = await dbService.addExercise(formattedText, aiLevel, 'تمرين', session.uid);
      setExercises(prev => [added, ...prev]);

      // Clear the AI generator inputs for the next generate run
      setAiLessonName('');
      setAiGeneratedQuestion('');
      setAiCorrectAnswer('');
      setAiWrongAnswer1('');
      setAiWrongAnswer2('');
      setShowAiPreview(false);

      setAiGeneratorSuccess('تم حفظ ونشر السؤال التفاعلي على قاعدة البيانات السحابية وتوجيهه فوراً للصف المستهدف.');
      
      // Dismiss success announcement toast after 5 seconds automatically
      setTimeout(() => setAiGeneratorSuccess(null), 5000);
    } catch (err: any) {
      setAiGeneratorError('فشلت عملية النشر على السيرفر: ' + err.message);
    }
  };

  // Submit Exercise
  const handleAddExercise = async (e: FormEvent) => {
    e.preventDefault();
    setExerciseError(null);
    setExerciseSuccess(null);

    if (!exerciseText.trim()) {
      setExerciseError('يرجى كتابة نص التمرين أولاً.');
      return;
    }

    try {
      const added = await dbService.addExercise(exerciseText, exerciseLevel, exerciseCategory, session.uid);
      setExercises(prev => [added, ...prev]);
      setExerciseText('');
      setExerciseSuccess('تم تسجيل الواجب وحفظه بنجاح على الخادم.');
      
      // Auto dismiss success toast
      setTimeout(() => setExerciseSuccess(null), 4000);
    } catch (err: any) {
      setExerciseError('فشلت عملية الإرسال لقاعدة البيانات: ' + err.message);
    }
  };

  // Delete Exercise
  const handleDeleteExercise = async (id: string) => {
    if (!confirm('هل تأكد رغبتك في حذف هذا التمرين بصفة نهائية؟')) return;
    try {
      await dbService.deleteExercise(id);
      setExercises(prev => prev.filter(ex => ex.id !== id));
    } catch (err: any) {
      alert('تعذر حذف هذا السجل: ' + err.message);
    }
  };

  // Submit Score
  const handleAddScore = async (e: FormEvent) => {
    e.preventDefault();
    setScoreError(null);
    setScoreSuccess(null);

    if (!scoreStudentName.trim() || !scoreSubject.trim() || !scoreValue.trim()) {
      setScoreError('جميع الحقول إلزامية لتسجيل النقطة.');
      return;
    }

    try {
      const added = await dbService.addScore(scoreStudentName, scoreLevel, scoreSubject, scoreValue, scoreType);
      setScores(prev => [added, ...prev]);
      setScoreStudentName('');
      setScoreSubject('');
      setScoreValue('');
      setScoreSuccess('تم تدوين نقطة التلميذ(ة) في سجل التقييم المستمر بنجاح.');
      setTimeout(() => setScoreSuccess(null), 4000);
    } catch (err: any) {
      setScoreError('فشلت عملية الإرسال: ' + err.message);
    }
  };

  // Delete Score
  const handleDeleteScore = async (id: string) => {
    if (!confirm('هل تأكد رغبتك في حذف نقطة المراقبة هذه بصفة نهائية؟')) return;
    try {
      await dbService.deleteScore(id);
      setScores(prev => prev.filter(sc => sc.id !== id));
    } catch (err: any) {
      alert('تعذر الحذف: ' + err.message);
    }
  };

  // Submit Absence
  const handleAddAbsence = async (e: FormEvent) => {
    e.preventDefault();
    setAbsenceError(null);
    setAbsenceSuccess(null);

    if (!absenceStudentName.trim()) {
      setAbsenceError('يرجى تحديد وكتابة الاسم الكامل للتلميذ المتغيب.');
      return;
    }

    try {
      const added = await dbService.addAbsence(absenceStudentName, absenceLevel, absenceDate, absenceType);
      setAbsences(prev => [added, ...prev]);
      setAbsenceStudentName('');
      setAbsenceSuccess('تم تسجيل غياب التلميذ(ة) ورصد حالته بنجاح.');
      setTimeout(() => setAbsenceSuccess(null), 4000);
    } catch (err: any) {
      setAbsenceError('فشلت عملية الإرسال: ' + err.message);
    }
  };

  // Delete Absence
  const handleDeleteAbsence = async (id: string) => {
    if (!confirm('هل تأكد رغبتك في حذف سجل هذا الغياب المدرسي بصفة نهائية؟')) return;
    try {
      await dbService.deleteAbsence(id);
      setAbsences(prev => prev.filter(ab => ab.id !== id));
    } catch (err: any) {
      alert('تعذر حذف سجل الغياب: ' + err.message);
    }
  };

  // Submit shared file / pedagogical document
  const handleAddDocument = async (e: FormEvent) => {
    e.preventDefault();
    setDocError(null);
    setDocSuccess(null);

    if (!docFile) {
      setDocError('يرجى اختيار وتحديد ملف تربوي أولاً.');
      return;
    }

    setIsUploading(true);
    try {
      const added = await dbService.uploadFileAndAddDocument(docFile, docLevel, docFileType, session.uid);
      setDocuments(prev => [added, ...prev]);
      setDocFile(null);
      
      // Clear standard file input element by resetting custom label/state
      const fileInput = document.getElementById('pedagogical_file_input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      setDocSuccess('تم رفع ونشر وثيقتك التربوية بنجاح في ملفات الصف!');
      setTimeout(() => setDocSuccess(null), 5000);
    } catch (err: any) {
      setDocError('حدث مشكل أثناء الرفع أو الحيازة: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete Document
  const handleDeleteDocument = async (id: string, fileUrl: string) => {
    if (!confirm('هل تأكد رغبتك في إزالة وحذف هذا الملف التربوي بشكل مبرم؟')) return;
    try {
      await dbService.deleteDocument(id, fileUrl);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      alert('حدث خطأ أثناء محاولة الحذف: ' + err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 select-none" dir="rtl">
      
      {/* Teacher Control Panel Header - Luxurious & Friendly Education Gradient */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="bg-gradient-to-r from-indigo-500 via-blue-600 to-sky-500 text-white p-6 sm:p-8 rounded-[30px] border border-sky-350 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden"
      >
        <div className="absolute right-0 top-0 w-36 h-36 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute left-20 bottom-0 w-24 h-24 bg-sky-300/35 rounded-full blur-xl pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 border border-white/20 rounded-full backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-emerald-350 animate-pulse" />
            <Smile className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[10px] font-black text-amber-200 uppercase tracking-wider">
              بوابة الإدارة التربوية والأساتذة من السحابة
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-amber-300 shrink-0" />
            <span>لوحة تدبير وتقييم الفروض والأنشطة</span>
          </h1>
          
          <p className="text-xs sm:text-sm text-sky-100 font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-200" />
            <span>المستخدم المعتمد:</span>
            <span className="underline decoration-sky-300 decoration-2 font-black underline-offset-4 text-white">
              {session.displayName}
            </span>
            <span className="text-sky-300">|</span>
            <span className="text-sky-200 font-semibold">{firebaseStatus}</span>
          </p>
        </div>

        <button
          onClick={onLogout}
          className="bg-red-500 hover:bg-red-600 border border-red-400/30 hover:border-red-500 text-white font-black py-3 px-6 rounded-2xl text-xs transition-all duration-300 cursor-pointer shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 self-stretch md:self-auto justify-center"
        >
          <LogOut className="h-4 w-4" />
          <span>إنهاء الجلسة التربوية</span>
        </button>
      </motion.div>

      {/* Mode Filters & Level Segregation Filter - Modern Bubbly Control Box */}
      <div className="bg-white/95 border border-sky-100/90 rounded-[24px] p-5 mt-6 shadow-md shadow-sky-100/40 flex flex-col lg:flex-row justify-between items-center gap-5 relative z-10">
        <div className="flex flex-wrap p-1 bg-slate-100 border border-slate-200/50 rounded-2xl w-full lg:w-auto gap-1 select-none">
          <button
            onClick={() => setActiveTab('exercises')}
            className={`flex-1 lg:flex-initial text-center px-6 py-3.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'exercises' 
                ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <BookMarked className="h-4 w-4" />
            <span>تدبير التمارين والواجبات</span>
          </button>
          
          <button
            onClick={() => setActiveTab('scores')}
            className={`flex-1 lg:flex-initial text-center px-6 py-3.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'scores' 
                ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <Award className="h-4 w-4" />
            <span>رصد النقط والفروض</span>
          </button>
          
          <button
            onClick={() => setActiveTab('absences')}
            className={`flex-1 lg:flex-initial text-center px-6 py-3.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'absences' 
                ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>دفتر غياب التلاميذ</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex-1 lg:flex-initial text-center px-6 py-3.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'documents' 
                ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <FolderOpen className="h-4 w-4" />
            <span>حقيبة الوثائق التربوية</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 lg:flex-initial text-center px-6 py-3.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'notes' 
                ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>الملاحظات الشخصية للطلبة</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex-1 lg:flex-initial text-center px-6 py-3.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'accounts' 
                ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>إدارة حسابات التلاميذ</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 lg:flex-initial text-center px-6 py-3.5 rounded-xl text-xs font-black transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap ${
              activeTab === 'settings' 
                ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-md' 
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/50'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>إعدادات البوابة والحساب</span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full lg:w-auto justify-end">
          <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 shrink-0">
            <Layers className="h-4 w-4 text-sky-500" />
            تصفية الملفات حسب فئة القسم:
          </span>
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 w-full sm:w-auto">
            {(session.assignedClasses || []).length > 1 && (
              <button
                onClick={() => setViewLevel('all')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  viewLevel === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/40'
                }`}
              >
                جميع الوافدين
              </button>
            )}
            {(session.assignedClasses || []).includes('5') && (
              <button
                onClick={() => setViewLevel('5')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  viewLevel === '5' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/40'
                }`}
              >
                المستوى الخامس
              </button>
            )}
            {(session.assignedClasses || []).includes('6') && (
              <button
                onClick={() => setViewLevel('6')}
                className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  viewLevel === '6' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/40'
                }`}
              >
                المستوى السادس
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 pb-12">
        
        {/* TAB 1: EXERCISES */}
        {activeTab === 'exercises' && (
          <>
            {/* Exercise Submission Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-lg shadow-sky-100/10">
                <h2 className="text-sm sm:text-base font-black text-slate-850 pb-3 border-b border-sky-50 mb-5 flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-amber-100 text-amber-600 rounded-lg text-xs font-black">+</span>
                  <span>إرسال تعيين أو فرض مصنف جديد</span>
                </h2>
                
                <form onSubmit={handleAddExercise} className="space-y-5">
                  {exerciseError && (
                    <div className="bg-red-50 text-red-800 border-r-4 border-red-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <span>{exerciseError}</span>
                    </div>
                  )}
                  {exerciseSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 border-r-4 border-emerald-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{exerciseSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">
                      محتوى الواجب المدرسي (موجز التمرين):
                    </label>
                    <textarea
                      required
                      rows={5}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-sm font-semibold text-slate-800 placeholder:text-slate-400 transition-all duration-200"
                      placeholder="امثلة: تمرين 3 صفحة 45 من كتاب التلميذ في مادة الرياضيات، أو نص فرض منزلي..."
                      value={exerciseText}
                      onChange={(e) => setExerciseText(e.target.value)}
                    />
                  </div>

                  {/* Radio Buttons group for Target Level as strictly requested */}
                  <div className="space-y-2">
                    <span className="block text-xs font-extrabold text-slate-700">
                      الفئة المستهدفة للمستويات (أزرار الاختيار):
                    </span>
                    <div className="flex flex-col sm:flex-row gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                      {session.assignedClasses?.includes('5') && (
                        <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-1.5">
                          <input
                            type="radio"
                            name="exerciseLevel"
                            value="5"
                            checked={exerciseLevel === '5'}
                            onChange={() => setExerciseLevel('5')}
                            className="accent-sky-500 h-4.5 w-4.5 cursor-pointer"
                          />
                          <span>المستوى الخامس ابتدائي</span>
                        </label>
                      )}
                      {session.assignedClasses?.includes('6') && (
                        <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-1.5">
                          <input
                            type="radio"
                            name="exerciseLevel"
                            value="6"
                            checked={exerciseLevel === '6'}
                            onChange={() => setExerciseLevel('6')}
                            className="accent-sky-500 h-4.5 w-4.5 cursor-pointer"
                          />
                          <span>المستوى السادس ابتدائي</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">
                      تصنيف السجل والنشاط:
                    </label>
                    <select
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-sm font-bold text-slate-800 transition-all duration-200"
                      value={exerciseCategory}
                      onChange={(e: any) => setExerciseCategory(e.target.value)}
                    >
                      <option value="تمرين">✏️ تمرين تطبيقي / نشاط منزلي</option>
                      <option value="فرض">📝 فرض موحد أو فصلي</option>
                      <option value="مراقبة مستمرة">⭐ مراقبة مستمرة دورية</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all duration-255 cursor-pointer shadow-lg shadow-sky-100 flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>إرسال الواجب وحفظه على السحابة</span>
                  </button>
                </form>
              </div>

              {/* AI INTERACTIVE QUESTION GENERATOR (Bento Card Embedded) */}
              <div className="bg-gradient-to-br from-indigo-50/55 via-white to-sky-50/35 border-2 border-indigo-100 rounded-3xl p-6 shadow-lg shadow-indigo-100/10">
                <h2 className="text-sm sm:text-base font-black text-indigo-950 pb-3 border-b border-indigo-100/50 mb-5 flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-indigo-100 text-indigo-650 rounded-lg text-xs font-black animate-pulse">✨</span>
                  <span>المولد الذكي للأسئلة التفاعلية (AI)</span>
                </h2>

                <form onSubmit={handleGenerateAiQuestion} className="space-y-4">
                  {aiGeneratorError && (
                    <div className="bg-red-50 text-red-800 border-r-4 border-red-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <span>{aiGeneratorError}</span>
                    </div>
                  )}
                  {aiGeneratorSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 border-r-4 border-emerald-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{aiGeneratorSuccess}</span>
                    </div>
                  )}

                  {/* Level dropdown selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-indigo-900">
                      المستوى الدراسي المستهدف للتأطير:
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-white border border-slate-205 rounded-2xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/40 text-xs font-bold text-slate-800 transition-all duration-200 cursor-pointer"
                      value={aiLevel}
                      onChange={(e: any) => setAiLevel(e.target.value)}
                    >
                      {session.assignedClasses?.includes('5') && <option value="5">🏫 المستوى الخامس ابتدائي</option>}
                      {session.assignedClasses?.includes('6') && <option value="6">🏫 المستوى السادس ابتدائي</option>}
                    </select>
                  </div>

                  {/* Component dropdown selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-indigo-900">
                      المكون الدراسي المستهدف:
                    </label>
                    <select
                      className="w-full px-4 py-3 bg-white border border-slate-205 rounded-2xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/40 text-xs font-bold text-slate-800 transition-all duration-200 cursor-pointer"
                      value={aiComponent}
                      onChange={(e: any) => setAiComponent(e.target.value)}
                    >
                      <option value="التراكيب">📚 مكون التراكيب (العربية)</option>
                      <option value="الصرف والتحويل">📚 مكون الصرف والتحويل (العربية)</option>
                      <option value="الإملاء">📚 مكون الإملاء (العربية)</option>
                      <option value="Grammaire">Grammaire (Français)</option>
                      <option value="Conjugaison">Conjugaison (Français)</option>
                      <option value="Orthographe">Orthographe (Français)</option>
                      <option value="Lexique">Lexique (Français)</option>
                      <option value="Activités Orales">Activités Orales (Français)</option>
                      <option value="الرياضيات / Mathématiques">📐 الرياضيات / Mathématiques</option>
                    </select>
                  </div>

                  {/* Subject Language selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-indigo-900">
                      لغة الأسئلة ومنهجية التوليد:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'auto', label: '🔍 كشف تلقائي (حسب الدرس)' },
                        { id: 'ar_vocalized', label: '✍️ عربية فصيحة (كاملة التشكيل)' },
                        { id: 'fr', label: 'الفرنسية (Français)' },
                      ].map((lang) => (
                        <button
                          type="button"
                          key={lang.id}
                          onClick={() => setAiLanguage(lang.id as any)}
                          className={`py-2 px-1.5 border rounded-xl text-[10px] font-black transition cursor-pointer text-center ${
                            aiLanguage === lang.id
                              ? 'bg-indigo-50 border-indigo-400 text-indigo-600 font-extrabold ring-2 ring-indigo-100'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {lang.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lesson context field */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-indigo-900">
                      اسم الدرس المعني بالتوليد:
                    </label>
                    <input
                      required
                      type="text"
                      className="w-full px-4 py-3 bg-white border border-slate-205 rounded-2xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/40 text-xs font-bold text-slate-800 placeholder:text-slate-400 transition-all duration-200"
                      placeholder="امثلة: المفعول المطلق، الأسماء الخمسة، همزة الوصل والقطع..."
                      value={aiLessonName}
                      onChange={(e) => setAiLessonName(e.target.value)}
                    />
                  </div>

                  {/* Questions count selector */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-extrabold text-indigo-900">
                      عدد الأسئلة التفاعلية المراد صياغتها:
                    </label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        required
                        type="number"
                        min="1"
                        max="30"
                        className="w-full sm:w-28 px-4 py-3 bg-white border border-slate-205 rounded-2xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/40 text-xs font-bold text-slate-800 transition-all duration-200"
                        value={aiQuestionCount}
                        onChange={(e) => setAiQuestionCount(Math.min(30, Math.max(1, parseInt(e.target.value) || 1)))}
                      />
                      {/* Presets */}
                      <div className="flex flex-wrap gap-1 items-center">
                        {[3, 5, 8, 10, 15, 20].map((num) => (
                          <button
                            type="button"
                            key={num}
                            onClick={() => setAiQuestionCount(num)}
                            className={`px-3 py-2 text-[10px] font-black rounded-xl transition border cursor-pointer ${
                              aiQuestionCount === num
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 block pr-1.5 select-none leading-relaxed">
                      💡 يمكنك كتابة أي رقم تريده مباشرة في خانة الإدخال (مثلاً: 3، 6، 8، 12، 16...). الحد الأقصى الموصى به لضمان استقرار البناء هو 25 سؤالاً.
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isAiGenerating}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-350 disabled:to-slate-450 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-98"
                  >
                    {isAiGenerating ? (
                      <>
                        <div className="h-4 w-4 border-2 border-t-white border-white/30 rounded-full animate-spin" />
                        <span>جاري صياغة وتوليد {aiQuestionCount} أسئلة ذكية...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>توليد الأسئلة بـ (Gemini ✨)</span>
                      </>
                    )}
                  </button>
                </form>

                {/* AI Question preview & editor */}
                {showAiPreview && aiGeneratedQuestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 pt-5 border-t-2 border-dashed border-indigo-100 space-y-5"
                  >
                    <div className="bg-indigo-50/50 p-3.5 rounded-2xl border border-indigo-100/50 text-center">
                      <span className="text-[10px] font-black text-indigo-700 block">مراجعة الأسئلة وتدقيق خياراتها قبل النشر</span>
                      <span className="text-[9px] text-indigo-550 block mt-0.5">يمكنك تغيير وصقل أي قيمة أو نص مباشرة من الخانات أدناه</span>
                    </div>

                    <div className="space-y-6">
                      {aiGeneratedQuestions.map((qItem, idx) => (
                        <div key={idx} className="bg-slate-50/50 rounded-2xl p-4 border border-slate-200 relative space-y-3.5">
                          <div className="flex justify-between items-center border-b border-slate-200/60 pb-2">
                            <span className="text-[11px] font-black text-indigo-900 bg-indigo-50 px-2.5 py-1 rounded-lg">السؤال المولد رقم {idx + 1}</span>
                            <button
                              type="button"
                              onClick={() => setAiGeneratedQuestions(prev => prev.filter((_, i) => i !== idx))}
                              className="text-[9px] text-red-600 hover:text-red-800 font-bold bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition-all"
                            >
                              إلغاء هذا السؤال ✕
                            </button>
                          </div>

                          <div className="space-y-3">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-extrabold text-indigo-950">نص المضمون:</label>
                              <textarea
                                rows={2}
                                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 text-xs font-semibold text-slate-800"
                                value={qItem.question}
                                onChange={(e) => handleEditAiQuestionField(idx, 'question', e.target.value)}
                              />
                            </div>

                            <div className="grid grid-cols-1 gap-2.5">
                              <div className="space-y-0.5">
                                <label className="block text-[9px] font-extrabold text-emerald-700">✔️ الخيار الصحيح المعوّل عليه:</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-1.5 bg-white border border-emerald-100 rounded-xl focus:outline-none focus:border-emerald-400 text-xs font-bold text-emerald-900 border-r-4 border-r-emerald-500 shadow-sm"
                                  value={qItem.correctAnswer}
                                  onChange={(e) => handleEditAiQuestionField(idx, 'correctAnswer', e.target.value)}
                                />
                              </div>

                              <div className="space-y-0.5">
                                <label className="block text-[9px] font-extrabold text-rose-700">❌ خيار خاطئ مقترح أول:</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-1.5 bg-white border border-rose-100 rounded-xl focus:outline-none focus:border-rose-400 text-xs font-semibold text-slate-800 border-r-4 border-r-rose-450"
                                  value={qItem.wrongAnswer1}
                                  onChange={(e) => handleEditAiQuestionField(idx, 'wrongAnswer1', e.target.value)}
                                />
                              </div>

                              <div className="space-y-0.5">
                                <label className="block text-[9px] font-extrabold text-rose-700">❌ خيار خاطئ مقترح ثان:</label>
                                <input
                                  type="text"
                                  className="w-full px-3 py-1.5 bg-white border border-rose-100 rounded-xl focus:outline-none focus:border-rose-400 text-xs font-semibold text-slate-800 border-r-4 border-r-rose-455"
                                  value={qItem.wrongAnswer2}
                                  onChange={(e) => handleEditAiQuestionField(idx, 'wrongAnswer2', e.target.value)}
                                />
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handlePublishSingleAiQuestion(idx)}
                              className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200/50 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 active:scale-98"
                            >
                              <Plus className="h-4 w-4" />
                              <span>نشر هذا السؤال فقط 🚀</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {aiGeneratedQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={handlePublishAllAiQuestions}
                        className="w-full py-3.5 bg-gradient-to-r from-emerald-450 to-teal-500 hover:from-emerald-500 hover:to-teal-600 text-white text-xs font-extrabold rounded-2xl shadow-lg shadow-emerald-100 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-250 cursor-pointer flex items-center justify-center gap-2 active:scale-97"
                      >
                        <Plus className="h-4 w-4" />
                        <span>بنقرة واحدة: نشر جميع الأسئلة الـ ({aiGeneratedQuestions.length}) معاً 🎉</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Exercises List Display */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-lg shadow-sky-100/10">
                <div className="flex justify-between items-center pb-3 border-b border-sky-50 mb-5">
                  <h2 className="text-sm font-black text-slate-850 tracking-wide flex items-center gap-2">
                    <BookOpen className="h-4.5 w-4.5 text-sky-500" />
                    <span>سجل التمارين المنشورة بالمنصة</span>
                  </h2>
                  <span className="text-[10px] font-extrabold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100">
                    الإجمالي: {exercises.filter(ex => viewLevel === 'all' || ex.level === viewLevel).length} أنشطة
                  </span>
                </div>

                {isLoading ? (
                  <p className="text-xs text-sky-500 text-center py-12 font-bold">جاري تحديث السجلات...</p>
                ) : exercises.filter(ex => viewLevel === 'all' || ex.level === viewLevel).length === 0 ? (
                  <div className="text-center py-14 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6">
                    <p className="text-xs text-slate-500 font-bold">لم تقم بنشر أي تمارين في لوحة هذا القسم حتى الآن.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {exercises
                      .filter(ex => viewLevel === 'all' || ex.level === viewLevel)
                      .map((ex) => (
                        <div key={ex.id} className="border border-sky-100/60 rounded-2xl p-5 bg-gradient-to-br from-white to-sky-50/10 flex flex-col justify-between hover:border-sky-350 hover:shadow-md transition-all duration-300 gap-4">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-50 pb-2">
                              <div className="flex items-center gap-2">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                  ex.level === '5' ? 'bg-blue-50 text-blue-800 border border-blue-200' : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                                }`}>
                                  الصف {ex.level === '5' ? 'الخامس' : 'السادس'}
                                </span>
                                <span className="px-2.5 py-1 rounded-lg text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                                  {ex.category}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1 font-sans">
                                <CalendarDays className="h-3.5 w-3.5 text-sky-400" />
                                {new Date(ex.createdAt).toLocaleDateString('ar-MA')}
                              </span>
                            </div>
                            <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-line font-bold bg-white-50 p-2">{ex.text}</p>
                          </div>
                          <div className="flex justify-end pt-3 border-t border-slate-100">
                            <button
                              onClick={() => handleDeleteExercise(ex.id)}
                              className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-xl text-[10px] font-black transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>إلغاء وحذف التمرين</span>
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: SCORES */}
        {activeTab === 'scores' && (
          <>
            {/* Score Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-lg shadow-sky-100/10">
                <h2 className="text-sm sm:text-base font-black text-slate-850 pb-3 border-b border-sky-50 mb-5 flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-emerald-100 text-emerald-600 rounded-lg text-xs font-black">+</span>
                  <span>إدخال وتفتيش نقط المراقبة</span>
                </h2>
                
                <form onSubmit={handleAddScore} className="space-y-5">
                  {scoreError && (
                    <div className="bg-red-50 text-red-800 border-r-4 border-red-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <span>{scoreError}</span>
                    </div>
                  )}
                  {scoreSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 border-r-4 border-emerald-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{scoreSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">
                      اسم التلميذ(ة) الكامل كما في اللائحة الرسمية:
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-sm font-semibold text-slate-850 transition-all duration-200"
                      placeholder="امحمد الراضي الفاسي"
                      value={scoreStudentName}
                      onChange={(e) => setScoreStudentName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-extrabold text-slate-700">المستوى والقسم المستهدف:</span>
                    <div className="flex flex-col sm:flex-row gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                      {session.assignedClasses?.includes('5') && (
                        <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-1.5">
                          <input
                            type="radio"
                            name="scoreLevel"
                            value="5"
                            checked={scoreLevel === '5'}
                            onChange={() => setScoreLevel('5')}
                            className="accent-sky-500 h-4.5 w-4.5"
                          />
                          <span>المستوى الخامس</span>
                        </label>
                      )}
                      {session.assignedClasses?.includes('6') && (
                        <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-1.5">
                          <input
                            type="radio"
                            name="scoreLevel"
                            value="6"
                            checked={scoreLevel === '6'}
                            onChange={() => setScoreLevel('6')}
                            className="accent-sky-500 h-4.5 w-4.5"
                          />
                          <span>المستوى السادس</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">
                      المادة المدرسة المعنية بالتقييم:
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!!session.subject}
                      className="w-full px-4 py-3 bg-slate-100/70 border border-slate-200 rounded-2xl focus:outline-none text-sm text-slate-850 font-semibold transition-all duration-200 disabled:opacity-85"
                      placeholder="مثال: اللغة العربية، الرياضيات، النشاط العلمي"
                      value={scoreSubject}
                      onChange={(e) => setScoreSubject(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold text-slate-700">
                        معدل النقطة التربوية:
                      </label>
                      <input
                        type="text"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-sm font-sans font-black text-slate-850 transition-all duration-200"
                        placeholder="مثال: 9.50/10 أو 18/20"
                        value={scoreValue}
                        onChange={(e) => setScoreValue(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold text-slate-700">
                        تصنيف الفرض:
                      </label>
                      <select
                        className="w-full px-3 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-xs font-black text-slate-800 transition-all duration-200"
                        value={scoreType}
                        onChange={(e: any) => setScoreType(e.target.value)}
                      >
                        <option value="نقطة المراقبة المستمرة">نقط المراقبة المستمرة</option>
                        <option value="الفرض">الفرض الأساسي</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-sky-100 flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>تسجيل وإرسال النقطة</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Scores List Display */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-lg shadow-sky-100/10">
                <div className="flex justify-between items-center pb-3 border-b border-sky-50 mb-5">
                  <h2 className="text-sm font-black text-slate-850 tracking-wide flex items-center gap-2">
                    <Award className="h-4.5 w-4.5 text-sky-500" />
                    <span>سجل نقاط الفروض والمراقبة المستمرة</span>
                  </h2>
                  <span className="text-[10px] font-extrabold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100">
                    العدد الحالي: {scores.filter(sc => viewLevel === 'all' || sc.level === viewLevel).length} تلاميذ
                  </span>
                </div>

                {isLoading ? (
                  <p className="text-xs text-slate-500 text-center py-10 font-bold">جاري تحميل سجل النقط...</p>
                ) : scores.filter(sc => viewLevel === 'all' || sc.level === viewLevel).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10 font-bold bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                    لم تسجل أي نقاط رسمية للمعدلات الدراسية كإضافة حتى الآن.
                  </p>
                ) : (
                  <div className="overflow-hidden border border-sky-100 rounded-2xl shadow-inner bg-slate-50/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white font-black border-b border-slate-800">
                            <th className="p-4">اسم التلميذ(ة)</th>
                            <th className="p-4">المستوى</th>
                            <th className="p-4">المادة</th>
                            <th className="p-4">التصنيف</th>
                            <th className="p-4 text-center">المعدل</th>
                            <th className="p-4 text-center">الإجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {scores
                            .filter(sc => viewLevel === 'all' || sc.level === viewLevel)
                            .map((sc) => (
                              <tr key={sc.id} className="hover:bg-sky-50/40 text-slate-850 font-bold transition-colors duration-200">
                                <td className="p-4 text-slate-950 font-black">{sc.studentName}</td>
                                <td className="p-4">
                                  <span className={`px-2 py-0.5 text-[9px] font-bold rounded ${
                                    sc.level === '5' ? 'bg-blue-50 text-blue-800 border-r-2 border-blue-500' : 'bg-indigo-50 text-indigo-800 border-r-2 border-indigo-500'
                                  }`}>
                                    المستوى {sc.level === '5' ? '٥' : '٦'}
                                  </span>
                                </td>
                                <td className="p-4">{sc.subject}</td>
                                <td className="p-4 text-slate-500 text-[10px]">{sc.scoreType}</td>
                                <td className="p-4 font-sans font-black text-center text-blue-600 bg-sky-50/20 tracking-tight text-[13px]">
                                  {sc.scoreValue}
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => handleDeleteScore(sc.id)}
                                    className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-black transition duration-150 cursor-pointer flex items-center justify-center mx-auto"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 3: ABSENCE REGISTRY */}
        {activeTab === 'absences' && (
          <>
            {/* Absence Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-lg shadow-sky-100/10">
                <h2 className="text-sm sm:text-base font-black text-slate-850 pb-3 border-b border-sky-50 mb-5 flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-red-100 text-red-600 rounded-lg text-xs font-black">+</span>
                  <span>رصد وتسجيل غياب مبرر أو غير مبرر</span>
                </h2>
                
                <form onSubmit={handleAddAbsence} className="space-y-5">
                  {absenceError && (
                    <div className="bg-red-50 text-red-800 border-r-4 border-red-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <span>{absenceError}</span>
                    </div>
                  )}
                  {absenceSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 border-r-4 border-emerald-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{absenceSuccess}</span>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">
                      اسم التلميذ(ة) الكامل كما في السجلات:
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-sm font-semibold text-slate-850 transition-all duration-200"
                      placeholder="عبد الرحمن السلاوي"
                      value={absenceStudentName}
                      onChange={(e) => setAbsenceStudentName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-extrabold text-slate-700">المستوى والقسم التعليمي للتمدرس:</span>
                    <div className="flex flex-col sm:flex-row gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                      {session.assignedClasses?.includes('5') && (
                        <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-1.5">
                          <input
                            type="radio"
                            name="absenceLevel"
                            value="5"
                            checked={absenceLevel === '5'}
                            onChange={() => setAbsenceLevel('5')}
                            className="accent-sky-500 h-4.5 w-4.5"
                          />
                          <span>المستوى الخامس</span>
                        </label>
                      )}
                      {session.assignedClasses?.includes('6') && (
                        <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-1.5">
                          <input
                            type="radio"
                            name="absenceLevel"
                            value="6"
                            checked={absenceLevel === '6'}
                            onChange={() => setAbsenceLevel('6')}
                            className="accent-sky-500 h-4.5 w-4.5 animate-none"
                          />
                          <span>المستوى السادس</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold text-slate-700">
                        تاريخ الغياب التربوي:
                      </label>
                      <input
                        type="date"
                        required
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-sans font-black text-slate-800 transition-all duration-200 focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4"
                        value={absenceDate}
                        onChange={(e) => setAbsenceDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-xs font-extrabold text-slate-700">
                        الحالة القانونية للتبرير:
                      </label>
                      <select
                        className="w-full px-3 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-black text-slate-800 focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-2"
                        value={absenceType}
                        onChange={(e: any) => setAbsenceType(e.target.value)}
                      >
                        <option value="غياب غير مبرر">⚠️ غياب غير مبرر قانوناً</option>
                        <option value="غياب مبرر">🟢 غياب مبرر بشهادة</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs transition duration-200 cursor-pointer shadow-lg shadow-sky-100 flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>تدوين ورصد الغياب</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Absences List Display */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-lg shadow-sky-100/10">
                <div className="flex justify-between items-center pb-3 border-b border-sky-50 mb-5">
                  <h2 className="text-sm font-black text-slate-850 tracking-wide flex items-center gap-2">
                    <Calendar className="h-4.5 w-4.5 text-sky-500" />
                    <span>قائمة دفتر الغياب والانضباط المدرسي مسجل</span>
                  </h2>
                  <span className="text-[10px] font-extrabold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100">
                    الحالات المسجلة: {absences.filter(ab => viewLevel === 'all' || ab.level === viewLevel).length} حالات غياب
                  </span>
                </div>

                {isLoading ? (
                  <p className="text-xs text-slate-500 text-center py-10 font-bold">جاري تحديث قائمة الغياب...</p>
                ) : absences.filter(ab => viewLevel === 'all' || ab.level === viewLevel).length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-10 font-bold bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                    لم يُرصد أو يُدرج أي غياب تلميذ بالقسم اليوم. جميع تلاميذك منضبطون!
                  </p>
                ) : (
                  <div className="overflow-hidden border border-sky-100 rounded-2xl shadow-inner bg-slate-50/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-right text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white font-black border-b border-slate-800">
                            <th className="p-4">اسم التلميذ الكامل</th>
                            <th className="p-4">المستوى</th>
                            <th className="p-4 text-center">التاريخ المرسوم</th>
                            <th className="p-4 text-center">الوضعية القانونية</th>
                            <th className="p-4 text-center">الإجراء</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {absences
                            .filter(ab => viewLevel === 'all' || ab.level === viewLevel)
                            .map((ab) => (
                              <tr key={ab.id} className="hover:bg-sky-50/40 text-slate-850 font-bold transition-colors duration-200">
                                <td className="p-4 text-slate-950 font-black">{ab.studentName}</td>
                                <td className="p-4">المستوى {ab.level === '5' ? '٥' : '٦'}</td>
                                <td className="p-4 text-center font-sans text-slate-500">{ab.date}</td>
                                <td className="p-4 text-center">
                                  <span className={`px-2.5 py-1.5 rounded-xl text-[10px] font-extrabold ${
                                    ab.absenceType === 'غياب مبرر' 
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-150' 
                                      : 'bg-rose-50 text-rose-800 border border-rose-150'
                                  }`}>
                                    {ab.absenceType}
                                  </span>
                                </td>
                                <td className="p-4 text-center">
                                  <button
                                    onClick={() => handleDeleteAbsence(ab.id)}
                                    className="px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-[10px] font-black transition duration-150 cursor-pointer flex items-center justify-center mx-auto"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 4: EDUCATIONAL DOCUMENTS / FILE SHARING */}
        {activeTab === 'documents' && (
          <>
            {/* Document Upload Form */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-lg shadow-sky-100/10">
                <h2 className="text-sm sm:text-base font-black text-slate-850 pb-3 border-b border-sky-50 mb-5 flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-sky-100 text-sky-600 rounded-lg text-xs font-black">+</span>
                  <span>رفع ومشاركة وثيقة تربوية أو صورة</span>
                </h2>
                
                <form onSubmit={handleAddDocument} className="space-y-5">
                  {docError && (
                    <div className="bg-red-50 text-red-800 border-r-4 border-red-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                      <span>{docError}</span>
                    </div>
                  )}
                  {docSuccess && (
                    <div className="bg-emerald-50 text-emerald-800 border-r-4 border-emerald-500 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-pulse">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{docSuccess}</span>
                    </div>
                  )}

                  {/* Drag and Drop File Input Area */}
                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">
                      ملف الوثيقة (صور أو وثائق PDF، Word، ألخ..):
                    </label>
                    <div 
                      className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all duration-200 cursor-pointer ${
                        docFile 
                          ? 'border-emerald-300 bg-emerald-50/20' 
                          : 'border-sky-200 bg-sky-50/5 hover:border-sky-405 hover:bg-sky-50/10'
                      }`}
                      onClick={() => document.getElementById('pedagogical_file_input')?.click()}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          setDocFile(e.dataTransfer.files[0]);
                        }
                      }}
                    >
                      <input
                        type="file"
                        id="pedagogical_file_input"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setDocFile(e.target.files[0]);
                          }
                        }}
                      />
                      <div className="flex flex-col items-center gap-2">
                        {isUploading ? (
                          <div className="h-10 w-10 border-4 border-t-sky-500 border-sky-100 rounded-full animate-spin" />
                        ) : docFile ? (
                          <Paperclip className="h-10 w-10 text-emerald-500" />
                        ) : (
                          <UploadCloud className="h-10 w-10 text-sky-400" />
                        )}
                        <span className="text-xs font-black text-slate-700">
                          {docFile ? docFile.name : "اسحب وأدرج الملف هنا أو اضغط للتصفح"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold">
                          {docFile 
                            ? `الحجم: ${(docFile.size / 1024).toFixed(1)} كيلوبايت` 
                            : "الحد الأقصى الموصى به: 10 ميغابايت"
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Radio Buttons group for Target Level */}
                  <div className="space-y-2">
                    <span className="block text-xs font-extrabold text-slate-700">
                      الفئة المستهدفة للملخص أو الوثيقة:
                    </span>
                    <div className="flex flex-col sm:flex-row gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                      {session.assignedClasses?.includes('5') && (
                        <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-1.5">
                          <input
                            type="radio"
                            name="docLevel"
                            value="5"
                            checked={docLevel === '5'}
                            onChange={() => setDocLevel('5')}
                            className="accent-sky-500 h-4.5 w-4.5 cursor-pointer"
                          />
                          <span>المستوى الخامس ابتدائي</span>
                        </label>
                      )}
                      {session.assignedClasses?.includes('6') && (
                        <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-1.5">
                          <input
                            type="radio"
                            name="docLevel"
                            value="6"
                            checked={docLevel === '6'}
                            onChange={() => setDocLevel('6')}
                            className="accent-sky-500 h-4.5 w-4.5 cursor-pointer"
                          />
                          <span>المستوى السادس ابتدائي</span>
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">
                      تصنيف نوع الملف والوثيقة الدراسية:
                    </label>
                    <select
                      className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-sm font-bold text-slate-800 transition-all duration-200"
                      value={docFileType}
                      onChange={(e) => setDocFileType(e.target.value)}
                    >
                      <option value="وثيقة تربوية">📂 وثيقة تربوية عامة</option>
                      <option value="ملخص الدرس">📝 ملخص الدرس وتوجيهات</option>
                      <option value="تمرين مصور">🖼️ تمرين مصور / ورقة أنشطة</option>
                      <option value="صورة توضيحية">🎨 صورة توضيحية أو خطاطة</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 disabled:from-slate-350 disabled:to-slate-450 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all duration-255 cursor-pointer shadow-lg shadow-sky-100 flex items-center justify-center gap-2 active:scale-98"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    <span>{isUploading ? "جاري الرفع الآن..." : "رفع ونشر الوثيقة"}</span>
                  </button>
                </form>
              </div>
            </div>

            {/* Documents List Display */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-lg shadow-sky-100/10">
                <div className="flex justify-between items-center pb-3 border-b border-sky-50 mb-5">
                  <h2 className="text-sm font-black text-slate-850 tracking-wide flex items-center gap-2">
                    <FolderOpen className="h-4.5 w-4.5 text-sky-500" />
                    <span>خزانة الوثائق والملفات التعليمية المشتركة</span>
                  </h2>
                  <span className="text-[10px] font-extrabold text-sky-700 bg-sky-50 px-3 py-1.5 rounded-xl border border-sky-100">
                    العدد المنشور: {documents.filter(d => viewLevel === 'all' || d.level === viewLevel).length} وثائق
                  </span>
                </div>

                {isLoading ? (
                  <p className="text-xs text-sky-500 text-center py-12 font-bold">جاري تحديث قائمة الملفات...</p>
                ) : documents.filter(d => viewLevel === 'all' || d.level === viewLevel).length === 0 ? (
                  <div className="text-center py-14 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-6">
                    <p className="text-xs text-slate-500 font-bold">لم تقم بمشاركة ورفع أي وثائق تربوية تذكر في هذا الفلتر بعد.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {documents
                      .filter(d => viewLevel === 'all' || d.level === viewLevel)
                      .map((d) => (
                        <div key={d.id} className="border border-sky-100/60 rounded-2xl p-4 bg-gradient-to-br from-white to-sky-50/15 flex flex-col justify-between hover:border-sky-350 hover:shadow-md transition-all duration-300 gap-4">
                          <div className="space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-50 pb-2">
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black ${
                                d.level === '5' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'
                              }`}>
                                المستوى {d.level === '5' ? '٥' : '٦'}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[8px] bg-amber-50 text-amber-800 font-black">
                                {d.fileType}
                              </span>
                            </div>
                            <div className="flex items-start gap-2.5">
                              {d.fileUrl.startsWith('data:image') || (d.fileUrl.startsWith('http') && (d.fileUrl.includes('.jpg') || d.fileUrl.includes('.png') || d.fileUrl.includes('.jpeg') || d.fileUrl.includes('unsplash'))) ? (
                                <img 
                                  src={d.fileUrl} 
                                  alt={d.name} 
                                  referrerPolicy="no-referrer"
                                  className="h-10 w-10 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200"
                                />
                              ) : (
                                <FileText className="h-10 w-10 text-sky-500 shrink-0" />
                              )}
                              <div className="space-y-1">
                                <h3 className="text-xs font-black text-slate-800 line-clamp-2 leading-tight">
                                  {d.name}
                                </h3>
                                <p className="text-[9px] text-slate-400 font-bold font-sans">
                                  {new Date(d.createdAt).toLocaleDateString('ar-MA')}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                            <a
                              href={d.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl font-bold flex items-center gap-1"
                            >
                              <FileDown className="h-3.5 w-3.5" />
                              <span>تحميل/عرض</span>
                            </a>
                            <button
                              onClick={() => handleDeleteDocument(d.id, d.fileUrl)}
                              className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-650 rounded-xl transition-all duration-200 cursor-pointer"
                              title="حذف الملف"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 5: STUDENT NOTES */}
        {activeTab === 'notes' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-white border border-sky-100 rounded-[28px] p-6 sm:p-8 shadow-xl shadow-sky-100/10">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-sky-50 mb-6 gap-4">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="p-1 px-2.5 bg-indigo-100 text-indigo-600 rounded-xl text-xs font-black">📝</span>
                    <span>دفتر الملاحظات والتوجيهات الشخصية للطلبة</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-1 font-sans">
                    أدخل توجيهات وملاحظات بيداغوجية مخصصة لكل تلميذ لتظهر له مباشرة في حسابه الخاص.
                  </p>
                </div>
                
                <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100/60 shrink-0 select-none">
                  العدد الكلي للطلبة: {studentNotes.filter(n => viewLevel === 'all' || n.level === viewLevel).length} تلاميذ
                </span>
              </div>

              {notesSuccessMessage && (
                <div className="bg-emerald-50 text-emerald-800 border-r-4 border-emerald-500 px-5 py-3 rounded-2xl text-xs font-extrabold flex items-center justify-between gap-2 mb-6 animate-pulse">
                  <span>{notesSuccessMessage}</span>
                  <button onClick={() => setNotesSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-black cursor-pointer">✕</button>
                </div>
              )}

              {notesErrorMessage && (
                <div className="bg-red-50 text-red-800 border-r-4 border-red-500 px-5 py-3 rounded-2xl text-xs font-extrabold flex items-center justify-between gap-2 mb-6">
                  <span>{notesErrorMessage}</span>
                  <button onClick={() => setNotesErrorMessage(null)} className="text-red-500 hover:text-red-700 font-black cursor-pointer">✕</button>
                </div>
              )}

              {/* Editing Form Panel */}
              {editingStudentId && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 mb-8 space-y-4"
                >
                  <div className="flex justify-between items-center bg-slate-100/50 p-3 rounded-xl border border-slate-200/30">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800">
                      كتابة ملاحظة وتوجيه للتلميذ(ة): {" "}
                      <span className="text-indigo-650 font-black">
                        {studentNotes.find(s => s.id === editingStudentId)?.displayName}
                      </span>
                    </h3>
                    <button 
                      onClick={() => { setEditingStudentId(null); setEditingNoteValue(''); }}
                      className="text-xs font-bold text-red-500 hover:text-red-705 transition cursor-pointer"
                    >
                      إلغاء التعديل
                    </button>
                  </div>

                  {/* Suggestion presets */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] text-slate-400 font-bold">عبارات وتوجيهات جاهزة وسريعة للاستخدام:</span>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'أحسنت في الإملاء، حاول التركيز أكثر في التراكيب والقواعد.',
                        'عمل ممتاز ومجهود رائع يستحق التثمين والتشجيع، واصل تألقك!',
                        'منتبه ومشارك في الفصل، يرجى مراجعة وتثبيت قواعد الرياضيات في المنزل.',
                        'مستوى ممتاز وقدرة هائلة على الاستيعاب، استمر بالتطوير والاجتهاد.'
                      ].map((preset, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setEditingNoteValue(preset)}
                          className="bg-white hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-800 text-[10px] font-bold px-3 py-1.5 rounded-xl cursor-pointer transition whitespace-normal text-right max-w-sm"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <textarea
                      rows={3}
                      value={editingNoteValue}
                      onChange={(e) => setEditingNoteValue(e.target.value)}
                      placeholder="اكتب ملاحظة توجيهية مخصصة للتلميذ هنا... (مثلاً: 'أحسنت في الإملاء، حاول التركيز أكثر في التراكيب')"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 text-xs font-semibold text-slate-850 transition shadow-inner"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      disabled={isSavingNote}
                      onClick={() => {
                        const target = studentNotes.find(s => s.id === editingStudentId);
                        if (target) {
                          handleSaveStudentNote(target.id, target.displayName, target.level);
                        }
                      }}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-705 text-white text-xs font-black rounded-xl cursor-pointer transition flex items-center gap-2"
                    >
                      {isSavingNote ? 'جاري الحفظ...' : 'حفظ الملاحظة ونشرها'}
                    </button>
                    <button
                      onClick={() => { setEditingStudentId(null); setEditingNoteValue(''); }}
                      className="px-4 py-2.5 bg-slate-250 hover:bg-slate-300 text-slate-850 text-xs font-black rounded-xl cursor-pointer transition"
                    >
                      تراجع
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Students Directory Grid */}
              {isLoading ? (
                <div className="text-center py-16 text-indigo-500 font-bold text-xs animate-pulse">جاري جلب بيانات التلاميذ والملاحظات...</div>
              ) : studentNotes.filter(n => viewLevel === 'all' || n.level === viewLevel).length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500 font-bold">لم يعثر على تلاميذ متوافقين مع الفلتر الحالي.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {studentNotes
                    .filter(n => viewLevel === 'all' || n.level === viewLevel)
                    .map((student) => (
                      <div 
                        key={student.id}
                        className={`border rounded-2xl p-5 bg-gradient-to-br from-white to-slate-50 shadow-sm flex flex-col justify-between transition-all duration-300 gap-4 ${
                          editingStudentId === student.id
                            ? 'border-indigo-400 ring-4 ring-indigo-100 bg-indigo-50/5'
                            : 'border-slate-100 hover:border-slate-305 hover:shadow-md'
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-dashed border-slate-100 pb-2.5">
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                              student.level === '5' ? 'bg-blue-50 text-blue-700 border border-blue-100/55' : 'bg-indigo-50 text-indigo-700 border border-indigo-100/55'
                            }`}>
                              المستوى {student.level === '5' ? 'الخامس ابتدائي' : 'السادس ابتدائي'}
                            </span>
                            
                            <span className="text-[9px] text-slate-400 font-semibold bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/50">
                              {student.id.startsWith('uid_') ? 'حساب الولوج' : 'تلميذ اللائحة'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 bg-slate-100 text-slate-700 border border-slate-200/65 font-extrabold rounded-full flex items-center justify-center text-xs">
                              {student.displayName.charAt(0)}
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-slate-900 leading-none">{student.displayName}</h4>
                              <p className="text-[10px] text-slate-400 font-semibold mt-1 font-mono">@{student.username}</p>
                            </div>
                          </div>

                          {/* Existing notes preview */}
                          <div className="bg-white border border-slate-100 rounded-xl p-3 min-h-[64px] flex items-start gap-1.5 shadow-sm">
                            <span className="text-xs select-none mt-0.5">💬</span>
                            <div className="space-y-1 w-full">
                              <span className="block text-[9px] text-slate-400 font-bold">الملاحظة البيداغوجية:</span>
                              {student.notes ? (
                                <p className="text-[11px] font-bold text-slate-800 leading-normal">{student.notes}</p>
                              ) : (
                                <p className="text-[11px] text-slate-400 font-medium italic">لا توجد ملاحظة حالية لهذا التلميذ.</p>
                              )}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => {
                            setEditingStudentId(student.id);
                            setEditingNoteValue(student.notes || '');
                            setNotesSuccessMessage(null);
                            setNotesErrorMessage(null);
                          }}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                            student.notes 
                              ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-100/40' 
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-100/40'
                          }`}
                        >
                          <Smile className="h-4 w-4 shrink-0 text-current" />
                          <span>{student.notes ? 'تعديل وتحديث الملاحظة' : 'إضافة ملاحظة جديدة'}</span>
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: STUDENT ACCOUNTS */}
        {activeTab === 'accounts' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-white border border-sky-100 rounded-[28px] p-6 sm:p-8 shadow-xl shadow-sky-100/10">
              
              {/* Header Box */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-sky-50 mb-8 gap-5">
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                    <span className="p-1 px-2.5 bg-sky-100 text-sky-600 rounded-xl text-xs font-black">🔑</span>
                    <span>منظومة إعداد وتوليد حسابات ولوج تلاميذ القسم</span>
                  </h2>
                  <p className="text-xs text-slate-500 font-bold mt-1 font-sans">
                    قم بإنشاء حسابات مخصصة لتلاميذك الجدد، مع توليد فوري وتلقائي لكلمات المرور وتصدير بطاقات الولوج للتوزيع داخل الفصل.
                  </p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handlePrintAccounts}
                    className="px-5 py-3 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white text-xs font-black rounded-2xl cursor-pointer transition-all duration-300 shadow-md shadow-emerald-100 flex items-center gap-2"
                  >
                    <span>🖨️ تصدير وطباعة بطاقات التلاميذ (PDF)</span>
                  </button>
                  <span className="text-xs font-black text-sky-700 bg-sky-50 px-4 py-3 rounded-2xl border border-sky-100/60 shrink-0 select-none">
                    إجمالي الحسابات: {studentAccounts.filter(acc => viewLevel === 'all' || acc.level === viewLevel).length} حساباً
                  </span>
                </div>
              </div>

              {/* Success & Error alerts */}
              {accSuccess && (
                <div className="bg-emerald-50 text-emerald-800 border-r-4 border-emerald-500 px-5 py-3 rounded-2xl text-xs font-extrabold flex items-center justify-between gap-2 mb-6">
                  <span>{accSuccess}</span>
                  <button onClick={() => setAccSuccess(null)} className="text-emerald-500 hover:text-emerald-700 font-black cursor-pointer">✕</button>
                </div>
              )}

              {accError && (
                <div className="bg-red-50 text-red-800 border-r-4 border-red-500 px-5 py-3 rounded-2xl text-xs font-extrabold flex items-center justify-between gap-2 mb-6">
                  <span>{accError}</span>
                  <button onClick={() => setAccError(null)} className="text-red-500 hover:text-red-700 font-black cursor-pointer">✕</button>
                </div>
              )}

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Right Side: Account Generator Form */}
                <div className="xl:col-span-4 bg-slate-50 border border-slate-200/60 rounded-3xl p-6 space-y-5">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 border-b border-slate-200/50 pb-3 flex items-center gap-2">
                    <span>✨</span>
                    <span>توليد حسابات التلاميذ</span>
                  </h3>

                  <button
                    type="button"
                    onClick={() => {
                      setTeacherImportError(null);
                      setTeacherImportedList([]);
                      setShowTeacherImportModal(true);
                    }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-2xl text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-150"
                  >
                    <span>📥 استيراد وتوليد لائحة التلاميذ (Excel / CSV)</span>
                  </button>

                  <div className="text-center py-1 flex items-center justify-center gap-3">
                    <span className="h-px bg-slate-200 w-full" />
                    <span className="text-[10px] text-slate-400 font-bold whitespace-nowrap">أو توليد حساب فردي</span>
                    <span className="h-px bg-slate-200 w-full" />
                  </div>

                  <form onSubmit={handleCreateStudentAccount} className="space-y-4">
                    {/* Name Input */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        الاسم الكامل للتلميذ(ة) باللغة العربية:
                      </label>
                      <input
                        type="text"
                        required
                        value={newAccName}
                        onChange={(e) => handleNameChange(e.target.value)}
                        placeholder="مثال: يوسف الإدريسي"
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-xs font-semibold text-slate-850 transition-all shadow-sm"
                      />
                    </div>

                    {/* Class/Level Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        تحديد المستوى الدراسي:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {session.assignedClasses?.includes('5') && (
                          <button
                            type="button"
                            onClick={() => setNewAccLevel('5')}
                            className={`py-3 px-4 rounded-xl text-xs font-black border transition cursor-pointer text-center ${
                              newAccLevel === '5'
                                ? 'bg-blue-50 text-blue-700 border-blue-400 font-black ring-2 ring-blue-100'
                                : 'bg-white text-slate-600 border-slate-150 hover:bg-slate-50'
                            }`}
                          >
                            المستوى الخامس
                          </button>
                        )}
                        {session.assignedClasses?.includes('6') && (
                          <button
                            type="button"
                            onClick={() => setNewAccLevel('6')}
                            className={`py-3 px-4 rounded-xl text-xs font-black border transition cursor-pointer text-center ${
                              newAccLevel === '6'
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-400 font-black ring-2 ring-indigo-100'
                                : 'bg-white text-slate-600 border-slate-150 hover:bg-slate-50'
                            }`}
                          >
                            المستوى السادس
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Username Autofill Output Area */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        اسم المستخدم المقترح (أو المخصص):
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={newAccUsername}
                          onChange={(e) => setNewAccUsername(e.target.value.toLowerCase().trim())}
                          placeholder="سيتم توليده تلقائياً..."
                          className="w-full pl-4 pr-10 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-xs font-bold font-mono text-indigo-700 transition"
                        />
                        <span className="absolute right-3 top-3.5 text-slate-400 text-xs text-center font-bold">@</span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-bold leading-normal">
                        ملاحظة: اسم المستخدم باللغة الأجنبية للولوج السليم (مثال: <span className="font-mono">youssef25</span>)
                      </p>
                    </div>

                    {/* Password Entry Output Area */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        الرقم السري للولوج (سيتم توليده تلقائياً):
                      </label>
                      <input
                        type="text"
                        required
                        value={newAccPassword}
                        onChange={(e) => setNewAccPassword(e.target.value.trim())}
                        placeholder="سيتم توليده تلقائياً..."
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-xs font-bold font-mono text-amber-700 transition"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingAcc}
                      className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-black font-sans cursor-pointer transition shadow-md shadow-sky-500/10 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {isCreatingAcc ? 'جاري تسجيل وتوليد الحساب...' : 'توليد وتسجيل الحساب التربوي الجديد 🚀'}
                    </button>
                  </form>

                  <div className="bg-slate-100 rounded-2xl p-4 border border-slate-200/30 text-[10px] space-y-1 text-slate-500">
                    <span className="block font-black text-slate-700">💡 توجيه تربوي وإشعار الأستاذ:</span>
                    <p className="leading-relaxed">
                      عند إنشاء الحساب بنجاح، يرجى الضغط على زر <span className="font-black text-emerald-700">"تصدير وطباعة بطاقات التلاميذ"</span> لتوليد ورقة PDF فريدة وبطاقات هويات ملونة مرقمة مجهزة بخطوط القص ✂️ لتوزيعها فوراً على التلاميذ.
                    </p>
                  </div>
                </div>

                {/* Left Side: Interactive Directory Table */}
                <div className="xl:col-span-8 space-y-4">
                  
                  {/* Filter / Search Info and Stats bar */}
                  <div className="bg-slate-50/50 rounded-2xl p-4 border border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="text-xs font-black text-slate-700 flex items-center gap-1.5">
                      <span>📂</span>
                      <span>سجل إدارة المصادقة والحسابات المقيدة للطلبة المعتمدين والمحدثين:</span>
                    </span>
                    
                    <button
                      onClick={loadAllData}
                      title="تحديث البيانات"
                      className="text-xs p-2 bg-white rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition font-black cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <span>🔄</span>
                      <span>تحديث اللائحة</span>
                    </button>
                  </div>

                  {isLoading ? (
                    <div className="text-center py-20 text-sky-500 font-bold text-xs animate-pulse">جاري جلب بيانات التلاميذ والحسابات من السيرفر السحابي...</div>
                  ) : studentAccounts.filter(acc => viewLevel === 'all' || acc.level === viewLevel).length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-bold">لا توجد حسابات مسجلة تحت هذا الفلتر حالياً.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-400 font-bold">
                              <th className="py-3 px-4 text-center">الرقم</th>
                              <th className="py-3 px-4">الاسم الكامل للتلميذ(ة)</th>
                              <th className="py-3 px-4 text-center">المستوى الدراسي</th>
                              <th className="py-3 px-4">اسم المستخدم للولوج</th>
                              <th className="py-3 px-4">الرقم السري للولوج</th>
                              <th className="py-3 px-4 text-center">الإجراءات والمسح</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-800">
                            {studentAccounts
                              .filter(acc => viewLevel === 'all' || acc.level === viewLevel)
                              .map((acc, index) => (
                                <tr key={acc.id} className="hover:bg-slate-50/40 transition-colors">
                                  <td className="py-3.5 px-4 text-center text-slate-400 font-bold font-sans">{index + 1}</td>
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-2.5">
                                      <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold select-none">
                                        {acc.displayName.charAt(0)}
                                      </div>
                                      <span className="font-bold text-slate-900">{acc.displayName}</span>
                                    </div>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
                                      acc.level === '5' ? 'bg-blue-50 text-blue-700' : 'bg-indigo-50 text-indigo-700'
                                    }`}>
                                      المستوى {acc.level === '5' ? 'الخامس' : 'السادس'} ابتدائي
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 font-mono font-bold text-indigo-600">
                                    @{acc.username}
                                  </td>
                                  <td className="py-3.5 px-4 font-mono">
                                    <span className="bg-amber-50 text-amber-800 border-b border-amber-200/50 px-2 py-0.5 rounded-lg text-[10px] font-extrabold shadow-sm">
                                      {acc.password || 'primary' + acc.level}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      disabled={isDeletingAccId === acc.id}
                                      onClick={() => handleDeleteStudentAccount(acc.id, acc.displayName)}
                                      className="p-1 px-2.5 bg-red-50 text-red-500 hover:bg-red-100 rounded-lg text-[10px] font-black cursor-pointer transition flex items-center gap-1 mx-auto"
                                    >
                                      <Trash2 className="h-3.5 w-3.5 shrink-0" />
                                      <span>{isDeletingAccId === acc.id ? 'حذف...' : 'حذف'}</span>
                                    </button>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 7: PORTAL SETTINGS */}
        {activeTab === 'settings' && (
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-white border border-sky-100 rounded-[28px] p-6 sm:p-8 shadow-xl shadow-sky-100/10" dir="rtl">
              
              {/* Header Box */}
              <div className="pb-6 border-b border-sky-50 mb-8">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="p-1 px-2.5 bg-sky-100 text-sky-600 rounded-xl text-xs font-black">⚙️</span>
                  <span>لوحة التخصيص وإعدادات البوابة المتقدمة</span>
                </h2>
                <p className="text-xs text-slate-500 font-bold mt-1 font-sans">
                  من هنا يمكنك تخصيص اسمك المعتمد كأستاذ، تغيير كلمة مرور الولوج الخاصة بك، والتحكم التام في إخفاء أو تصفية بيانات المعاينة للبدء في تشغيل فضاء التدريس الحقيقي.
                </p>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* Profile Edit Column */}
                <div className="xl:col-span-6 bg-slate-50 border border-slate-200/60 rounded-3xl p-6 space-y-5">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 border-b border-slate-200/50 pb-3 flex items-center gap-2">
                    <User className="h-4 w-4 text-sky-500" />
                    <span>تخصيص الهوية الشخصية للأستاذ (أنت)</span>
                  </h3>

                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.target as HTMLFormElement;
                      const dName = (form.elements.namedItem('dispName') as HTMLInputElement).value;
                      const uName = (form.elements.namedItem('usrName') as HTMLInputElement).value;
                      const uPass = (form.elements.namedItem('usrPass') as HTMLInputElement).value;
                      
                      try {
                        await dbService.saveCustomTeacher(dName, uName, uPass);
                        alert("تم تحديث وحفظ بيانات الأستاذ الشخصية بنجاح! يرجى استخدام المعرف السري الجديد للمرة القادمة.");
                        // Force session state update
                        session.displayName = dName;
                        session.username = uName;
                        // Refresh state
                        loadAllData();
                      } catch (err) {
                        alert("حدث خطأ أثناء حفظ التعديلات.");
                      }
                    }} 
                    className="space-y-4"
                  >
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        الاسم الكامل والمحترم المعتمد للأستاذ:
                      </label>
                      <input
                        type="text"
                        name="dispName"
                        required
                        defaultValue={dbService.getCustomTeacher()?.displayName || session.displayName}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-xs font-bold text-slate-800 transition shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        اسم المستخدم الخاص بك للولوج (username):
                      </label>
                      <input
                        type="text"
                        name="usrName"
                        required
                        defaultValue={dbService.getCustomTeacher()?.username || session.username}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-xs font-bold text-slate-800 transition shadow-sm"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        رقمك السري الخاص أو الجديد:
                      </label>
                      <input
                        type="password"
                        name="usrPass"
                        required
                        defaultValue={dbService.getCustomTeacher()?.password || "123456"}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-xs font-sans font-bold text-slate-800 transition shadow-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-sky-500 hover:bg-sky-600 text-white rounded-2xl text-xs font-black cursor-pointer transition shadow-md shadow-sky-500/10 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                    >
                      <span>💾 حفظ وتأكيد بيانات الهوية الجديدة</span>
                    </button>
                  </form>
                </div>

                {/* Live Mode Controls Column */}
                <div className="xl:col-span-6 bg-slate-50 border border-slate-200/60 rounded-3xl p-6 space-y-6">
                  <h3 className="text-xs sm:text-sm font-black text-slate-800 border-b border-slate-200/50 pb-3 flex items-center gap-2">
                    <Layers className="h-4 w-4 text-emerald-500" />
                    <span>التحكم في بيانات المعاينة ونمط الفصل النظيف</span>
                  </h3>

                  <div className="space-y-4">
                    <p className="text-xs text-slate-600 font-bold leading-relaxed">
                      عند انتقالك إلى وضع الاستخدام الحقيقي مع تلاميذك الفعليين، يمكنك إخفاء جميع المعطيات والمستندات الافتراضية الملحقة تلقائياً بنقرة زر واحدة.
                    </p>

                    {/* Checkbox Card for live mode */}
                    <div 
                      onClick={() => {
                        const nextVal = localStorage.getItem('edu_hide_demo_data') === 'true' ? 'false' : 'true';
                        localStorage.setItem('edu_hide_demo_data', nextVal);
                        loadAllData();
                      }}
                      className={`p-4 rounded-2xl border cursor-pointer select-none transition ${
                        localStorage.getItem('edu_hide_demo_data') === 'true'
                          ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-100'
                          : 'bg-white border-slate-200 hover:bg-slate-100/30'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={localStorage.getItem('edu_hide_demo_data') === 'true'}
                          readOnly
                          className="mt-1 h-4 w-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-400 cursor-pointer"
                        />
                        <div className="space-y-1">
                          <p className="text-xs font-extrabold text-slate-900">حظر وإخفاء الحسابات والتمارين التجريبية</p>
                          <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
                            يقوم بركن وتجميد الفضاء التجريبي وإزالة تلاميذ (student5، student6، أحمد، عمر...) وعزل كافة وثائقهم والتمارين المدمجة، ليتبقّى فقط تلاميذك المدرجين وواجباتك المضافة.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Reset Button */}
                    <div className="bg-red-50/50 border border-red-100 rounded-2xl p-4 space-y-3">
                      <span className="block text-[11px] font-black text-red-700 flex items-center gap-1">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        تصفية كليّة فورية للفضاء
                      </span>
                      <p className="text-[10px] text-slate-550 font-bold leading-normal">
                        هل قمت بتجربة المنصة وتريد تصفية بيانات الواجبات والنقط والغيابات الوهمية للبدء كلياً كملف نظيف؟
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm("⚠️ هل أنت متأكد تماماً من تصفية لوحة المعاينة للأبد والانتقال للوضع الفعلي؟ سيقوم هذا بإخفاء كافة المستندات والتلاميذ الافتراضية.")) {
                            localStorage.setItem('edu_hide_demo_data', 'true');
                            loadAllData();
                            alert("تم التحويل بنجاح! تم تصفية نموذج العرض وتفعيل الفضاء الدراسي الفعلي باسمك.");
                          }
                        }}
                        className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black cursor-pointer transition flex items-center justify-center gap-1 shadow-sm"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>تطهير فوري وبدء التدريس الحقيقي</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            </div>
          </div>
        )}
      {showTeacherImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-100 text-right space-y-6 max-h-[90vh] overflow-y-auto"
            style={{ direction: 'rtl' }}
          >
            <div className="flex items-center justify-between border-b border-slate-150 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">📥</span>
                <div>
                  <h3 className="text-sm sm:text-base font-extrabold text-slate-900 font-sans">استيراد وتوليد حسابات التلاميذ من ملف Excel</h3>
                  <p className="text-[10px] sm:text-xs text-slate-400 font-bold">الرجاء رفع ملف يحتوي على قائمة أسماء تلاميذك لتوليد حساباتهم دفعة واحدة.</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowTeacherImportModal(false);
                  setTeacherImportedList([]);
                  setTeacherImportError(null);
                }}
                className="text-slate-400 hover:text-slate-700 font-black text-lg p-1.5 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {teacherImportError && (
              <div className="bg-red-50 text-red-800 border-r-4 border-red-500 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                <span>{teacherImportError}</span>
              </div>
            )}

            {/* Step 1: level assignment (Visible if teacher teaches both Level 5 and 6) */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">
                1. حدد المستوى المستهدف للتلاميذ المرفقين في القائمة:
              </label>
              <div className="flex gap-4">
                {session.assignedClasses?.includes('5') && (
                  <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-2">
                    <input
                      type="radio"
                      name="teacherImportLvl"
                      value="5"
                      checked={teacherImportLvl === '5'}
                      onChange={() => {
                        setTeacherImportLvl('5');
                        if (teacherImportedList.length > 0) {
                          setTeacherImportedList(prev => prev.map(item => ({ ...item, level: '5' })));
                        }
                      }}
                      className="accent-indigo-600 h-4.5 w-4.5"
                    />
                    <span>المستوى الخامس ابتدائي</span>
                  </label>
                )}
                {session.assignedClasses?.includes('6') && (
                  <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-2">
                    <input
                      type="radio"
                      name="teacherImportLvl"
                      value="6"
                      checked={teacherImportLvl === '6'}
                      onChange={() => {
                        setTeacherImportLvl('6');
                        if (teacherImportedList.length > 0) {
                          setTeacherImportedList(prev => prev.map(item => ({ ...item, level: '6' })));
                        }
                      }}
                      className="accent-indigo-600 h-4.5 w-4.5"
                    />
                    <span>المستوى السادس ابتدائي</span>
                  </label>
                )}
              </div>
            </div>

            {/* Step 2: Upload Arena */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-800">
                2. اختر ملف جدول البيانات (Excel / CSV):
              </label>
              <div 
                className="border-2 border-dashed border-slate-201 hover:border-indigo-400 bg-slate-50/50 hover:bg-indigo-50/15 rounded-3xl p-8 transition-all flex flex-col items-center justify-center text-center cursor-pointer relative"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    processTeacherFile(e.dataTransfer.files[0]);
                  }
                }}
                onClick={() => document.getElementById('teacher_excel_picker')?.click()}
              >
                <input
                  type="file"
                  id="teacher_excel_picker"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processTeacherFile(e.target.files[0]);
                    }
                  }}
                />
                <span className="text-3xl mb-3">📋</span>
                <p className="text-xs font-black text-slate-700">اسحب وألقِ ملف Excel هنا، أو انقر للتصفح واختياره</p>
                <p className="text-[10px] text-slate-400 mt-1 font-bold">ملاحظة: يجب أن يحتوي العمود الأول من الملف على الاسماء الكاملة للتلاميذ</p>
              </div>
            </div>

            {/* Step 3: Parsed Output Review table */}
            {teacherImportedList.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800 flex items-center gap-1">
                    <span>💡</span>
                    <span>تم العثور على {teacherImportedList.length} تلميذ جاهزين للاستيراد:</span>
                  </span>
                  <button
                    onClick={() => setTeacherImportedList([])}
                    className="text-red-500 hover:text-red-700 text-[10px] font-black cursor-pointer"
                  >
                    إفراغ وتغيير الملف
                  </button>
                </div>

                <div className="border border-slate-150 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-slate-50 border-b border-slate-150 sticky top-0 text-slate-500 font-extrabold text-right">
                      <tr>
                        <th className="p-2 sm:p-3 text-right">اسم التلميذ(ة)</th>
                        <th className="p-2 sm:p-3 text-center">المستوى</th>
                        <th className="p-2 sm:p-3 text-right">المعرف المقترح</th>
                        <th className="p-2 sm:p-3 text-right">كلمة المرور</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {teacherImportedList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 sm:p-3 font-semibold text-slate-800 text-right">{item.displayName}</td>
                          <td className="p-2 sm:p-3 font-extrabold text-blue-600 text-center">القسم {item.level}</td>
                          <td className="p-2 sm:p-3 font-mono text-slate-500 text-right">{item.username}</td>
                          <td className="p-2 sm:p-3 font-mono text-slate-500 text-right">{item.password}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end border-t border-slate-150 pt-5">
              <button
                type="button"
                onClick={() => {
                  setShowTeacherImportModal(false);
                  setTeacherImportedList([]);
                  setTeacherImportError(null);
                }}
                className="px-5 py-3 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-xs font-black cursor-pointer min-w-28 transition"
              >
                إلغاء الخروج
              </button>
              
              <button
                type="button"
                disabled={teacherImportedList.length === 0 || teacherIsImporting}
                onClick={handleTeacherConfirmImport}
                className="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 disabled:opacity-40 rounded-2xl text-xs font-black min-w-32 cursor-pointer transition shadow-sm flex items-center justify-center gap-2"
              >
                {teacherIsImporting ? (
                  <>
                    <div className="h-4 w-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    <span>جاري التوليد...</span>
                  </>
                ) : (
                  <>
                    <span>✔️ توليد الحسابات الآن</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </div>
  );
}
