/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { dbService } from '../lib/dbService';
import { UserSession, Exercise, Score, Absence, EduDocument } from '../types';
import { 
  GraduationCap, 
  Award, 
  Calendar, 
  BookOpen, 
  LogOut, 
  Smile, 
  Bookmark, 
  CalendarDays,
  FolderOpen,
  FileText,
  FileDown
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
  const currentLevel = session.level || '5';
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [documents, setDocuments] = useState<EduDocument[]>([]);
  const [teacherNote, setTeacherNote] = useState<string>('');
  
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | 'تمرين' | 'فرض' | 'مراقبة مستمرة'>('all');
  const [answeredQuiz, setAnsweredQuiz] = useState<{[exerciseId: string]: { selected: string; isCorrect: boolean } }>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const exData = await dbService.getExercises(currentLevel);
        const scData = await dbService.getScores(currentLevel);
        const abData = await dbService.getAbsences(currentLevel);
        const docsData = await dbService.getDocuments(currentLevel);
        let note = '';
        try {
          note = await dbService.getSingleStudentNote(session.uid);
        } catch (notesErr) {
          console.error("Error retrieving student single note:", notesErr);
        }
        
        setExercises(exData || []);
        setScores(scData || []);
        setAbsences(abData || []);
        setDocuments(docsData || []);
        setTeacherNote(note || '');
      } catch (e) {
        console.error("خطأ أثناء استرجاع بيانات الفضاء التعليمي والملفات المنشورة:", e);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [currentLevel, session.uid]);

  const filteredExercises = exercises.filter(
    ex => selectedCategoryFilter === 'all' || ex.category === selectedCategoryFilter
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 select-none" dir="rtl">
      
      {/* Student Portal Header */}
      <motion.div 
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="bg-gradient-to-r from-sky-450 via-blue-500 to-indigo-500 text-white p-6 sm:p-8 rounded-[30px] border border-sky-300 shadow-lg relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-6"
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
            <span>مرحباً بك يا بطل، {session.displayName}!</span>
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

      {/* Teacher's Note Section - Highlighted & Elegant Display */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mt-6 bg-gradient-to-br from-indigo-50 to-white border-2 border-indigo-100/80 rounded-[26px] p-6 shadow-md shadow-indigo-100/10 flex flex-col md:flex-row items-start md:items-center gap-5"
      >
        <div className="h-12 w-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-extrabold text-lg shadow-lg shadow-indigo-200 shrink-0">
          👨‍🏫
        </div>
        <div className="space-y-1.5 w-full">
          <h3 className="text-sm sm:text-base font-black text-indigo-950 flex items-center gap-2">
            <span>توجيه وملاحظة السيد الأستاذ الموجهة إليك:</span>
          </h3>
          <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-inner relative overflow-hidden">
            <div className="absolute left-3 bottom-0 text-7xl select-none opacity-[0.03] font-serif font-black">”</div>
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

      {/* Level Segregation Information Ribbon */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-teal-50/70 border-2 border-teal-100/90 text-teal-900 rounded-[22px] p-5 mt-6 text-xs sm:text-sm font-bold leading-relaxed flex items-start gap-3.5 shadow-sm shadow-emerald-50"
      >
        <div className="bg-teal-100 p-2 rounded-xl text-teal-600 shrink-0">
          <CheckCircle2 className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-xs sm:text-sm font-extrabold text-teal-950">بيان رسمي للأمان والموثوقية:</h4>
          <p className="text-teal-850 text-xs font-semibold leading-relaxed">
            لقد جرى تصفية البيانات الرسمية لمستوى تدرجك التعليمي بدقة. كافة المهام والتمارين المسحوبة من قاعدة البيانات السحابية تقتصر كلياً على فئة التلميذ المستهدفة للمستوى <span className="underline decoration-teal-400 decoration-2">{currentLevel === '5' ? 'الخامس' : 'السادس'} ابتدائي</span> لضمان تجربة تعليمية سلسة وخالية من المشتتات.
          </p>
        </div>
      </motion.div>

      {/* Main Educational Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-8">
        
        {/* Left Panel: Exercises & Active AI Questions */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white border border-sky-100 rounded-[28px] p-6 shadow-md shadow-sky-100/5">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-sky-50 mb-6 gap-4">
              <h2 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-sky-500" />
                <span>التمارين والأنشطة التقويمية المستهدفة لك</span>
              </h2>

              {/* Sub categories filter */}
              <div className="flex p-1 bg-slate-100 border border-slate-200/50 rounded-xl w-full sm:w-auto self-stretch">
                {(['all', 'تمرين', 'فرض', 'مراقبة مستمرة'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg text-[10px] font-black transition ${
                      selectedCategoryFilter === cat 
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {cat === 'all' ? 'الجميع' : cat}
                  </button>
                ))}
              </div>
            </div>

            {isLoading ? (
              <p className="text-xs text-sky-500 text-center py-12 font-bold animate-pulse">جاري جلب الواجبات المنزلية والتمارين من الخادم السحابي...</p>
            ) : filteredExercises.length === 0 ? (
              <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-2xl select-none">
                <p className="text-xs text-slate-400 font-bold">لا توجد تمارين مستهدفة نشطة في هذا الفلتر حالياً.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExercises.map((ex) => {
                  const aiParsed = parseAiQuestion(ex.description);
                  const isAnswered = !!answeredQuiz[ex.id];
                  const answerDetails = answeredQuiz[ex.id];

                  return (
                    <motion.div 
                      key={ex.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`border rounded-2xl p-5 bg-gradient-to-br from-white to-sky-50/10 flex flex-col justify-between transition gap-4 ${
                        aiParsed.isAi ? 'border-indigo-150/80 shadow-sm shadow-indigo-50' : 'border-sky-50 hover:border-sky-200'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100/60 pb-2">
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold ${
                            ex.category === 'فرض' ? 'bg-amber-50 text-amber-800' : 'bg-sky-50 text-sky-800'
                          }`}>
                            {ex.category}
                          </span>
                          <span className="text-[10px] font-sans text-slate-400 font-bold">
                            تاريخ النشر: {new Date(ex.createdAt).toLocaleDateString('ar-MA')}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                            {aiParsed.isAi && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-black">سؤال تفاعلي ذكي 🤖</span>}
                            <span>{ex.title}</span>
                          </h3>
                        </div>

                        {/* Interactive AI Quiz UI */}
                        {aiParsed.isAi && aiParsed.options ? (
                          <div className="bg-indigo-50/20 border border-indigo-100 rounded-2xl p-4 space-y-4 mt-2">
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-indigo-700 font-black block">السؤال المقترح:</span>
                              <p className="text-xs sm:text-sm text-slate-800 font-extrabold leading-relaxed">{aiParsed.question}</p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-indigo-100/50">
                              <span className="text-[10px] text-indigo-600 font-black block">حدد الإجابة الصحيحة لتتحقق من مهاراتك:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {aiParsed.options.map((opt, idx) => {
                                  let btnClass = "bg-white hover:bg-slate-50 text-slate-800 border-slate-200";
                                  if (isAnswered) {
                                    if (opt === aiParsed.correctAnswer) {
                                      btnClass = "bg-emerald-500 text-white border-emerald-500";
                                    } else if (answerDetails.selected === opt) {
                                      btnClass = "bg-red-500 text-white border-red-500";
                                    } else {
                                      btnClass = "bg-slate-100 text-slate-405 border-slate-200 opacity-60 pointer-events-none";
                                    }
                                  }

                                  return (
                                    <button
                                      key={idx}
                                      disabled={isAnswered}
                                      onClick={() => {
                                        const isCorrect = opt === aiParsed.correctAnswer;
                                        setAnsweredQuiz(prev => ({
                                          ...prev,
                                          [ex.id]: { selected: opt, isCorrect }
                                        }));
                                      }}
                                      className={`p-3 text-xs font-bold rounded-xl border text-center transition cursor-pointer ${btnClass}`}
                                    >
                                      {opt}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {isAnswered && (
                              <div className={`p-3 rounded-xl text-xs font-black flex items-center gap-2 ${
                                answerDetails.isCorrect ? 'bg-emerald-50 text-emerald-800 border border-emerald-250' : 'bg-red-50 text-red-800 border border-red-200'
                              }`}>
                                <span>{answerDetails.isCorrect ? "أحسنت! إجابتك صحيحة وممتازة 👏" : "إجابة خاطئة. حاول التفكير فيها مرة أخرى!"}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-slate-50/70 border border-slate-150 rounded-xl p-3 text-xs text-slate-700 font-bold whitespace-pre-wrap leading-relaxed shadow-inner">
                            {ex.description}
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center text-[10px] pt-2 border-t border-slate-100 text-slate-400 font-sans">
                        <span className="text-red-500 font-extrabold flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-red-400" />
                          <span>آخر أجل للتقديم: {new Date(ex.dueDate).toLocaleDateString('ar-MA')}</span>
                        </span>
                        <span className="font-extrabold text-slate-450 bg-slate-100 px-2.5 py-1 rounded-md">مادة اللغة العربية</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Shared Storage Vault component */}
          <div className="bg-white border border-sky-100 rounded-[28px] p-6 shadow-md shadow-sky-100/5">
            <h2 className="text-sm sm:text-base font-black text-slate-900 pb-4 border-b border-sky-50 mb-5 flex items-center gap-2 select-none">
              <FolderOpen className="h-5 w-5 text-sky-500" />
              <span>حقيبة الوثائق التربوية والملخصات المشتركة</span>
            </h2>

            {isLoading ? (
              <p className="text-xs text-indigo-500 text-center py-6 font-bold animate-pulse">جاري المزامنة مع الخزانة السحابية...</p>
            ) : documents.length === 0 ? (
              <p className="text-xs text-slate-405 text-center py-10 italic">لا توجد مستندات منشورة لصفك في الوقت الحالي.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map((d) => (
                  <div key={d.id} className="border border-sky-100/70 rounded-2xl p-4 bg-slate-50/50 flex flex-col justify-between gap-4 hover:shadow-md hover:bg-white transition duration-300">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <span className="px-2 py-0.5 rounded text-[8px] bg-sky-50 text-sky-800 font-black">المستوى {d.level === '5' ? '٥' : '٦'}</span>
                        <span className="text-[8px] font-black text-slate-400 font-sans">{d.fileType}</span>
                      </div>

                      <div className="flex items-start gap-2.5">
                        {d.fileUrl.startsWith('data:image') || (d.fileUrl.startsWith('http') && (d.fileUrl.includes('.jpg') || d.fileUrl.includes('.png') || d.fileUrl.includes('.jpeg') || d.fileUrl.includes('unsplash'))) ? (
                          <img 
                            src={d.fileUrl} 
                            alt={d.name} 
                            referrerPolicy="no-referrer"
                            className="h-10 w-10 rounded-lg object-cover bg-slate-100 border border-slate-200 shrink-0"
                          />
                        ) : (
                          <FileText className="h-10 w-10 text-sky-500 shrink-0" />
                        )}
                        <div className="space-y-1">
                          <h4 className="text-xs font-black text-slate-800 leading-snug line-clamp-2">{d.name}</h4>
                          <em className="text-[9px] text-slate-400 block font-sans font-bold">{new Date(d.createdAt).toLocaleDateString('ar-MA')}</em>
                        </div>
                      </div>
                    </div>

                    <a 
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-extrabold text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition"
                    >
                      <FileDown className="h-4 w-4" />
                      <span>تحميل وعرض المطبوع</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Performance & Scores Summary */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Performance tracking card */}
          <div className="bg-white border border-sky-100 rounded-[28px] p-6 shadow-md shadow-sky-100/5">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 pb-3 border-b border-sky-50 mb-4 flex items-center gap-2 select-none">
              <Award className="h-5 w-5 text-indigo-500" />
              <span>نتائجك ومعدلات الفروض المحصلة</span>
            </h2>

            {isLoading ? (
              <p className="text-xs text-slate-400 text-center py-6 font-bold animate-pulse">جاري سحب النقط...</p>
            ) : scores.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-8 italic">لم يسجل التاريخ أي معدلات بعد.</p>
            ) : (
              <div className="space-y-3">
                {scores.map((sc) => (
                  <div key={sc.id} className="p-3 bg-gradient-to-r from-slate-50 to-white border border-slate-100 rounded-xl flex justify-between items-center hover:border-sky-200 transition">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-indigo-650 font-black block">{sc.subject}</span>
                      <em className="text-[9px] text-slate-400 block not-italic font-bold">{sc.type}</em>
                    </div>
                    <span className="text-[13px] font-sans font-black text-slate-900 bg-sky-100 rounded-lg px-2.5 py-1">
                      {sc.score}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Absences count warning card */}
          <div className="bg-white border border-sky-105 rounded-[28px] p-6 shadow-sm shadow-sky-100/5">
            <h2 className="text-xs sm:text-sm font-black text-slate-900 pb-3 border-b border-sky-50 mb-4 flex items-center gap-2 select-none">
              <Calendar className="h-5 w-5 text-red-500" />
              <span>سجل التغيبات المفروضة لليقظة</span>
            </h2>

            {isLoading ? (
              <p className="text-xs text-slate-400 text-center py-6 font-bold animate-pulse">جاري القراءة...</p>
            ) : absences.length === 0 ? (
              <div className="text-center py-6 bg-emerald-50/20 border border-emerald-100 rounded-xl">
                <p className="text-[11px] text-emerald-800 font-extrabold">✓ حضورك مثالي وكامل بنسبة 100%!</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-155 text-red-955 p-3 rounded-xl text-xs font-black select-none text-center">
                  انتبه! لديك {absences.length} أيام غياب مسجلة.
                </div>
                {absences.map((ab) => (
                  <div key={ab.id} className="p-3 bg-white border border-slate-100 rounded-xl space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-sans">
                      <span className="text-red-505 font-black">{new Date(ab.date).toLocaleDateString('ar-MA')}</span>
                      <span className="text-slate-400 font-bold">المستوى {currentLevel} ابتدائي</span>
                    </div>
                    <p className="text-[11px] text-slate-700 font-semibold leading-relaxed leading-normal">{ab.reason}</p>
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
