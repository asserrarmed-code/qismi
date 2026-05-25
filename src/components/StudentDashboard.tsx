/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { dbService } from '../lib/dbService';
import { db, isFirebaseAvailable } from '../lib/firebase';
import { onSnapshot, collection, query, where, orderBy, doc } from 'firebase/firestore';
import { UserSession, Exercise, Score, Absence, EduDocument, Announcement, Timetable } from '../types';
import { 
  GraduationCap, 
  Award, 
  Calendar, 
  BookOpen, 
  Clock, 
  LogOut, 
  CheckCircle, 
  Info, 
  Sparkles, 
  Compass, 
  Smile, 
  Bookmark, 
  CheckCircle2,
  CalendarDays,
  FolderOpen,
  FileText,
  FileDown,
  User,
  School,
  Edit,
  Save,
  X,
  Megaphone,
  Bell
} from 'lucide-react';

interface StudentDashboardProps {
  session: UserSession;
  onLogout: () => void;
  firebaseStatus: string;
}

interface ParsedQuestion {
  isAi: boolean;
  component?: string;
  lesson?: string;
  question?: string;
  correctAnswer?: string;
  options?: string[];
}

function parseAiQuestion(text: string): ParsedQuestion {
  if (!text.includes("سؤال تفاعلي ذكي") && !text.includes("🤖")) {
    return { isAi: false };
  }

  try {
    const lines = text.split("\n");
    let component = "";
    let lesson = "";
    let question = "";
    let correctAnswer = "";
    let wrong1 = "";
    let wrong2 = "";

    for (const line of lines) {
      if (line.startsWith("المكون:")) {
        component = line.replace("المكون:", "").trim();
      } else if (line.startsWith("الدرس:")) {
        lesson = line.replace("الدرس:", "").trim();
      } else if (line.startsWith("السؤال:")) {
        question = line.replace("السؤال:", "").trim();
      } else if (line.startsWith("✔️ الجواب الصحيح:")) {
        correctAnswer = line.replace("✔️ الجواب الصحيح:", "").trim();
      } else if (line.startsWith("❌ خيار خاطئ أول:")) {
        wrong1 = line.replace("❌ خيار خاطئ أول:", "").trim();
      } else if (line.startsWith("❌ خيار خاطئ ثان:")) {
        wrong2 = line.replace("❌ خيار خاطئ ثان:", "").trim();
      }
    }

    if (!question || !correctAnswer) {
      // Fallback parser down the line
      const qIndex = lines.findIndex(l => l.includes("السؤال:") || l.startsWith("السؤال:"));
      if (qIndex !== -1) {
        question = lines[qIndex].replace("السؤال:", "").trim();
      }
      
      const correctLine = lines.find(l => l.includes("✔️") || l.includes("الجواب الصحيح"));
      if (correctLine) {
        correctAnswer = correctLine.replace("✔️ الجواب الصحيح:", "").replace("✔️", "").trim();
      }

      const wrong1Line = lines.find(l => l.includes("خيار خاطئ أول") || l.includes("خيار خاطئ 1"));
      if (wrong1Line) {
        wrong1 = wrong1Line.replace("❌ خيار خاطئ أول:", "").replace("❌", "").trim();
      }

      const wrong2Line = lines.find(l => l.includes("خيار خاطئ ثان") || l.includes("خيار خاطئ 2"));
      if (wrong2Line) {
        wrong2 = wrong2Line.replace("❌ خيار خاطئ ثان:", "").replace("❌", "").trim();
      }
    }

    // Stable options array sorted alphabetically so they don't shift randomly during component renders
    const rawOptions = [correctAnswer, wrong1, wrong2].filter(Boolean);
    const uniqueOptions = Array.from(new Set(rawOptions));
    const sortedOptions = [...uniqueOptions].sort((a, b) => a.localeCompare(b, 'ar'));

    return {
      isAi: true,
      component,
      lesson,
      question,
      correctAnswer,
      options: sortedOptions
    };
  } catch (e) {
    console.error("خطأ في قراءة وتحليل قالب السؤال التفاعلي:", e);
    return { isAi: false };
  }
}

export default function StudentDashboard({ session, onLogout, firebaseStatus }: StudentDashboardProps) {
  const currentLevel = session.level || '5'; // '5' or '6'
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [documents, setDocuments] = useState<EduDocument[]>([]);
  const [teacherNote, setTeacherNote] = useState<string>('');

  // Announcements & Timetables States
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'تمرين' | 'فرض' | 'مراقبة مستمرة'>('all');
  const [answeredQuiz, setAnsweredQuiz] = useState<{[exerciseId: string]: { selected: string; isCorrect: boolean } }>({});
  const [isLoading, setIsLoading] = useState(true);

  // Student profile states
  const [profileDisplayName, setProfileDisplayName] = useState<string>(session.displayName || '');
  const [schoolName, setSchoolName] = useState<string>('');
  const [arabicTeacher, setArabicTeacher] = useState<string>('');
  const [frenchMathTeacher, setFrenchMathTeacher] = useState<string>('');

  useEffect(() => {
    setIsLoading(true);

    // 1. School Name Sync
    let unsubSchool = () => {};
    if (isFirebaseAvailable) {
      try {
        unsubSchool = onSnapshot(doc(db, 'settings', 'school_config'), (docSnap) => {
          if (docSnap.exists()) {
            setSchoolName(docSnap.data().schoolName || 'مدرسة ميمونة أم المؤمنين');
          } else {
            setSchoolName('مدرسة ميمونة أم المؤمنين');
          }
        }, (err) => {
          console.warn("School onSnapshot fallback used:", err);
          dbService.getSchoolName().then(setSchoolName);
        });
      } catch (err) {
        dbService.getSchoolName().then(setSchoolName);
      }
    } else {
      dbService.getSchoolName().then(setSchoolName);
    }

    // 2. Exercises Real-time Subscription
    let unsubExercises = () => {};
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(db, 'exercises'), where('level', '==', currentLevel), orderBy('createdAt', 'desc'));
        unsubExercises = onSnapshot(q, (snapshot) => {
          let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Exercise));
          const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
          if (isHideDemo) {
            list = list.filter(ex => !['ex1', 'ex2', 'ex3', 'ex4'].includes(ex.id) && ex.authorId !== 'system_teacher');
          }
          setExercises(list);
        }, (err) => {
          console.warn("Exercises onSnapshot fallback used:", err);
          dbService.getExercises(currentLevel).then(setExercises);
        });
      } catch (err) {
        dbService.getExercises(currentLevel).then(setExercises);
      }
    } else {
      dbService.getExercises(currentLevel).then(setExercises);
    }

    // 3. Scores Real-time Subscription
    let unsubScores = () => {};
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(db, 'scores'), where('level', '==', currentLevel), orderBy('createdAt', 'desc'));
        unsubScores = onSnapshot(q, (snapshot) => {
          let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Score));
          const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
          if (isHideDemo) {
            list = list.filter(sc => !['sc1', 'sc2', 'sc3', 'sc4'].includes(sc.id));
          }
          setScores(list);
        }, (err) => {
          console.warn("Scores onSnapshot fallback used:", err);
          dbService.getScores(currentLevel).then(setScores);
        });
      } catch (err) {
        dbService.getScores(currentLevel).then(setScores);
      }
    } else {
      dbService.getScores(currentLevel).then(setScores);
    }

    // 4. Absences Real-time Subscription
    let unsubAbsences = () => {};
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(db, 'absences'), where('level', '==', currentLevel), orderBy('createdAt', 'desc'));
        unsubAbsences = onSnapshot(q, (snapshot) => {
          let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Absence));
          const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
          if (isHideDemo) {
            list = list.filter(ab => !['ab1', 'ab2'].includes(ab.id));
          }
          setAbsences(list);
        }, (err) => {
          console.warn("Absences onSnapshot fallback used:", err);
          dbService.getAbsences(currentLevel).then(setAbsences);
        });
      } catch (err) {
        dbService.getAbsences(currentLevel).then(setAbsences);
      }
    } else {
      dbService.getAbsences(currentLevel).then(setAbsences);
    }

    // 5. Educational Documents Sync
    let unsubDocs = () => {};
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(db, 'documents'), where('level', '==', currentLevel), orderBy('createdAt', 'desc'));
        unsubDocs = onSnapshot(q, (snapshot) => {
          let list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EduDocument));
          const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
          if (isHideDemo) {
            list = list.filter(docItem => !['doc1', 'doc2', 'doc3'].includes(docItem.id) && docItem.authorId !== 'system_teacher');
          }
          setDocuments(list);
        }, (err) => {
          console.warn("Documents onSnapshot fallback used:", err);
          dbService.getDocuments(currentLevel).then(setDocuments);
        });
      } catch (err) {
        dbService.getDocuments(currentLevel).then(setDocuments);
      }
    } else {
      dbService.getDocuments(currentLevel).then(setDocuments);
    }

    // 6. Student Note & Display Name Sync
    let unsubNote = () => {};
    if (isFirebaseAvailable) {
      try {
        unsubNote = onSnapshot(doc(db, 'users', session.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setTeacherNote(data.notes || '');
            if (data.displayName) {
              setProfileDisplayName(data.displayName);
            }
          } else {
            setProfileDisplayName(session.displayName || '');
          }
        }, (err) => {
          console.warn("Student notes onSnapshot fallback used:", err);
          dbService.getSingleStudentNote(session.uid).then(setTeacherNote);
          dbService.getStudentProfile(session.uid).then(profile => {
            if (profile && profile.displayName) {
              setProfileDisplayName(profile.displayName);
            }
          });
        });
      } catch (err) {
        dbService.getSingleStudentNote(session.uid).then(setTeacherNote);
      }
    } else {
      dbService.getSingleStudentNote(session.uid).then(setTeacherNote);
      setProfileDisplayName(session.displayName || '');
    }

    // 7. Announcements Sync
    let unsubAnns = () => {};
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(db, 'announcements'), where('level', '==', currentLevel), orderBy('createdAt', 'desc'));
        unsubAnns = onSnapshot(q, (snapshot) => {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Announcement));
          setAnnouncements(list);
        }, (err) => {
          console.warn("Announcements onSnapshot fallback used:", err);
          dbService.getAnnouncements(currentLevel).then(setAnnouncements);
        });
      } catch (err) {
        dbService.getAnnouncements(currentLevel).then(setAnnouncements);
      }
    } else {
      dbService.getAnnouncements(currentLevel).then(setAnnouncements);
    }

    // 8. Timetable Sync
    let unsubTimetable = () => {};
    if (isFirebaseAvailable) {
      try {
        unsubTimetable = onSnapshot(doc(db, 'timetables', `level_${currentLevel}`), (docSnap) => {
          if (docSnap.exists()) {
            setTimetable(docSnap.data() as Timetable);
          } else {
            setTimetable(null);
          }
        }, (err) => {
          console.warn("Timetable onSnapshot fallback used:", err);
          dbService.getTimetable(currentLevel as '5' | '6').then(setTimetable);
        });
      } catch (err) {
        dbService.getTimetable(currentLevel as '5' | '6').then(setTimetable);
      }
    } else {
      dbService.getTimetable(currentLevel as '5' | '6').then(setTimetable);
    }

    // 9. Assign Teachers Sync for Arab & French Level
    let unsubTeachers = () => {};
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
        unsubTeachers = onSnapshot(q, (snapshot) => {
          const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
          const teachersOfLevel = list.filter(t => t.assignedClasses && Array.isArray(t.assignedClasses) && t.assignedClasses.includes(currentLevel));

          const arabicT = teachersOfLevel.find(t => t.subject?.includes('العربية'));
          const frenchMathT = teachersOfLevel.find(t => 
            t.subject?.includes('الفرنسية') || 
            t.subject?.includes('الرياضيات') || 
            t.subject?.includes('الفرنسي') || 
            t.subject?.includes('فرنسية') || 
            t.subject?.toLowerCase().includes('french') || 
            t.subject?.toLowerCase().includes('math')
          );

          if (arabicT) {
            setArabicTeacher(arabicT.displayName || arabicT.username || 'غير محدد بعد');
          } else {
            setArabicTeacher('غير معين بعد من طرف الإدارة');
          }

          if (frenchMathT) {
            setFrenchMathTeacher(frenchMathT.displayName || frenchMathT.username || 'غير محدد بعد');
          } else {
            setFrenchMathTeacher('غير معين بعد من طرف الإدارة');
          }
        }, (err) => {
          console.warn("Teachers onSnapshot fallback used:", err);
          dbService.getTeachersForStudent(currentLevel).then((teachers) => {
            const arabicT = teachers.find(t => t.subject?.includes('العربية'));
            const frenchMathT = teachers.find(t => t.subject?.includes('الفرنسية') || t.subject?.includes('الرياضيات'));
            if (arabicT) setArabicTeacher(arabicT.displayName || arabicT.username || '');
            if (frenchMathT) setFrenchMathTeacher(frenchMathT.displayName || frenchMathT.username || '');
          });
        });
      } catch (err) {
        dbService.getTeachersForStudent(currentLevel).then((teachers) => {
          const arabicT = teachers.find(t => t.subject?.includes('العربية'));
          const frenchMathT = teachers.find(t => t.subject?.includes('الفرنسية') || t.subject?.includes('الرياضيات'));
          if (arabicT) setArabicTeacher(arabicT.displayName || arabicT.username || '');
          if (frenchMathT) setFrenchMathTeacher(frenchMathT.displayName || frenchMathT.username || '');
        });
      }
    } else {
      dbService.getTeachersForStudent(currentLevel).then((teachers) => {
        const arabicT = teachers.find(t => t.subject?.includes('العربية'));
        const frenchMathT = teachers.find(t => t.subject?.includes('الفرنسية') || t.subject?.includes('الرياضيات'));
        if (arabicT) setArabicTeacher(arabicT.displayName || arabicT.username || '');
        if (frenchMathT) setFrenchMathTeacher(frenchMathT.displayName || frenchMathT.username || '');
      });
    }

    // Set Loading to false after initiating listeners (which fire synchronously if cached, or on first network yield)
    const timeoutId = setTimeout(() => {
      setIsLoading(false);
    }, 450);

    return () => {
      unsubSchool();
      unsubExercises();
      unsubScores();
      unsubAbsences();
      unsubDocs();
      unsubNote();
      unsubAnns();
      unsubTimetable();
      unsubTeachers();
      clearTimeout(timeoutId);
    };
  }, [currentLevel, session.uid, session.displayName]);

  // Filters the exercises by category
  const filteredExercises = exercises.filter(
    ex => selectedCategoryFilter === 'all' || ex.category === selectedCategoryFilter
  );

  // Securely match student identifiers with database records
  const matchStudent = (nameFromRecord: string) => {
    if (!nameFromRecord) return false;
    const cleanRecordName = nameFromRecord.trim().toLowerCase();
    
    const username = (session.username || '').trim().toLowerCase();
    const displayName = (session.displayName || '').trim().toLowerCase();
    const stateDisplayName = (profileDisplayName || '').trim().toLowerCase();
    
    // Exact match
    if (cleanRecordName === username || cleanRecordName === displayName || cleanRecordName === stateDisplayName) {
      return true;
    }
    
    // Normalized comparison
    const normRecord = cleanRecordName.replace(/\s+/g, '');
    const normUsername = username.replace(/\s+/g, '');
    const normDisplay = displayName.replace(/\s+/g, '');
    const normStateDisplay = stateDisplayName.replace(/\s+/g, '');
    
    if (normRecord === normUsername || normRecord === normDisplay || normRecord === normStateDisplay) {
      return true;
    }

    // Substring matches
    if (displayName && displayName.length > 3 && cleanRecordName.includes(displayName)) return true;
    if (stateDisplayName && stateDisplayName.length > 3 && cleanRecordName.includes(stateDisplayName)) return true;
    
    return false;
  };

  const myScores = scores.filter(sc => matchStudent(sc.studentName));
  const myAbsences = absences.filter(ab => matchStudent(ab.studentName));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 select-none" dir="rtl">
      
      {/* Student Portal Header - Modern, Soft Educational Sky Gradient */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-gradient-to-r from-sky-400 via-blue-500 to-indigo-500 text-white p-6 sm:p-8 rounded-[30px] border border-sky-300 shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
      >
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div className="absolute left-10 bottom-0 w-24 h-24 bg-sky-300/20 rounded-full blur-lg pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/15 border border-white/25 rounded-full backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
            <Smile className="h-3.5 w-3.5 text-amber-300" />
            <span className="text-[10px] font-extrabold text-amber-200 uppercase tracking-widest">
              فضاء المعرفة المفتوح للتلاميذ وأولياء أمورهم
            </span>
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <GraduationCap className="h-8 w-8 text-amber-300 shrink-0" />
            <span>مرحباً بك يا بطل، {profileDisplayName || session.displayName}!</span>
          </h1>
          
          <p className="text-xs sm:text-sm text-sky-100 font-bold flex items-center gap-2">
            <Bookmark className="h-4 w-4 text-sky-200" />
            <span>الصف الدراسي:</span>
            <span className="bg-amber-300/20 text-amber-200 px-2.5 py-0.5 rounded-full text-xs font-black">
              المستوى {currentLevel === '5' ? 'الخامس' : 'السادس'} ابتدائي
            </span>
            <span className="text-sky-200 text-xs hidden sm:inline">|</span>
            <span className="text-sky-200 text-xs">{firebaseStatus}</span>
          </p>
        </div>

        <button
          onClick={onLogout}
          className="bg-white/15 hover:bg-white/25 border border-white/20 hover:border-white/45 text-white font-black py-3 px-6 rounded-2xl text-xs transition-all duration-300 cursor-pointer shadow-md hover:-translate-y-0.5 active:scale-95 flex items-center gap-2 self-stretch md:self-auto justify-center"
        >
          <LogOut className="h-4 w-4" />
          <span>خروج آمن من الحساب</span>
        </button>
      </motion.div>

      {/* Announcements Board - Modern Eye-Catching Banner */}
      {announcements.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.5 }}
          className="mt-6 bg-gradient-to-br from-amber-500/10 via-amber-400/5 to-white border-2 border-amber-300 rounded-[28px] p-6 shadow-md shadow-amber-200/25 space-y-4 text-right"
          dir="rtl"
        >
          <div className="flex items-center gap-3 border-b border-amber-200/50 pb-3">
            <span className="p-2.5 bg-amber-400 text-amber-950 rounded-2xl">📢</span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-amber-950">تنبيهات وإعلانات هامة من طاقم التدريس</h2>
              <p className="text-[10px] text-slate-500 font-bold">الرجاء الانتباه للمستجدات والتعليمات الأخيرة لمستواك الدراسي:</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {announcements.map((ann) => (
              <div key={ann.id} className="p-4 bg-white/80 backdrop-blur-sm border border-amber-250 hover:border-amber-400 rounded-2xl transition shadow-sm space-y-2 flex flex-col justify-between">
                <p className="text-xs font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap break-words">{ann.text}</p>
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] text-slate-400 font-bold">
                  <span>بواسطة: الأستاذ {ann.authorName}</span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(ann.createdAt).toLocaleDateString('ar-MA', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Grid: Teacher's Guidance Notes & Level Timetables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        {/* Column 1: Teacher's Note Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-100/80 rounded-[26px] p-6 shadow-md shadow-indigo-100/10 flex items-start gap-4 text-right"
          dir="rtl"
        >
          <div className="h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-lg shadow-indigo-200 shrink-0 select-none">
            👨‍🏫
          </div>
          <div className="space-y-1.5 w-full min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-2">
              <span>توجيه وملاحظة الأستاذ الموجهة إليك:</span>
            </h3>
            <div className="bg-white border border-indigo-50 rounded-2xl p-4 shadow-inner relative overflow-hidden h-[100px] overflow-y-auto">
              <div className="absolute left-3 bottom-0 text-7xl select-none opacity-[0.03] font-serif font-black pointer-events-none">”</div>
              {teacherNote ? (
                <p className="text-xs sm:text-sm font-black text-slate-800 leading-relaxed text-right relative z-10">
                  {teacherNote}
                </p>
              ) : (
                <p className="text-xs sm:text-sm italic font-bold text-slate-400 leading-relaxed text-right relative z-10">
                  أهلاً بك يا بطل! لم يرسل لك الأستاذ أي ملاحظات خاصة في الوقت الحالي. استمر بالاجتهاد والتحصيل المتميز.
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Column 2: Timetable Section */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.5 }}
          className="bg-gradient-to-br from-emerald-50 to-white border-2 border-emerald-100/80 rounded-[26px] p-6 shadow-md shadow-emerald-100/10 flex items-start gap-4 text-right"
          dir="rtl"
        >
          <div className="h-12 w-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-lg shadow-emerald-200 shrink-0 select-none">
            📅
          </div>
          <div className="space-y-1.5 w-full min-w-0">
            <h3 className="text-xs sm:text-sm font-black text-emerald-950 flex items-center justify-between">
              <span>استعمال الزمن الخاص بمستواك الدراسي:</span>
            </h3>

            <div className="bg-white border border-emerald-50 rounded-2xl p-4 shadow-inner flex flex-col justify-center items-center h-[100px] relative overflow-hidden">
              {timetable ? (
                <div className="w-full flex flex-col items-center gap-2 relative z-10">
                  <p className="text-[11px] font-bold text-slate-700 truncate max-w-full text-center" title={timetable.fileName}>
                    📂 {timetable.fileName}
                  </p>
                  <a
                    href={timetable.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-2 bg-emerald-550 hover:bg-emerald-600 text-white hover:shadow-md rounded-xl text-xs font-black transition flex items-center gap-1.5 leading-none shadow-sm cursor-pointer"
                  >
                    <FileDown className="h-4 w-4 shrink-0" />
                    <span>تحميل / عرض استعمال الزمن PDF</span>
                  </a>
                </div>
              ) : (
                <p className="text-xs sm:text-sm italic font-bold text-slate-450 leading-relaxed text-center relative z-10">
                  لم يتم رفع ملف استعمال زمن معتمد من الأستاذ لهذا المستوى بعد.
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Level Segregation Information Ribbon - Friendly warning card */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-teal-50/70 border-2 border-teal-100/90 text-teal-900 rounded-[22px] p-5 mt-6 text-xs sm:text-sm font-bold leading-relaxed flex items-start gap-3.5 shadow-sm shadow-emerald-50"
      >
        <div className="bg-teal-100 p-2 rounded-xl text-teal-600 shrink-0">
          <Compass className="h-5 w-5 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-extrabold text-teal-950 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" />
            بيان رسمي للأمان والموثوقية:
          </h4>
          <p className="text-teal-850 text-xs font-semibold leading-relaxed">
            لقد جرى تصفية البيانات الرسمية لمستوى تدرجك التعليمي بدقة. كافة المهام والتمارين المسحوبة من قاعدة البيانات السحابية تقتصر كلياً على فئة التلميذ المستهدفة للمستوى <span className="underline decoration-teal-400 decoration-2">{currentLevel === '5' ? 'الخامس' : 'السادس'} ابتدائي</span> لضمان تجربة تعليمية سلسة وخالية من المشتتات.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8 pb-12">
        
        {/* Left Column: Interactive Assigned Works / Exercises */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white/95 border border-sky-100/85 rounded-3xl p-6 shadow-xl shadow-sky-100/20 relative">
            
            <div className="absolute right-4 top-4 text-sky-400 opacity-20 hover:opacity-100 transition-opacity">
              <BookOpen className="h-10 w-10" />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-sky-100 mb-6 relative z-10">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-black text-slate-850 flex items-center gap-2">
                  <span className="p-1.5 bg-amber-100 text-amber-600 rounded-xl">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <span>الأنشطة المدرسية والواجبات المقررة</span>
                </h2>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">المهام الفردية والتمارين المنزلية التي نشرها مدرسك المعتمر</p>
              </div>
              
              {/* Category selector button tabs */}
              <div className="flex bg-slate-100 border border-slate-200/60 p-1 rounded-2xl text-xs w-full sm:w-auto overflow-x-auto gap-0.5 shrink-0 select-none">
                <button
                  onClick={() => setSelectedCategoryFilter('all')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-extrabold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    selectedCategoryFilter === 'all' 
                      ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  الكل ({exercises.length})
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('تمرين')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-extrabold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    selectedCategoryFilter === 'تمرين' 
                      ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  تمارين
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('مراقبة مستمرة')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-extrabold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    selectedCategoryFilter === 'مراقبة مستمرة' 
                      ? 'bg-gradient-to-r from-indigo-400 to-indigo-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  مراقبة
                </button>
                <button
                  onClick={() => setSelectedCategoryFilter('فرض')}
                  className={`flex-1 sm:flex-initial px-4 py-2 rounded-xl font-extrabold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                    selectedCategoryFilter === 'فرض' 
                      ? 'bg-gradient-to-r from-rose-400 to-red-500 text-white shadow-sm' 
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  فروض
                </button>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-10 h-10 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-sky-600 font-extrabold">جاري مزامنة وسحب الأنشطة من قاعدة البيانات السحابية...</p>
              </div>
            ) : filteredExercises.length === 0 ? (
              <div className="text-center py-14 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[24px] p-8 space-y-3">
                <div className="bg-slate-100 p-3 rounded-full w-14 h-14 mx-auto flex items-center justify-center text-slate-400">
                  <Smile className="h-8 w-8 text-sky-400" />
                </div>
                <h3 className="text-sm font-black text-slate-800">لا توجد أي واجبات أو أنشطة مقررة</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed max-w-sm mx-auto">
                  عمل رائع يا بطل! يبدو أنك مطلع ومستوعب لكامل الدروس الرسمية للقسم التعليمي. واصل مسارك المتميز!
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {filteredExercises.map((ex) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={ex.id} 
                    className="border border-sky-100 hover:border-sky-300 bg-gradient-to-br from-white to-sky-50/20 p-5 rounded-2xl relative shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-extrabold ${
                          ex.category === 'فرض' 
                            ? 'bg-rose-50 text-rose-800 border-2 border-rose-100' 
                            : ex.category === 'مراقبة مستمرة' 
                              ? 'bg-amber-50 text-amber-800 border-2 border-amber-200' 
                              : 'bg-emerald-50 text-emerald-800 border-2 border-emerald-200'
                        }`}>
                          {ex.category === 'فرض' ? '📝 فرض صفي' : ex.category === 'مراقبة مستمرة' ? '⭐ مراقبة دورية' : '✏️ تمرين منزلي'}
                        </span>
                        
                        <span className="px-2 py-1 bg-sky-100 text-sky-700 rounded-lg text-[9px] font-bold">
                          المستوى {ex.level}
                        </span>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 font-sans">
                        <CalendarDays className="h-3.5 w-3.5 text-sky-400" />
                        <span>{new Date(ex.createdAt).toLocaleDateString('ar-MA')}</span>
                      </div>
                    </div>
                    
                    {(() => {
                      const quiz = parseAiQuestion(ex.text);
                      if (quiz.isAi) {
                        const answerState = answeredQuiz[ex.id];
                        return (
                          <div className="space-y-4">
                            <div className="bg-gradient-to-r from-indigo-50 to-sky-50 p-4 rounded-xl border border-indigo-200 text-indigo-950 font-black text-xs flex justify-between items-center flex-wrap gap-2">
                              <span className="flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-indigo-500 animate-bounce" />
                                <span>سؤال تفاعلي ذكي مدعوم بالذكاء الاصطناعي ✨</span>
                              </span>
                              {quiz.component && (
                                <span className="bg-indigo-100/50 text-indigo-850 px-2 py-1 rounded-lg text-[10px] font-black border border-indigo-200">
                                  {quiz.component} / {quiz.lesson}
                                </span>
                              )}
                            </div>

                            <div className="p-4 bg-white rounded-xl border border-slate-100 space-y-4 shadow-sm relative">
                              <h3 className="text-xs sm:text-sm font-black text-slate-900 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                                {quiz.question}
                              </h3>

                              <div className="grid grid-cols-1 gap-2.5">
                                {quiz.options?.map((option, idx) => {
                                  const isSelected = answerState?.selected === option;
                                  const isCorrectOption = option === quiz.correctAnswer;
                                  let buttonStyle = "bg-slate-50 border border-slate-200 hover:bg-slate-100/60 text-slate-800 active:scale-99";
                                  
                                  if (answerState) {
                                    if (isCorrectOption) {
                                      buttonStyle = "bg-emerald-50 border-2 border-emerald-500 text-emerald-900 font-extrabold shadow-sm";
                                    } else if (isSelected && !isCorrectOption) {
                                      buttonStyle = "bg-rose-50 border-2 border-rose-500 text-rose-900 font-extrabold shadow-sm";
                                    } else {
                                      buttonStyle = "bg-slate-50/40 border border-slate-100 text-slate-400 opacity-60 cursor-not-allowed";
                                    }
                                  }

                                  return (
                                    <button
                                      key={idx}
                                      disabled={!!answerState}
                                      onClick={() => {
                                        const correct = option === quiz.correctAnswer;
                                        setAnsweredQuiz(prev => ({
                                          ...prev,
                                          [ex.id]: { selected: option, isCorrect: correct }
                                        }));
                                      }}
                                      className={`w-full px-4 py-3.5 rounded-xl text-xs font-bold transition-all duration-200 flex justify-between items-center cursor-pointer ${buttonStyle}`}
                                    >
                                      <span>{option}</span>
                                      {answerState && isCorrectOption && (
                                        <span className="text-emerald-600 font-extrabold text-[10px] flex items-center gap-1 bg-emerald-100/50 px-2 py-0.5 rounded-lg border border-emerald-200">
                                          <span>ممتاز! إجابة صحيحة ✔️</span>
                                        </span>
                                      )}
                                      {answerState && isSelected && !isCorrectOption && (
                                        <span className="text-rose-600 font-extrabold text-[10px] flex items-center gap-1 bg-rose-100/50 px-2 py-0.5 rounded-lg border border-rose-200">
                                          <span>حاول مجدداً ❌</span>
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>

                              {answerState && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  className={`p-4 rounded-xl border text-center text-xs font-black ${
                                    answerState.isCorrect 
                                      ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
                                      : "bg-amber-50 text-amber-800 border-amber-200"
                                  }`}
                                >
                                  {answerState.isCorrect ? (
                                    <div className="flex flex-col items-center gap-1">
                                      <span className="text-lg">🌟👏🌟</span>
                                      <span>أحسنت العمل يا بطل! إيجادك للجواب الصحيح فخر لك ولمعلمك! واصل العطاء المتميز!</span>
                                    </div>
                                  ) : (
                                    <div className="space-y-3">
                                      <p>الإجابة المختارة ليست هي الخيار الصحيح لهذا السؤال. لا تخف، الخطأ طريق الفهم! ننصحك بالتركيز والمحاولة مرة أخرى.</p>
                                      <button
                                        onClick={() => {
                                          setAnsweredQuiz(prev => {
                                            const copy = { ...prev };
                                            delete copy[ex.id];
                                            return copy;
                                          });
                                        }}
                                        className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-[10px] font-black shadow-sm cursor-pointer hover:from-amber-600 active:scale-95 transition-all"
                                      >
                                        إعادة المحاولة مجدداً 🔄
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              )}
                            </div>
                          </div>
                        );
                      } else {
                        return (
                          <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-bold whitespace-pre-line bg-white/50 p-3.5 rounded-xl border border-slate-100">
                            {ex.text}
                          </p>
                        );
                      }
                    })()}
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Educational Cabinet / Shared Documents */}
          <div className="bg-white/95 border border-sky-100/85 rounded-3xl p-6 shadow-xl shadow-sky-100/20 relative">
            <div className="absolute left-4 top-4 text-emerald-400 opacity-20 hover:opacity-100 transition-opacity">
              <FolderOpen className="h-10 w-10" />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-sky-100 mb-6 relative z-10">
              <div className="space-y-1">
                <h2 className="text-base sm:text-lg font-black text-slate-850 flex items-center gap-2">
                  <span className="p-1.5 bg-emerald-100 text-emerald-600 rounded-xl">
                    <FolderOpen className="h-4 w-4" />
                  </span>
                  <span>خزانة الوثائق والملفات التعليمية</span>
                </h2>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">ملخصات، وثائق داعمة، وخطاطات تربوية وضعها المدرس رهن إشارتك</p>
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-10 space-y-3">
                <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-emerald-600 font-extrabold">جاري مزامنة الملفات من السحابة...</p>
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 border border-dashed border-slate-200 rounded-[24px] p-6 text-xs text-slate-500 font-bold">
                لم ينشر المدرس أي صور أو وثائق دراسية لمستواك حالياً. سنخبرك عند توفرها!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map((d) => (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    key={d.id}
                    className="border border-sky-100 hover:border-sky-300 rounded-2xl p-4 bg-gradient-to-br from-white to-sky-50/15 flex flex-col justify-between hover:shadow-md transition-all duration-300 gap-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-50 pb-1.5">
                        <span className="px-2 py-0.5 rounded text-[8px] bg-emerald-50 text-emerald-700 font-black">
                          {d.fileType}
                        </span>
                        <span className="text-[9px] text-slate-400 font-bold font-sans">
                          {new Date(d.createdAt).toLocaleDateString('ar-MA')}
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
                        <div className="space-y-2">
                          <h3 className="text-xs font-black text-slate-800 line-clamp-2 leading-tight">
                            {d.name}
                          </h3>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[10px]">
                      <a
                        href={d.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gradient-to-r from-sky-400 to-emerald-500 hover:from-sky-450 hover:to-emerald-600 text-white rounded-xl font-bold flex items-center gap-1 w-full justify-center transition-all duration-200 text-xs shadow-sm"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        <span>عرض وتحميل الملف</span>
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Grades and Absences */}
        <div className="lg:col-span-4 space-y-6">

          {/* Card: Student Identity & Profile Fields */}
          <div className="bg-white/95 border border-sky-100/85 rounded-3xl p-6 shadow-xl shadow-sky-100/20 relative overflow-hidden">
            <div className="absolute left-0 top-0 w-24 h-24 bg-indigo-50/50 rounded-full blur-xl pointer-events-none" />
            <h2 className="text-sm font-black text-slate-850 pb-3 border-b border-sky-100 mb-5 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
                  <User className="h-4.5 w-4.5" />
                </span>
                <span>البطاقة الشخصية والمدرسية</span>
              </span>
            </h2>

            <div className="space-y-4">
              {/* 1. Name */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-50/30 border border-indigo-50/60">
                <div className="p-2 bg-indigo-100 text-indigo-650 rounded-xl shrink-0">
                  <User className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5 text-right w-full">
                  <span className="block text-[9px] font-black text-slate-400 leading-none">الاسم الكامل للتلميذ(ة):</span>
                  <span className="text-xs font-black text-slate-800">{profileDisplayName || session.displayName}</span>
                </div>
              </div>

              {/* 2. Level */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-sky-50/30 border border-sky-50/60">
                <div className="p-2 bg-sky-100 text-sky-650 rounded-xl shrink-0">
                  <GraduationCap className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5 text-right w-full">
                  <span className="block text-[9px] font-black text-slate-400 leading-none">المستوى الدراسي المقيد:</span>
                  <span className="text-xs font-black text-indigo-900">
                    المستوى {currentLevel === '5' ? 'الخامس' : 'السادس'} ابتدائي
                  </span>
                </div>
              </div>

              {/* 3. School Name */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-amber-50/30 border border-amber-50/60">
                <div className="p-2 bg-amber-100 text-amber-650 rounded-xl shrink-0">
                  <School className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5 text-right w-full">
                  <span className="block text-[9px] font-black text-slate-400 leading-none">المؤسسة التعليمية / المدرسة:</span>
                  <span className="text-xs font-black text-slate-800 break-all">
                    {schoolName ? schoolName : <span className="text-slate-400 italic font-bold">في انتظار التكوين من طرف الإدارة</span>}
                  </span>
                </div>
              </div>

              {/* 4. Arabic Teacher */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-50/30 border border-emerald-50/60">
                <div className="p-2.5 bg-emerald-100 text-emerald-650 rounded-xl shrink-0 text-xs font-bold">
                  📖
                </div>
                <div className="space-y-0.5 text-right w-full">
                  <span className="block text-[9px] font-black text-slate-400 leading-none">أستاذ(ة) اللغة العربية:</span>
                  <span className="text-xs font-black text-slate-800 break-all">
                    {arabicTeacher}
                  </span>
                </div>
              </div>

              {/* 5. French and Math Teacher */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50/30 border border-rose-50/60">
                <div className="p-2.5 bg-rose-100 text-rose-650 rounded-xl shrink-0 text-xs font-bold">
                  📐
                </div>
                <div className="space-y-0.5 text-right w-full">
                  <span className="block text-[9px] font-black text-slate-400 leading-none">أستاذ(ة) الفرنسية والرياضيات:</span>
                  <span className="text-xs font-black text-slate-800 break-all">
                    {frenchMathTeacher}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 1: Academic Grades / Marks */}
          <div className="bg-white/95 border border-sky-100/85 rounded-3xl p-6 shadow-xl shadow-sky-100/20 relative">
            <h2 className="text-xs sm:text-sm font-black text-slate-850 pb-3 border-b border-sky-100 mb-5 flex items-center gap-2">
              <span className="p-1.5 bg-sky-100 text-sky-600 rounded-xl">
                <Award className="h-4.5 w-4.5" />
              </span>
              <span>سجل المعدلات والنقط الدراسية</span>
            </h2>
            
            {isLoading ? (
              <div className="text-center py-8 space-y-3">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[11px] text-sky-600 font-bold">جاري المزامنة النشطة...</p>
              </div>
            ) : myScores.length === 0 ? (
              <p className="text-xs text-slate-550 text-center py-8 rounded-2xl bg-slate-50 border border-slate-150 font-bold leading-relaxed">
                لا توجد أي نقطة مسجلة لك حالياً في منظومة التقييم. واصل الاجتهاد!
              </p>
            ) : (
              <div className="space-y-3">
                {myScores.map((sc) => (
                  <div key={sc.id} className="p-4 bg-gradient-to-br from-white to-sky-50/10 border border-sky-100 rounded-2xl flex justify-between items-center hover:bg-sky-50/20 transition-all duration-200">
                    <div className="space-y-1">
                      <div className="text-xs font-black text-slate-800">{sc.studentName}</div>
                      <div className="text-[10px] text-slate-500 font-extrabold flex items-center gap-1">
                        <span className="text-sky-600 font-bold">{sc.subject}</span>
                        <span>•</span>
                        <span>{sc.scoreType}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs font-sans font-black text-white bg-gradient-to-r from-sky-500 to-indigo-500 rounded-xl px-3 py-2 shadow-sm shadow-sky-200">
                      {sc.scoreValue}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Personal Absence Records */}
          <div className="bg-white/95 border border-sky-100/85 rounded-3xl p-6 shadow-xl shadow-sky-100/20 relative">
            <h2 className="text-xs sm:text-sm font-black text-slate-850 pb-3 border-b border-sky-100 mb-5 flex items-center gap-2">
              <span className="p-1.5 bg-sky-100 text-sky-600 rounded-xl">
                <Clock className="h-4.5 w-4.5" />
              </span>
              <span>سجل الغياب والانضباط المدرسي</span>
            </h2>

            {isLoading ? (
              <div className="text-center py-8 space-y-2">
                <div className="w-6 h-6 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-[11px] text-sky-600 font-bold">جاري القراءة...</p>
              </div>
            ) : myAbsences.length === 0 ? (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 text-emerald-900 border-2 border-emerald-100/80 p-5 rounded-2xl text-xs font-bold leading-relaxed shadow-sm shadow-emerald-50/40 flex flex-col items-center text-center gap-3">
                <div className="bg-emerald-100 p-2 rounded-full text-emerald-600">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                   <h4 className="font-extrabold text-emerald-950 text-xs">0 غياب - حضورك كامل وممتاز!</h4>
                  <p className="text-emerald-850 text-[11px] font-semibold leading-relaxed">
                    تفخر المؤسسة التربوية بأن سجل غيابك فارغ تماماً! نسبة حضورك وانضباطك الدراسي تبلغ 100%. واصل هذا العطاء المتميز!
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {myAbsences.map((ab) => (
                  <div key={ab.id} className="p-4 bg-gradient-to-br from-white to-red-50/10 border border-red-50 rounded-2xl flex justify-between items-center hover:bg-slate-50 transition-all duration-200">
                    <div className="space-y-1">
                      <div className="text-xs font-black text-slate-800">{ab.studentName}</div>
                      <div className="text-[10px] text-slate-500 font-sans font-extrabold flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-rose-400" />
                        <span>تاريخ الغياب: {ab.date}</span>
                      </div>
                    </div>
                    
                    <span className={`px-2.5 py-1.5 rounded-xl text-[9px] font-extrabold ${
                      ab.absenceType === 'غياب مبرر' 
                        ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-100/50' 
                        : 'bg-rose-50 text-rose-800 border-2 border-rose-100'
                    }`}>
                      {ab.absenceType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
        </div>
        
      </div>
    </div>
  );
}
