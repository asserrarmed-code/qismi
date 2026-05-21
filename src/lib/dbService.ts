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
import { db, isFirebaseAvailable, auth, storage } from './firebase';
import { UserRole, UserSession, Exercise, Score, Absence, EduDocument } from '../types';

enum CollectionName {
  EXERCISES = 'exercises',
  SCORES = 'scores',
  ABSENCES = 'absences',
  DOCUMENTS = 'documents'
}

enum OperationType {
  READ = 'READ',
  WRITE = 'WRITE',
  DELETE = 'DELETE'
}

function handleFirestoreError(error: any, operationType: OperationType, path: string) {
  const errInfo = {
    message: error instanceof Error ? error.message : 'Unknown Database Error',
    code: error && typeof error === 'object' && 'code' in error ? (error as any).code : 'UNKNOWN_CODE',
    details: error && typeof error === 'object' && 'details' in error ? (error as any).details : null,
    context: {
      isFirebaseAvailable,
      timestamp: new Date().toISOString()
    },
    operationType,
    path
  };
  console.error('Firestore Error Details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

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

function getLocalItems<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Local storage decoding failure:", err);
    return [];
  }
}

function saveLocalItems<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (err) {
    console.error("Local storage encoding failure:", err);
  }
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

export const dbService = {
  
  login: async (username: string, password: string): Promise<UserSession> => {
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
    
    throw new Error("بيانات الولوج خاطئة أو غير مسجلة في النظام مسبقاً.");
  },

  getCurrentSession: (): UserSession | null => {
    try {
      const stored = localStorage.getItem('edu_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  logout: async (): Promise<void> => {
    localStorage.removeItem('edu_session');
  },

  getExercises: async (level?: string): Promise<Exercise[]> => {
    const logPath = CollectionName.EXERCISES;
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      } catch (error) {
        try {
          const simpleQuery = query(collection(db, logPath));
          const snap = await getDocs(simpleQuery);
          const raw = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          if (level) {
            return raw.filter(ex => ex.level === level);
          }
          return raw;
        } catch (innerErr) {
          handleFirestoreError(innerErr, OperationType.READ, logPath);
        }
      }
    }

    const local = getLocalItems<Exercise>('edu_exercises');
    if (level) {
      return local.filter(ex => ex.level === level);
    }
    return local;
  },

  addExercise: async (exercise: Omit<Exercise, 'id' | 'createdAt'>): Promise<Exercise> => {
    const logPath = CollectionName.EXERCISES;
    const item: Omit<Exercise, 'id'> = {
      ...exercise,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseAvailable) {
      try {
        const docRef = await addDoc(collection(db, logPath), item);
        return { id: docRef.id, ...item };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, logPath);
      }
    }

    const local = getLocalItems<Exercise>('edu_exercises');
    const newItem: Exercise = {
      id: `local_ex_${Date.now()}`,
      ...item
    };
    local.unshift(newItem);
    saveLocalItems('edu_exercises', local);
    return newItem;
  },

  deleteExercise: async (id: string): Promise<void> => {
    const logPath = `${CollectionName.EXERCISES}/${id}`;
    if (isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, CollectionName.EXERCISES, id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
      }
    }

    const local = getLocalItems<Exercise>('edu_exercises');
    const updated = local.filter(ex => ex.id !== id);
    saveLocalItems('edu_exercises', updated);
  },

  getScores: async (level?: string): Promise<Score[]> => {
    const logPath = CollectionName.SCORES;
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      } catch (error) {
        try {
          const snap = await getDocs(query(collection(db, logPath)));
          const raw = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          if (level) {
            return raw.filter(sc => sc.level === level);
          }
          return raw;
        } catch (innerErr) {
          handleFirestoreError(innerErr, OperationType.READ, logPath);
        }
      }
    }

    const local = getLocalItems<Score>('edu_scores');
    if (level) {
      return local.filter(sc => sc.level === level);
    }
    return local;
  },

  addScore: async (score: Omit<Score, 'id' | 'createdAt'>): Promise<Score> => {
    const logPath = CollectionName.SCORES;
    const item: Omit<Score, 'id'> = {
      ...score,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseAvailable) {
      try {
        const docRef = await addDoc(collection(db, logPath), item);
        return { id: docRef.id, ...item };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, logPath);
      }
    }

    const local = getLocalItems<Score>('edu_scores');
    const newItem: Score = {
      id: `local_sc_${Date.now()}`,
      ...item
    };
    local.unshift(newItem);
    saveLocalItems('edu_scores', local);
    return newItem;
  },

  deleteScore: async (id: string): Promise<void> => {
    const logPath = `${CollectionName.SCORES}/${id}`;
    if (isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, CollectionName.SCORES, id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
      }
    }

    const local = getLocalItems<Score>('edu_scores');
    const updated = local.filter(scoreItem => scoreItem.id !== id);
    saveLocalItems('edu_scores', updated);
  },

  getAbsences: async (level?: string): Promise<Absence[]> => {
    const logPath = CollectionName.ABSENCES;
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('date', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('date', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      } catch (error) {
        try {
          const snap = await getDocs(query(collection(db, logPath)));
          const raw = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          if (level) {
            return raw.filter(ab => ab.level === level);
          }
          return raw;
        } catch (innerErr) {
          handleFirestoreError(innerErr, OperationType.READ, logPath);
        }
      }
    }

    const local = getLocalItems<Absence>('edu_absences');
    if (level) {
      return local.filter(ab => ab.level === level);
    }
    return local;
  },

  addAbsence: async (absence: Omit<Absence, 'id'>): Promise<Absence> => {
    const logPath = CollectionName.ABSENCES;
    if (isFirebaseAvailable) {
      try {
        const docRef = await addDoc(collection(db, logPath), absence);
        return { id: docRef.id, ...absence };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, logPath);
      }
    }

    const local = getLocalItems<Absence>('edu_absences');
    const newItem: Absence = {
      id: `local_ab_${Date.now()}`,
      ...absence
    };
    local.unshift(newItem);
    saveLocalItems('edu_absences', local);
    return newItem;
  },

  deleteAbsence: async (id: string): Promise<void> => {
    const logPath = `${CollectionName.ABSENCES}/${id}`;
    if (isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, CollectionName.ABSENCES, id));
        return;
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
      }
    }

    const local = getLocalItems<Absence>('edu_absences');
    const updated = local.filter(ab => ab.id !== id);
    saveLocalItems('edu_absences', updated);
  },

  getDocuments: async (level?: string): Promise<EduDocument[]> => {
    const logPath = CollectionName.DOCUMENTS;
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
      } catch (error) {
        try {
          const snap = await getDocs(query(collection(db, logPath)));
          const raw = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
          if (level) {
            return raw.filter(d => d.level === level);
          }
          return raw;
        } catch (innerErr) {
          handleFirestoreError(innerErr, OperationType.READ, logPath);
        }
      }
    }

    const local = getLocalItems<EduDocument>('edu_documents');
    if (level) {
      return local.filter(d => d.level === level);
    }
    return local;
  },

  uploadDocumentFile: async (file: File, level: string, fileType: string, authorId: string): Promise<EduDocument> => {
    let targetUrl = "";
    const uniqueFileName = `${Date.now()}_${file.name}`;
    
    if (isFirebaseAvailable && storage) {
      try {
        const storageRef = ref(storage, `documents/${uniqueFileName}`);
        const uploadResult = await uploadBytes(storageRef, file);
        targetUrl = await getDownloadURL(uploadResult.ref);
      } catch (error) {
        console.error("Firebase Storage error. Proceeding to Base64 Offline fallbacks:", error);
      }
    }

    if (!targetUrl) {
      targetUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          resolve(reader.result as string);
        };
        reader.onerror = () => {
          reject(new Error("فشلت عملية قراءة الملف المحلي."));
        };
        reader.readAsDataURL(file);
      });
    }

    const payload: Omit<EduDocument, 'id' | 'createdAt'> = {
      name: file.name,
      level,
      fileType,
      fileUrl: targetUrl,
      authorId
    };

    const added = await dbService.addDocumentMetadata(payload);
    return added;
  },

  addDocumentMetadata: async (docInfo: Omit<EduDocument, 'id' | 'createdAt'>): Promise<EduDocument> => {
    const logPath = CollectionName.DOCUMENTS;
    const item: Omit<EduDocument, 'id'> = {
      ...docInfo,
      createdAt: new Date().toISOString()
    };

    if (isFirebaseAvailable) {
      try {
        const docRef = await addDoc(collection(db, logPath), item);
        return { id: docRef.id, ...item };
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, logPath);
      }
    }

    const local = getLocalItems<EduDocument>('edu_documents');
    const newItem: EduDocument = {
      id: `local_doc_${Date.now()}`,
      ...item
    };
    local.unshift(newItem);
    saveLocalItems('edu_documents', local);
    return newItem;
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

  getStudentNotes: async (level?: '5' | '6'): Promise<{ id: string; username: string; displayName: string; level: '5' | '6'; notes: string }[]> => {
    const logPath = 'users';
    let firebaseNotes: any[] = [];
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level));
        } else {
          q = query(collection(db, logPath));
        }
        const snapshot = await getDocs(q);
        firebaseNotes = snapshot.docs.map(d => ({ id: d.id, username: d.id.replace('uid_', ''), ...(d.data() as any) }));
      } catch (error) {
        console.error("Firestore error loading student notes:", error);
      }
    }

    const local = getLocalItems<{ id: string; username: string; displayName: string; level: '5' | '6'; notes: string }>('edu_student_notes');
    
    const mergedList = DEFAULT_STUDENTS.map(stud => {
      const fbMatch = firebaseNotes.find(fn => fn.id === stud.id);
      if (fbMatch) {
        return { ...stud, notes: fbMatch.notes || '' };
      }
      const localMatch = local.find(ln => ln.id === stud.id);
      return { ...stud, notes: localMatch ? localMatch.notes : '' };
    });

    if (level) {
      return mergedList.filter(n => n.level === level) as any;
    }
    return mergedList as any;
  },

  getSingleStudentNote: async (uid: string): Promise<string> => {
    if (isFirebaseAvailable) {
      try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
          return docSnap.data().notes || "";
        }
      } catch (error) {
        console.error("Firestore error loading single student note:", error);
      }
    }

    const local = getLocalItems<any>('edu_student_notes');
    const match = local.find((n: any) => n.id === uid);
    if (match) {
      return match.notes || "";
    }
    
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

    const local = getLocalItems<any>('edu_student_notes');
    const existingIndex = local.findIndex((n: any) => n.id === uid);
    const item = { id: uid, username: uid.startsWith('uid_') ? uid.replace('uid_', '') : uid, ...payload };
    if (existingIndex !== -1) {
      local[existingIndex] = item;
    } else {
      local.push(item);
    }
    saveLocalItems('edu_student_notes', local);
  }
};
