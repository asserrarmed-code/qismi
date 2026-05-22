/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from 'react';
import { motion } from 'motion/react';
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
  ImageIcon,
  MessageSquare
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
  const [exerciseLevel, setExerciseLevel] = useState<'5' | '6'>('5');
  const [exerciseCategory, setExerciseCategory] = useState<'تمرين' | 'فرض' | 'مراقبة مستمرة'>('تمرين');
  const [exerciseError, setExerciseError] = useState<string | null>(null);
  const [exerciseSuccess, setExerciseSuccess] = useState<string | null>(null);

  // AI Question Generator States
  const [aiLevel, setAiLevel] = useState<'5' | '6'>('5');
  const [aiComponent, setAiComponent] = useState<'التراكيب' | 'الصرف والتحويل' | 'الإملاء'>('التراكيب');
  const [aiLessonName, setAiLessonName] = useState('');
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
  const [scoreLevel, setScoreLevel] = useState<'5' | '6'>('5');
  const [scoreSubject, setScoreSubject] = useState('');
  const [scoreValue, setScoreValue] = useState('');
  const [scoreType, setScoreType] = useState<'نقطة المراقبة المستمرة' | 'الفرض'>('نقطة المراقبة المستمرة');
  const [scoreError, setScoreError] = useState<string | null>(null);
  const [scoreSuccess, setScoreSuccess] = useState<string | null>(null);

  // Absences States
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [absenceStudentName, setAbsenceStudentName] = useState('');
  const [absenceLevel, setAbsenceLevel] = useState<'5' | '6'>('5');
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().substring(0, 10));
  const [absenceType, setAbsenceType] = useState<'غياب مبرر' | 'غياب غير مبرر'>('غياب غير مبرر');
  const [absenceError, setAbsenceError] = useState<string | null>(null);
  const [absenceSuccess, setAbsenceSuccess] = useState<string | null>(null);

  // Documents States
  const [documents, setDocuments] = useState<EduDocument[]>([]);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docLevel, setDocLevel] = useState<'5' | '6'>('5');
  const [docFileType, setDocFileType] = useState('وثيقة تربوية');
  const [docError, setDocError] = useState<string | null>(null);
  const [docSuccess, setDocSuccess] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // General Filter
  const [viewLevel, setViewLevel] = useState<'all' | '5' | '6'>('all');
  const [activeTab, setActiveTab] = useState<'exercises' | 'scores' | 'absences' | 'documents' | 'notes' | 'accounts'>('exercises');

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
  const [newAccLevel, setNewAccLevel] = useState<'5' | '6'>('5');
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
        accountsData = await dbService.getStudentAccounts();
      } catch (notesErr) {
        console.error("Error loading student notes in teacher dashboard:", notesErr);
      }
      setExercises(exData || []);
      setScores(scData || []);
      setAbsences(abData || []);
      setDocuments(docsData || []);
      setStudentNotes(notesData || []);
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
          lessonName: aiLessonName.trim()
        })
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'حدث فشل غير معروف أثناء محاولة الاتصال بالسيرفر.');
      }

      if (resData.success && resData.data) {
        setAiGeneratedQuestion(resData.data.question || '');
        setAiCorrectAnswer(resData.data.correctAnswer || '');
        setAiWrongAnswer1(resData.data.wrongAnswer1 || '');
        setAiWrongAnswer2(resData.data.wrongAnswer2 || '');
        setShowAiPreview(true);
        setAiGeneratorSuccess('تم توليد السؤال بنجاح! راجع خياراته بدقة وعدلها إن لزم الأمر ثم اضغط نشر.');
      } else {
        throw new Error('الاستجابة المستلمة من السيرفر غير مطابقة للتعليمات.');
      }
    } catch (err: any) {
      setAiGeneratorError('حدث خطأ في الاتصال بنظام الذكاء الاصطناعي، يرجى التأكد من صلاحية مفتاح الـ API ومحاولة التوليد مرة أخرى.');
    } finally {
      setIsAiGenerating(false);
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
            <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse" />
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
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full lg:w-auto justify-end">
          <span className="text-xs font-black text-slate-700 flex items-center gap-1.5 shrink-0">
            <Layers className="h-4 w-4 text-sky-500" />
            تصفية الملفات حسب فئة القسم:
          </span>
          <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/60 w-full sm:w-auto">
            <button
              onClick={() => setViewLevel('all')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all duration-200 cursor-pointer whitespace-nowrap ${
                viewLevel === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:bg-white/40'
              }`}
            >
              جميع الوافدين
            </button>
            <button
              onClick={() => setViewLevel('5')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all duration-200 cursor-pointer whitespace-nowrap ${
                viewLevel === '5' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/40'
              }`}
            >
              المستوى الخامس
            </button>
            <button
              onClick={() => setViewLevel('6')}
              className={`flex-1 sm:flex-initial px-4 py-2 rounded-lg text-xs font-black transition-all duration-200 cursor-pointer whitespace-nowrap ${
                viewLevel === '6' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-600 hover:bg-white/40'
              }`}
            >
              المستوى السادس
            </button>
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
                      <option value="5">🏫 المستوى الخامس ابتدائي</option>
                      <option value="6">🏫 المستوى السادس ابتدائي</option>
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
                      <option value="التراكيب">📚 مكون التراكيب</option>
                      <option value="الصرف والتحويل">📚 مكون الصرف والتحويل</option>
                      <option value="الإملاء">📚 مكون الإملاء</option>
                    </select>
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

                  <button
                    type="submit"
                    disabled={isAiGenerating}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 disabled:from-slate-350 disabled:to-slate-450 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 active:scale-98"
                  >
                    {isAiGenerating ? (
                      <>
                        <div className="h-4 w-4 border-2 border-t-white border-white/30 rounded-full animate-spin" />
                        <span>جاري صياغة وتوليد سؤال ذكي...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 text-amber-300" />
                        <span>توليد سؤال ذكي (Gemini ✨)</span>
                      </>
                    )}
                  </button>
                </form>

                {/* AI Question preview & editor */}
                {showAiPreview && (
                  <motion.div 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 pt-5 border-t-2 border-dashed border-indigo-100 space-y-4"
                  >
                    <div className="bg-indigo-50/30 p-3 rounded-2xl border border-indigo-100/50 text-center">
                      <span className="text-[10px] font-black text-indigo-700">مراجعة وتدقيق معطيات السؤال والخيارات قبل النشر</span>
                    </div>

                    <div className="space-y-3.5">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-extrabold text-indigo-950">السؤال المولد:</label>
                        <textarea
                          rows={3}
                          className="w-full px-3.5 py-2.5 bg-white border border-indigo-100 rounded-xl focus:outline-none focus:border-indigo-455 text-xs font-semibold text-slate-800"
                          value={aiGeneratedQuestion}
                          onChange={(e) => setAiGeneratedQuestion(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-emerald-700">✔️ الجواب الصحيح المعتمد:</label>
                          <input
                            type="text"
                            className="w-full px-3.5 py-2 bg-white border border-emerald-100 rounded-xl focus:outline-none focus:border-emerald-450 text-xs font-black text-emerald-900 border-r-4 border-r-emerald-500 shadow-sm"
                            value={aiCorrectAnswer}
                            onChange={(e) => setAiCorrectAnswer(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-rose-700">❌ خيار خاطئ مقترح أول:</label>
                          <input
                            type="text"
                            className="w-full px-3.5 py-2 bg-white border border-rose-100 rounded-xl focus:outline-none focus:border-rose-455 text-xs font-semibold text-slate-850 border-r-4 border-r-rose-400"
                            value={aiWrongAnswer1}
                            onChange={(e) => setAiWrongAnswer1(e.target.value)}
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-extrabold text-rose-700">❌ خيار خاطئ مقترح ثان:</label>
                          <input
                            type="text"
                            className="w-full px-3.5 py-2 bg-white border border-rose-100 rounded-xl focus:outline-none focus:border-rose-455 text-xs font-semibold text-slate-850 border-r-4 border-r-rose-400"
                            value={aiWrongAnswer2}
                            onChange={(e) => setAiWrongAnswer2(e.target.value)}
                          />
                        </div>
                      </div>

                      <button
                        onClick={handlePublishAiQuestion}
                        className="w-full py-3 bg-gradient-to-r from-emerald-400 to-teal-500 hover:from-emerald-500 hover:to-teal-650 text-white text-xs font-bold rounded-2xl shadow-md shadow-emerald-100 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-98"
                      >
                        <Plus className="h-4 w-4" />
                        <span>نشر وتوجيه السؤال لغرفة القسم 🚀</span>
                      </button>
                    </div>
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
                                  ex.level === '5' ? 'bg-blue-50 text-blue-850 border border-blue-200' : 'bg-indigo-50 text-indigo-850 border border-indigo-200'
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
                  <span>إدخل وتفتيش نقط المراقبة</span>
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-sm font-semibold text-slate-855 transition-all duration-200"
                      placeholder="امحمد الراضي الفاسي"
                      value={scoreStudentName}
                      onChange={(e) => setScoreStudentName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-extrabold text-slate-700">المستوى والقسم المستهدف:</span>
                    <div className="flex flex-col sm:flex-row gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
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
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-extrabold text-slate-700">
                      المادة المدرسة المعنية بالتقييم:
                    </label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-sm text-slate-855 font-semibold transition-all duration-200"
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
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-sm font-sans font-black text-slate-855 transition-all duration-200"
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
                        <option value="نقطة المراقبة المستمرة font-bold">نقط المراقبة المستمرة</option>
                        <option value="الفرض font-bold">الفرض الأساسي</option>
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
                                    sc.level === '5' ? 'bg-blue-50 text-blue-805 border-r-2 border-blue-500' : 'bg-indigo-50 text-indigo-805 border-r-2 border-indigo-500'
                                  }`}>
                                    المستوى {sc.level === '5' ? '٥' : '٦'}
                                  </span>
                                </td>
                                <td className="p-4">{sc.subject}</td>
                                <td className="p-4 text-slate-505 text-[10px]">{sc.scoreType}</td>
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
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:bg-white focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-sm font-semibold text-slate-855 transition-all duration-200"
                      placeholder="عبد الرحمن السلاوي"
                      value={absenceStudentName}
                      onChange={(e) => setAbsenceStudentName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <span className="block text-xs font-extrabold text-slate-700">المستوى والقسم التعليمي للتمدرس:</span>
                    <div className="flex flex-col sm:flex-row gap-4 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
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
                      <label className="flex items-center text-xs font-bold text-slate-705 cursor-pointer select-none gap-1.5">
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
                  <p className="text-xs text-slate-505 text-center py-10 font-bold">جاري تحديث قائمة الغياب...</p>
                ) : absences.filter(ab => viewLevel === 'all' || ab.level === viewLevel).length === 0 ? (
                  <p className="text-xs text-slate-505 text-center py-10 font-bold bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
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
                              <tr key={ab.id} className="hover:bg-sky-50/40 text-slate-855 font-bold transition-colors duration-200">
                                <td className="p-4 text-slate-950 font-black">{ab.studentName}</td>
                                <td className="p-4">المستوى {ab.level === '5' ? '٥' : '٦'}</td>
                                <td className="p-4 text-center font-sans text-slate-505">{ab.date}</td>
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
                <h2 className="text-sm sm:text-base font-black text-slate-855 pb-3 border-b border-sky-50 mb-5 flex items-center gap-2">
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
                          : 'border-sky-200 bg-sky-50/5 hover:border-sky-400 hover:bg-sky-50/10'
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
                        <span className="text-xs font-black text-slate-705">
                          {docFile ? docFile.name : "اسحب وأدرج الملف هنا أو اضغط للتصفح"}
                        </span>
                        <span className="text-[10px] text-slate-405 font-bold">
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
                      <label className="flex items-center text-xs font-bold text-slate-700 cursor-pointer select-none gap-1.5">
                        <input
                          type="radio"
                          name="docLevel"
                          value="5"
                          checked={docLevel === '5'}
                          onChange={() => setNewAccLevel('5')}
                          className="accent-sky-500 h-4.5 w-4.5 cursor-pointer"
                        />
                        <span>المستوى الخامس ابتدائي</span>
                      </label>
                      <label className="flex items-center text-xs font-bold text-slate-708 cursor-pointer select-none gap-1.5">
                        <input
                          type="radio"
                          name="docLevel"
                          value="6"
                          checked={docLevel === '6'}
                          onChange={() => setNewAccLevel('6')}
                          className="accent-sky-500 h-4.5 w-4.5 cursor-pointer"
                        />
                        <span>المستوى السادس ابتدائي</span>
                      </label>
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
                    className="w-full bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-500 hover:to-blue-600 disabled:from-slate-350 disabled:to-slate-450 text-white font-extrabold py-3.5 px-4 rounded-2xl text-xs transition-all duration-250 cursor-pointer shadow-lg shadow-sky-100 flex items-center justify-center gap-2 active:scale-98"
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
                  <h2 className="text-sm font-black text-slate-855 tracking-wide flex items-center gap-2">
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
                  <div className="text-center py-14 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-205 p-6">
                    <p className="text-xs text-slate-505 font-bold">لم تقم بمشاركة ورفع أي وثائق تربوية تذكر في هذا الفلتر بعد.</p>
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
                                <p className="text-[9px] text-slate-405 font-bold font-sans">
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
                  <p className="text-xs text-slate-550 font-bold mt-1 font-sans">
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
                      كتابة ملاحظة وتوجيه للتلميذ(ها): {" "}
                      <span className="text-indigo-650 font-black">
                        {studentNotes.find(s => s.id === editingStudentId)?.displayName}
                      </span>
                    </h3>
                    <button 
                      onClick={() => { setEditingStudentId(null); setEditingNoteValue(''); }}
                      className="text-xs font-bold text-red-500 hover:text-red-700 transition cursor-pointer"
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
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100/50 text-xs font-semibold text-slate-855 transition shadow-inner"
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
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl cursor-pointer transition flex items-center gap-2"
                    >
                      {isSavingNote ? 'جاري الحفظ...' : 'حفظ الملاحظة ونشرها'}
                    </button>
                    <button
                      onClick={() => { setEditingStudentId(null); setEditingNoteValue(''); }}
                      className="px-4 py-2.5 bg-slate-250 hover:bg-slate-300 text-slate-855 text-xs font-black rounded-xl cursor-pointer transition"
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
                  <p className="text-xs text-slate-505 font-bold">لم يعثر على تلاميذ متوافقين مع الفلتر الحالي.</p>
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
                            : 'border-slate-100 hover:border-slate-300 hover:shadow-md'
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
                                <p className="text-[11px] text-slate-404 font-medium italic">لا توجد ملاحظة حالية لهذا التلميذ.</p>
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
                  <p className="text-xs text-slate-550 font-bold mt-1 font-sans">
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
                    <span>ولادة وتوليد حساب تلميذ(ة) جديد</span>
                  </h3>

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
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-xs font-semibold text-slate-855 transition-all shadow-sm"
                      />
                    </div>

                    {/* Class/Level Selector */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        تحديد المستوى الدراسي:
                      </label>
                      <div className="grid grid-cols-2 gap-3">
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
                      <p className="text-[10px] text-slate-404 font-bold leading-normal">
                        ملاحظة: اسم المستخدم باللغة الأجنبية للولوج السليم (مثال: <span className="font-mono">youssef25</span>)
                      </p>
                    </div>

                    {/* Password Entry Output Area */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-black text-slate-700">
                        الرقم السري المقترح للتسجيل والولوج:
                      </label>
                      <input
                        type="text"
                        required
                        value={newAccPassword}
                        onChange={(e) => setNewAccPassword(e.target.value)}
                        placeholder="رمز الدخول السري..."
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-sky-400 focus:ring-4 focus:ring-sky-100/50 text-xs font-bold font-mono text-amber-700 transition shadow-sm"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingAcc}
                      className="w-full py-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-750 disabled:from-slate-350 disabled:to-slate-400 text-white font-black text-xs rounded-2xl shadow-lg transition duration-200 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isCreatingAcc ? (
                        <>
                          <div className="h-4 w-4 border-2 border-t-white border-white/20 rounded-full animate-spin" />
                          <span>جاري صياغة بيانات الطالب...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 shrink-0" />
                          <span>توليد حساب التلميذ فوراً</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>

                {/* Left Side: Directory and Accounts Grid */}
                <div className="xl:col-span-8 bg-white border border-sky-100/80 rounded-3xl p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center pb-2 border-b border-sky-50">
                    <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2">
                      <span className="p-1 px-2.5 bg-sky-50 text-sky-600 rounded-lg text-[10px] font-black">📋</span>
                      <span>تلاميذ الفئة الفعالة (الحسابات المعتمدة سحابياً)</span>
                    </h3>
                  </div>

                  {isLoading ? (
                    <div className="text-center py-16 text-sky-500 font-bold text-xs animate-pulse">جاري تحميل سجل السحابة...</div>
                  ) : studentAccounts.filter(acc => viewLevel === 'all' || acc.level === viewLevel).length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-205">
                      <p className="text-xs text-slate-500 font-bold">لا يوجد أي حساب تلميذ معتمد للفلتر النشط.</p>
                    </div>
                  ) : (
                    <div className="overflow-hidden border border-slate-105 rounded-2xl shadow-inner bg-slate-50/10">
                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-900 text-white font-black border-b border-slate-800">
                              <th className="p-4">اسم التلميذ الكامل</th>
                              <th className="p-4 text-center">الصف الدراسي</th>
                              <th className="p-4">اسم المستخدم</th>
                              <th className="p-4">الرقم السري</th>
                              <th className="p-4 text-center">الإجراء</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {studentAccounts
                              .filter(acc => viewLevel === 'all' || acc.level === viewLevel)
                              .map((acc) => (
                                <tr key={acc.id} className="hover:bg-sky-50/45 text-slate-800 font-bold transition-colors duration-150">
                                  <td className="p-4 text-slate-950 font-black flex items-center gap-2.5">
                                    <div className="h-7 w-7 bg-slate-100 text-slate-700 font-black rounded-full flex items-center justify-center text-[10px] border border-slate-205">
                                      {acc.displayName.charAt(0)}
                                    </div>
                                    <span>{acc.displayName}</span>
                                  </td>
                                  <td className="p-4 text-center">
                                    <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold ${
                                      acc.level === '5' ? 'bg-blue-50 text-blue-805' : 'bg-indigo-50 text-indigo-805'
                                    }`}>
                                      المستوى {acc.level === '5' ? '٥' : '٦'} ابتدائي
                                    </span>
                                  </td>
                                  <td className="p-4 font-mono font-bold text-indigo-700">@{acc.username}</td>
                                  <td className="p-4 font-mono font-black text-amber-700 bg-amber-50/10">{acc.password || 'primary' + acc.level}</td>
                                  <td className="p-4 text-center">
                                    <button
                                      disabled={isDeletingAccId === acc.id}
                                      onClick={() => handleDeleteStudentAccount(acc.id, acc.displayName)}
                                      className="p-1.5 bg-red-50 text-red-650 hover:bg-red-100 border border-red-100 rounded-xl transition duration-150 cursor-pointer flex items-center justify-center mx-auto disabled:opacity-50"
                                      title="إلغاء وحذف الطالب"
                                    >
                                      {isDeletingAccId === acc.id ? (
                                        <div className="h-3 w-3 border-2 border-t-red-600 border-red-200 rounded-full animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3.5 w-3.5" />
                                      )}
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
      </div>
    </div>
  );
}
