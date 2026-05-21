/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  getDocFromServer,
  setDoc,
  getDoc
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, isFirebaseAvailable, auth, storage, deactivateFirebase } from './firebase';
import { UserRole, UserSession, Exercise, Score, Absence, EduDocument } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errMessage = error instanceof Error ? error.message : String(error);
  const isOffline = errMessage.includes('offline') || 
                    errMessage.includes('Failed to get document') || 
                    errMessage.includes('network') || 
                    errMessage.includes('unreachable');

  if (isOffline) {
    deactivateFirebase();
    console.warn(`Firestore network offline detected during ${operationType} on ${path}. Gracefully switching to local persistence storage.`);
    return; // Don't throw! Let the calling code fall back to local storage
  }

  const errInfo: FirestoreErrorInfo = {
    error: errMessage,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Prefabricated accounts registry - no self-registration allowed as requested
export const PRE_CREATED_ACCOUNTS = [
  {
    username: 'teacher',
    password: 'moallim2026',
    displayName: 'السيد الأستاذ المقتدر',
    role: UserRole.TEACHER,
  },
  {
    username: 'student5',
    password: 'primary5',
    displayName: 'تلميذ(ة) المستوى الخامس ابتدائي',
    role: UserRole.STUDENT_5,
    level: '5' as const,
  },
  {
    username: 'student6',
    password: 'primary6',
    displayName: 'تلميذ(ة) المستوى السادس ابتدائي',
    role: UserRole.STUDENT_6,
    level: '6' as const,
  }
];

// Helper to get local fallback items
function getLocalItems<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error(`Error loading local items for key: ${key}`, e);
    return [];
  }
}

function saveLocalItems<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error(`Error saving local items for key: ${key}`, e);
  }
}

// Ensure first-time seed data for local storage mode
const INITIAL_EXERCISES: Exercise[] = [
  {
    id: 'ex1',
    text: 'التمرين الأول في مادة اللغة العربية: اكتب فقرة إنشائية وجيزة حول أهمية المطلب الوطني والمحافظة على البيئة المدرسية.',
    level: '5',
    category: 'تمرين',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    authorId: 'system_teacher'
  },
  {
    id: 'ex2',
    text: 'مراقبة مستمرة رقم ١: حل المسألة الرياضية التالية: اشترى تاجر قطعاً من الخشب بمبلغ 4500 درهم، أحسب الربح الصافي للتاجر إذا علمت أنه باع الركام بزيادة قدرها 15%.',
    level: '5',
    category: 'مراقبة مستمرة',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    authorId: 'system_teacher'
  },
  {
    id: 'ex3',
    text: 'الفرض الأول للدورة الثانية في النشاط العلمي: أتمم تبيانة مكونات التربة والأوساط البيئية المتوازنة والمختلة، وحدد العوامل الطبيعية والبشرية لحت التربة وتدهورها.',
    level: '6',
    category: 'فرض',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    authorId: 'system_teacher'
  },
  {
    id: 'ex4',
    text: 'تمرين في الصرف والتحويل: صغ أسماء الفاعل والمفعول واسم الآلة والزمان والمكان من الأفعال المدرجة في الجدول التدريبي الدورية.',
    level: '6',
    category: 'تمرين',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    authorId: 'system_teacher'
  }
];

const INITIAL_SCORES: Score[] = [
  {
    id: 'sc1',
    studentName: 'أحمد العلمي',
    level: '5',
    subject: 'اللغة العربية',
    scoreValue: '8.5/10',
    scoreType: 'نقطة المراقبة المستمرة',
    createdAt: new Date(Date.now() - 3600000 * 50).toISOString()
  },
  {
    id: 'sc2',
    studentName: 'فاطمة الزهراء البقالي',
    level: '5',
    subject: 'الرياضيات',
    scoreValue: '9.0/10',
    scoreType: 'الفرض',
    createdAt: new Date(Date.now() - 3600000 * 40).toISOString()
  },
  {
    id: 'sc3',
    studentName: 'ياسين بنجلون',
    level: '6',
    subject: 'النشاط العلمي',
    scoreValue: '17.5/20',
    scoreType: 'الفرض',
    createdAt: new Date(Date.now() - 3600000 * 30).toISOString()
  },
  {
    id: 'sc4',
    studentName: 'مريم التازي',
    level: '6',
    subject: 'اللغة الفرنسية',
    scoreValue: '16.0/20',
    scoreType: 'نقطة المراقبة المستمرة',
    createdAt: new Date(Date.now() - 3600000 * 20).toISOString()
  }
];

const INITIAL_ABSENCES: Absence[] = [
  {
    id: 'ab1',
    studentName: 'زينب الشاوي',
    level: '5',
    date: '2026-05-18',
    absenceType: 'غياب مبرر',
    createdAt: new Date().toISOString()
  },
  {
    id: 'ab2',
    studentName: 'عمر الإدريسي',
    level: '6',
    date: '2026-05-20',
    absenceType: 'غياب غير مبرر',
    createdAt: new Date().toISOString()
  }
];

const INITIAL_DOCUMENTS: EduDocument[] = [
  {
    id: 'doc1',
    name: 'ملخص درس توازن الأوساط البيئية - النشاط العلمي',
    level: '6',
    fileType: 'ملخص الدرس',
    fileUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
    authorId: 'system_teacher'
  },
  {
    id: 'doc2',
    name: 'سلسلة تمارين الدعم والتقويم في الرياضيات والمسائل',
    level: '5',
    fileType: 'تمرين مصور',
    fileUrl: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
    createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
    authorId: 'system_teacher'
  },
  {
    id: 'doc3',
    name: 'توزيع الحصص الأسبوعية وبطافات المراجعة المدرسية',
    level: '6',
    fileType: 'وثيقة تربوية',
    fileUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800',
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    authorId: 'system_teacher'
  }
];

// Seed to localStorage if empty
if (!localStorage.getItem('edu_exercises')) {
  saveLocalItems('edu_exercises', INITIAL_EXERCISES);
}
if (!localStorage.getItem('edu_scores')) {
  saveLocalItems('edu_scores', INITIAL_SCORES);
}
if (!localStorage.getItem('edu_absences')) {
  saveLocalItems('edu_absences', INITIAL_ABSENCES);
}
if (!localStorage.getItem('edu_documents')) {
  saveLocalItems('edu_documents', INITIAL_DOCUMENTS);
}

export const DEFAULT_STUDENTS = [
  { id: 'uid_student5', username: 'student5', displayName: 'تلميذ(ة) المستوى الخامس ابتدائي', level: '5' as const },
  { id: 'uid_student6', username: 'student6', displayName: 'تلميذ(ة) المستوى السادس ابتدائي', level: '6' as const },
  { id: 'ahmed5', username: 'ahmed5', displayName: 'أحمد العلمي', level: '5' as const },
  { id: 'fatima5', username: 'fatima5', displayName: 'فاطمة الزهراء البقالي', level: '5' as const },
  { id: 'zinab5', username: 'zinab5', displayName: 'زينب الشاوي', level: '5' as const },
  { id: 'yassine6', username: 'yassine6', displayName: 'ياسين بنجلون', level: '6' as const },
  { id: 'maryam6', username: 'maryam6', displayName: 'مريم التازي', level: '6' as const },
  { id: 'omar6', username: 'omar6', displayName: 'عمر الإدريسي', level: '6' as const },
];

const INITIAL_STUDENT_NOTES = [
  { id: 'uid_student5', username: 'student5', displayName: 'تلميذ(ة) المستوى الخامس ابتدائي', level: '5', notes: 'أحسنت في الإملاء، حاول التركيز أكثر في التراكيب' },
  { id: 'uid_student6', username: 'student6', displayName: 'تلميذ(ة) المستوى السادس ابتدائي', level: '6', notes: 'مثابر ومجتهد، ممتاز في الأنشطة الصفية والمنزلية' },
];

if (!localStorage.getItem('edu_student_notes')) {
  saveLocalItems('edu_student_notes', INITIAL_STUDENT_NOTES);
}

// Active dynamic API Service
export const dbService = {
  
  // Simulated or authentic login gate
  login: async (username: string, password: string): Promise<UserSession> => {
    // Exact credentials checking matching requirements
    const matched = PRE_CREATED_ACCOUNTS.find(
      acc => acc.username.toLowerCase() === username.trim().toLowerCase() && acc.password === password
    );
    
    if (matched) {
      const session: UserSession = {
        uid: `uid_${matched.username}`,
        username: matched.username,
        role: matched.role,
        displayName: matched.displayName,
        level: matched.level
      };
      
      localStorage.setItem('edu_session', JSON.stringify(session));
      return session;
    }

    // Try dynamic student accounts!
    const accounts = await dbService.getStudentAccounts();
    const dynamicMatched = accounts.find(
      acc => acc.username.toLowerCase() === username.trim().toLowerCase() && acc.password === password
    );

    if (dynamicMatched) {
      const session: UserSession = {
        uid: dynamicMatched.id,
        username: dynamicMatched.username,
        role: dynamicMatched.level === '5' ? UserRole.STUDENT_5 : UserRole.STUDENT_6,
        displayName: dynamicMatched.displayName,
        level: dynamicMatched.level
      };
      localStorage.setItem('edu_session', JSON.stringify(session));
      return session;
    }
    
    throw new Error("بيانات الولوج خاطئة أو غير مسجلة في النظام مسبقاً.");
  },

  getCurrentSession: (): UserSession | null => {
    try {
      const raw = localStorage.getItem('edu_session');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  logout: () => {
    localStorage.removeItem('edu_session');
  },

  // 1. Core Exercise Handlers (WITH LEVEL SEGREGATION & COMPLIANT FILTERING)
  getExercises: async (level?: '5' | '6'): Promise<Exercise[]> => {
    const logPath = 'exercises';
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Exercise));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, logPath);
      }
    }
    
    // Fallback with exact segregation of levels
    const local = getLocalItems<Exercise>('edu_exercises');
    const sorted = local.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (level) {
      return sorted.filter(ex => ex.level === level);
    }
    return sorted;
  },

  addExercise: async (text: string, level: '5' | '6', category: 'تمرين' | 'فرض' | 'مراقبة مستمرة', authorId: string): Promise<Exercise> => {
    const logPath = 'exercises';
    const newEx: Omit<Exercise, 'id'> = {
      text: text.trim(),
      level,
      category,
      createdAt: new Date().toISOString(),
      authorId
    };

    if (isFirebaseAvailable) {
      try {
        const docRef = await addDoc(collection(db, logPath), newEx);
        return { id: docRef.id, ...newEx };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, logPath);
      }
    }

    const local = getLocalItems<Exercise>('edu_exercises');
    const item: Exercise = {
      id: `ex_${Date.now()}`,
      ...newEx
    };
    local.unshift(item);
    saveLocalItems('edu_exercises', local);
    return item;
  },

  deleteExercise: async (id: string): Promise<void> => {
    const logPath = `exercises/${id}`;
    if (isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, 'exercises', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
      }
    }

    const local = getLocalItems<Exercise>('edu_exercises');
    const updated = local.filter(ex => ex.id !== id);
    saveLocalItems('edu_exercises', updated);
  },

  // 2. Score/Assessment Handlers (WITH LEVEL SEGREGATION & STRICT REVIEWS)
  getScores: async (level?: '5' | '6'): Promise<Score[]> => {
    const logPath = 'scores';
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Score));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, logPath);
      }
    }

    const local = getLocalItems<Score>('edu_scores');
    const sorted = local.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (level) {
      return sorted.filter(sc => sc.level === level);
    }
    return sorted;
  },

  addScore: async (studentName: string, level: '5' | '6', subject: string, scoreValue: string, scoreType: 'نقطة المراقبة المستمرة' | 'الفرض'): Promise<Score> => {
    const logPath = 'scores';
    const newScore: Omit<Score, 'id'> = {
      studentName: studentName.trim(),
      level,
      subject: subject.trim(),
      scoreValue: scoreValue.trim(),
      scoreType,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseAvailable) {
      try {
        const docRef = await addDoc(collection(db, logPath), newScore);
        return { id: docRef.id, ...newScore };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, logPath);
      }
    }

    const local = getLocalItems<Score>('edu_scores');
    const item: Score = {
      id: `sc_${Date.now()}`,
      ...newScore
    };
    local.unshift(item);
    saveLocalItems('edu_scores', local);
    return item;
  },

  deleteScore: async (id: string): Promise<void> => {
    const logPath = `scores/${id}`;
    if (isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, 'scores', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
      }
    }

    const local = getLocalItems<Score>('edu_scores');
    const updated = local.filter(sc => sc.id !== id);
    saveLocalItems('edu_scores', updated);
  },

  // 3. Absence Registry Handlers (WITH SECURE ACCESS & HIGH PEDAGOGICAL TONE)
  getAbsences: async (level?: '5' | '6'): Promise<Absence[]> => {
    const logPath = 'absences';
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Absence));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, logPath);
      }
    }

    const local = getLocalItems<Absence>('edu_absences');
    const sorted = local.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (level) {
      return sorted.filter(ab => ab.level === level);
    }
    return sorted;
  },

  addAbsence: async (studentName: string, level: '5' | '6', date: string, absenceType: 'غياب مبرر' | 'غياب غير مبرر'): Promise<Absence> => {
    const logPath = 'absences';
    const newAb: Omit<Absence, 'id'> = {
      studentName: studentName.trim(),
      level,
      date,
      absenceType,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseAvailable) {
      try {
        const docRef = await addDoc(collection(db, logPath), newAb);
        return { id: docRef.id, ...newAb };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, logPath);
      }
    }

    const local = getLocalItems<Absence>('edu_absences');
    const item: Absence = {
      id: `ab_${Date.now()}`,
      ...newAb
    };
    local.unshift(item);
    saveLocalItems('edu_absences', local);
    return item;
  },

  deleteAbsence: async (id: string): Promise<void> => {
    const logPath = `absences/${id}`;
    if (isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, 'absences', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
      }
    }

    const local = getLocalItems<Absence>('edu_absences');
    const updated = local.filter(ab => ab.id !== id);
    saveLocalItems('edu_absences', updated);
  },

  // 4. Pedagogical Document Handlers (WITH LEVEL SEGREGATION & STORAGE SYNC)
  getDocuments: async (level?: '5' | '6'): Promise<EduDocument[]> => {
    const logPath = 'documents';
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as EduDocument));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, logPath);
      }
    }

    const local = getLocalItems<EduDocument>('edu_documents');
    const sorted = local.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (level) {
      return sorted.filter(docItem => docItem.level === level);
    }
    return sorted;
  },

  addDocument: async (name: string, level: '5' | '6', fileType: string, fileUrl: string, authorId: string): Promise<EduDocument> => {
    const logPath = 'documents';
    const newDocItem: Omit<EduDocument, 'id'> = {
      name: name.trim(),
      level,
      fileType,
      fileUrl,
      createdAt: new Date().toISOString(),
      authorId
    };

    if (isFirebaseAvailable) {
      try {
        const docRef = await addDoc(collection(db, logPath), newDocItem);
        return { id: docRef.id, ...newDocItem };
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, logPath);
      }
    }

    const local = getLocalItems<EduDocument>('edu_documents');
    const item: EduDocument = {
      id: `doc_${Date.now()}`,
      ...newDocItem
    };
    local.unshift(item);
    saveLocalItems('edu_documents', local);
    return item;
  },

  uploadFileAndAddDocument: async (file: File, level: '5' | '6', fileType: string, authorId: string): Promise<EduDocument> => {
    if (isFirebaseAvailable && storage) {
      try {
        const uniqueFileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const storageRef = ref(storage, `documents/${uniqueFileName}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        return await dbService.addDocument(file.name, level, fileType, downloadUrl, authorId);
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        const isOffline = errMessage.includes('offline') || 
                          errMessage.includes('Failed') || 
                          errMessage.includes('network') || 
                          errMessage.includes('quota') || 
                          errMessage.includes('unreachable') ||
                          errMessage.includes('storage/');
        if (isOffline) {
          deactivateFirebase();
          console.warn("Firebase Storage offline/restricted. Proceeding with local file base64 storage.");
        } else {
          console.warn("Firebase Storage Upload Error:", error);
          throw new Error("حدث خطأ أثناء رفع الملف إلى خادم السحابية: " + errMessage);
        }
      }
    }

    // fallback: FileReader Base64 conversion
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileUrl = event.target?.result as string;
          if (!fileUrl) {
            reject(new Error("القراءة تعذرت للملف المحدد."));
            return;
          }
          const docItem = await dbService.addDocument(file.name, level, fileType, fileUrl, authorId);
          resolve(docItem);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => {
        reject(new Error("فشلت عملية قراءة الملف المحلي."));
      };
      reader.readAsDataURL(file);
    });
  },

  deleteDocument: async (id: string, fileUrl?: string): Promise<void> => {
    const logPath = `documents/${id}`;
    if (isFirebaseAvailable) {
      try {
        if (fileUrl && storage && fileUrl.includes("firebasestorage.googleapis.com")) {
          try {
            const fileRef = ref(storage, fileUrl);
            await deleteObject(fileRef);
          } catch (storageErr) {
            console.warn("Storage deletion ignored or file already deleted:", storageErr);
          }
        }
        await deleteDoc(doc(db, 'documents', id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
      }
    }

    const local = getLocalItems<EduDocument>('edu_documents');
    const updated = local.filter(docItem => docItem.id !== id);
    saveLocalItems('edu_documents', updated);
  },

  // 5. Personal Student Notes Handlers (with dynamic Firebase storage & Local Fallback)
  getStudentNotes: async (level?: '5' | '6'): Promise<{ id: string; username: string; displayName: string; level: '5' | '6'; notes: string }[]> => {
    const list = await dbService.getStudentAccounts(level);
    const localNotes = getLocalItems<any>('edu_student_notes');

    return list.map(acc => {
      // prioritize notes stored dynamically on user object
      const userNotes = (acc as any).notes;
      if (userNotes !== undefined) {
        return {
          id: acc.id,
          username: acc.username,
          displayName: acc.displayName,
          level: acc.level,
          notes: userNotes || ''
        };
      }
      const noteMatch = localNotes.find((ln: any) => ln.id === acc.id);
      return {
        id: acc.id,
        username: acc.username,
        displayName: acc.displayName,
        level: acc.level,
        notes: noteMatch ? noteMatch.notes : ''
      };
    });
  },

  getSingleStudentNote: async (uid: string): Promise<string> => {
    if (isFirebaseAvailable) {
      try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
          return docSnap.data().notes || "";
        }
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        if (errMessage.includes('offline') || errMessage.includes('Failed') || errMessage.includes('network') || errMessage.includes('unreachable')) {
          deactivateFirebase();
          console.warn("Firestore is offline while loading single student note. Gracefully falling back to local storage.");
        } else {
          console.warn("Firestore error loading single student note:", error);
        }
      }
    }

    // fallback: load from local student notes
    const local = getLocalItems<any>('edu_student_notes');
    const match = local.find((n: any) => n.id === uid);
    if (match) {
      return match.notes || "";
    }
    
    // Try Default matching if no note written yet
    const defMatch = INITIAL_STUDENT_NOTES.find(n => n.id === uid);
    return defMatch ? defMatch.notes : "";
  },

  saveStudentNote: async (uid: string, notes: string, displayName: string, level: '5' | '6'): Promise<void> => {
    const logPath = `users/${uid}`;
    const payload = {
      notes: notes.trim(),
      displayName: displayName.trim(),
      level,
      updatedAt: new Date().toISOString()
    };

    if (isFirebaseAvailable) {
      try {
        await setDoc(doc(db, 'users', uid), payload, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, logPath);
      }
    }

    // always keep local in sync as fallback
    const local = getLocalItems<any>('edu_student_notes');
    const existingIndex = local.findIndex((n: any) => n.id === uid);
    const item = { id: uid, username: uid.startsWith('uid_') ? uid.replace('uid_', '') : uid, ...payload };
    if (existingIndex !== -1) {
      local[existingIndex] = item;
    } else {
      local.push(item);
    }
    saveLocalItems('edu_student_notes', local);
  },

  // 6. Dynamic Student Account Management Handlers
  getStudentAccounts: async (level?: '5' | '6'): Promise<{ id: string; username: string; displayName: string; level: '5' | '6'; password?: string; notes?: string }[]> => {
    const logPath = 'users';
    let firebaseUsers: any[] = [];
    
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level));
        } else {
          q = query(collection(db, logPath));
        }
        const snapshot = await getDocs(q);
        firebaseUsers = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      } catch (error) {
        const errMessage = error instanceof Error ? error.message : String(error);
        if (errMessage.includes('offline') || errMessage.includes('Failed') || errMessage.includes('network') || errMessage.includes('unreachable')) {
          deactivateFirebase();
          console.warn("Firestore is offline while loading student accounts. Falling back to local storage.");
        } else {
          console.warn("Firestore error loading student accounts:", error);
        }
      }
    }

    // Default built-in seed accounts for displaying & logging
    const seedAccounts = [
      { id: 'uid_student5', username: 'student5', displayName: 'تلميذ(ة) المستوى الخامس ابتدائي', level: '5' as const, password: 'primary5' },
      { id: 'uid_student6', username: 'student6', displayName: 'تلميذ(ة) المستوى السادس ابتدائي', level: '6' as const, password: 'primary6' },
      { id: 'uid_ahmed5', username: 'ahmed5', displayName: 'أحمد العلمي', level: '5' as const, password: 'primary5' },
      { id: 'uid_fatima5', username: 'fatima5', displayName: 'فاطمة الزهراء البقالي', level: '5' as const, password: 'primary5' },
      { id: 'uid_zinab5', username: 'zinab5', displayName: 'زينب الشاوي', level: '5' as const, password: 'primary5' },
      { id: 'uid_yassine6', username: 'yassine6', displayName: 'ياسين بنجلون', level: '6' as const, password: 'primary6' },
      { id: 'uid_maryam6', username: 'maryam6', displayName: 'مريم التازي', level: '6' as const, password: 'primary6' },
      { id: 'uid_omar6', username: 'omar6', displayName: 'عمر الإدريسي', level: '6' as const, password: 'primary6' },
    ];

    const localAccounts = getLocalItems<any>('edu_student_accounts');
    const allAccountsMap = new Map<string, any>();
    
    // Add seed accounts first, then local, then override with firebase values
    seedAccounts.forEach(acc => allAccountsMap.set(acc.id, acc));
    localAccounts.forEach(acc => allAccountsMap.set(acc.id, acc));

    firebaseUsers.forEach(fUser => {
      if (fUser.role !== UserRole.TEACHER && fUser.username !== 'teacher') {
        const username = fUser.username || fUser.id.replace('uid_', '');
        allAccountsMap.set(fUser.id || `uid_${username}`, {
          id: fUser.id || `uid_${username}`,
          username: username,
          displayName: fUser.displayName || 'تلميذ غير مسمى',
          level: fUser.level || '5',
          password: fUser.password || '123456',
          notes: fUser.notes || '',
          ...(fUser as any)
        });
      }
    });

    const list = Array.from(allAccountsMap.values());
    if (level) {
      return list.filter(acc => acc.level === level);
    }
    return list;
  },

  addStudentAccount: async (displayName: string, level: '5' | '6', username: string, password: string): Promise<any> => {
    const uid = `uid_${username.trim().toLowerCase()}`;
    const logPath = `users/${uid}`;
    
    const payload = {
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      level,
      password: password.trim(),
      notes: '',
      createdAt: new Date().toISOString()
    };

    if (isFirebaseAvailable) {
      try {
        await setDoc(doc(db, 'users', uid), payload, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, logPath);
      }
    }

    // Sync to local student accounts storage
    const localAccounts = getLocalItems<any>('edu_student_accounts');
    const existingIndex = localAccounts.findIndex(acc => acc.id === uid);
    const item = { id: uid, ...payload };
    if (existingIndex !== -1) {
      localAccounts[existingIndex] = item;
    } else {
      localAccounts.push(item);
    }
    saveLocalItems('edu_student_accounts', localAccounts);

    // Sync to local notes storage
    const localNotes = getLocalItems<any>('edu_student_notes');
    const existingNoteIndex = localNotes.findIndex(n => n.id === uid);
    if (existingNoteIndex === -1) {
      localNotes.push({ id: uid, username: username.trim(), displayName: displayName.trim(), level, notes: '' });
      saveLocalItems('edu_student_notes', localNotes);
    }

    return item;
  },

  deleteStudentAccount: async (uid: string): Promise<void> => {
    const logPath = `users/${uid}`;
    if (isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, 'users', uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
      }
    }

    // Sync local accounts
    const localAccounts = getLocalItems<any>('edu_student_accounts');
    const updatedAccounts = localAccounts.filter((acc: any) => acc.id !== uid);
    saveLocalItems('edu_student_accounts', updatedAccounts);

    // Sync local notes
    const localNotes = getLocalItems<any>('edu_student_notes');
    const updatedNotes = localNotes.filter((n: any) => n.id !== uid);
    saveLocalItems('edu_student_notes', updatedNotes);
  }
};
