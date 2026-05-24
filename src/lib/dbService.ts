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
  getDocsFromServer,
  setDoc,
  getDoc,
  onSnapshot
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, isFirebaseAvailable, auth, storage, deactivateFirebase } from './firebase';
import { initializeApp, getApps } from 'firebase/app';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import firebaseConfig from '../firebase-applet-config.json';
import { UserRole, UserSession, Exercise, Score, Absence, EduDocument, Announcement, Timetable } from '../types';

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

// Helper to safely create Firebase Auth account with username/password without signing out the admin
const createAuthUserSafely = async (username: string, password: string): Promise<string | null> => {
  if (!isFirebaseAvailable || !auth) {
    console.log("[dbService Auth] Firebase is disabled or unconfigured. Creating local/offline record.");
    return null;
  }
  try {
    const trimmedUser = username.trim().toLowerCase();
    const email = `${trimmedUser}@qasmi.com`;
    console.log(`[dbService Auth] Attempting Auth dual-write creation for email: ${email}`);
    
    // Construct finalConfig as in firebase.ts
    const finalConfig = {
      apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig?.apiKey || "").trim(),
      authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig?.authDomain || "").trim(),
      projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig?.projectId || "").trim(),
      storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig?.storageBucket || "").trim(),
      messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig?.messagingSenderId || "").trim(),
      appId: (import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig?.appId || "").trim(),
    };
    
    // Initialize secondary app
    const secondaryApp = getApps().find(app => app.name === 'tempAuthApp') || initializeApp(finalConfig, 'tempAuthApp');
    const secondaryAuth = getAuth(secondaryApp);
    
    const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const user = userCredential.user;
    console.log(`[dbService Auth] Successfully created Firebase Auth user. UID: ${user.uid}`);
    
    // Sign out key from secondary auth to avoid session overlap
    await secondaryAuth.signOut();
    return user.uid;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      console.warn("[dbService Auth] Email already in use in Firebase Auth. Proceeding with matching Firestore write.");
      return null;
    }
    console.error("[dbService Auth] Error in dual-write Firebase Auth creation:", error);
    throw new Error(`خطأ أثناء إنشاء حساب المصادقة: ${error.message}`);
  }
};

// Prefabricated accounts registry - set to empty array under Super Admin System as requested
export const PRE_CREATED_ACCOUNTS: any[] = [];

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
  { id: 'uid_student5', username: 'student5', displayName: 'تلميذ(ة) المستوى الخامس ابتدائي', level: '5' as const, role: 'student' },
  { id: 'uid_student6', username: 'student6', displayName: 'تلميذ(ة) المستوى السادس ابتدائي', level: '6' as const, role: 'student' },
  { id: 'ahmed5', username: 'ahmed5', displayName: 'أحمد العلمي', level: '5' as const, role: 'student' },
  { id: 'fatima5', username: 'fatima5', displayName: 'فاطمة الزهراء البقالي', level: '5' as const, role: 'student' },
  { id: 'zinab5', username: 'zinab5', displayName: 'زينب الشاوي', level: '5' as const, role: 'student' },
  { id: 'yassine6', username: 'yassine6', displayName: 'ياسين بنجلون', level: '6' as const, role: 'student' },
  { id: 'maryam6', username: 'maryam6', displayName: 'مريم التازي', level: '6' as const, role: 'student' },
  { id: 'omar6', username: 'omar6', displayName: 'عمر الإدريسي', level: '6' as const, role: 'student' },
];

const INITIAL_STUDENT_NOTES = [
  { id: 'uid_student5', username: 'student5', displayName: 'تلميذ(ة) المستوى الخامس ابتدائي', level: '5', notes: 'أحسنت في الإملاء، حاول التركيز أكثر في التراكيب', role: 'student' },
  { id: 'uid_student6', username: 'student6', displayName: 'تلميذ(ة) المستوى السادس ابتدائي', level: '6', notes: 'مثابر ومجتهد، ممتاز في الأنشطة الصفية والمنزلية', role: 'student' },
];

if (!localStorage.getItem('edu_student_notes')) {
  saveLocalItems('edu_student_notes', INITIAL_STUDENT_NOTES);
}

// Active dynamic API Service
export const dbService = {
  
  getCustomTeacher: (): { username: string; displayName: string; password?: string; role: string } | null => {
    try {
      const raw = localStorage.getItem('edu_custom_teacher');
      return raw ? { ...JSON.parse(raw), role: UserRole.TEACHER } : null;
    } catch {
      return null;
    }
  },

  saveCustomTeacher: async (displayName: string, username: string, password?: string): Promise<void> => {
    const info = {
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      password: password ? password.trim() : 'moallim2026',
      role: UserRole.TEACHER
    };
    localStorage.setItem('edu_custom_teacher', JSON.stringify(info));

    if (isFirebaseAvailable) {
      try {
        await setDoc(doc(db, 'users', 'custom_teacher'), {
          ...info,
          role: UserRole.TEACHER,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Could not save custom teacher to Firebase:", err);
      }
    }
  },

  // Simulated or authentic login gate (securely verifying roles directly in Firestore)
  login: async (username: string, password: string): Promise<UserSession> => {
    const trimmedUsername = username.trim().toLowerCase();

    // 1. If Firebase is active, we check credentials and roles SECURELY via Firestore query directly
    if (isFirebaseAvailable) {
      try {
        // Auto-seed default superadmin into Firestore if first-time empty login
        if (trimmedUsername === 'superadmin') {
          const docRef = doc(db, 'users', 'uid_superadmin');
          let checkDoc;
          try {
            checkDoc = await getDocFromServer(docRef);
          } catch {
            try {
              checkDoc = await getDoc(docRef);
            } catch (err) {
              console.warn("Field to query default superadmin via standard getDoc:", err);
            }
          }
          if (checkDoc && !checkDoc.exists()) {
            await setDoc(docRef, {
              username: 'superadmin',
              password: 'superadmin2026',
              displayName: 'المشرف العام للمنصة',
              role: 'superadmin',
              createdAt: new Date().toISOString()
            });
            console.log("Seeded default superadmin user inside Firestore collection.");
          }
        }

        // Query database directly for this exact user using getDocsFromServer first with fallback to getDocs
        const q = query(collection(db, 'users'), where('username', '==', trimmedUsername));
        let snapshot;
        try {
          snapshot = await getDocsFromServer(q);
        } catch (serverErr: any) {
          console.warn("[dbService login] getDocsFromServer unreachable or offline; falling back to standard cached getDocs:", serverErr);
          snapshot = await getDocs(q);
        }
        
        if (!snapshot.empty) {
          const userDoc = snapshot.docs[0];
          const userData = userDoc.data();
          
          if (userData.password === password) {
            // Check if role is missing or corrupt/invalid in Firestore
            const validRoles = ['superadmin', 'teacher', 'student'];
            const roleVal = userData.role ? String(userData.role).trim().toLowerCase() : '';
            if (!roleVal || !validRoles.includes(roleVal)) {
              throw new Error("بيانات الحساب غير مكتملة، يرجى تحديث بيانات هذا المستخدم");
            }

            let userRole: UserRole = UserRole.TEACHER;
            if (userData.role === 'superadmin' || userData.role === UserRole.SUPERADMIN) {
              userRole = UserRole.SUPERADMIN;
            } else if (userData.role === 'teacher' || userData.role === UserRole.TEACHER) {
              userRole = UserRole.TEACHER;
            } else if (userData.role === 'student' || userData.role === UserRole.STUDENT_5 || userData.role === UserRole.STUDENT_6) {
              userRole = userData.level === '6' ? UserRole.STUDENT_5 ? UserRole.STUDENT_6 : UserRole.STUDENT_6 : UserRole.STUDENT_5; 
              // simplify:
              userRole = userData.level === '6' ? UserRole.STUDENT_6 : UserRole.STUDENT_5;
            }

            let finalUid = userDoc.id;

            // Secure dual-sync with Firebase Authentication upon logging in
            if (isFirebaseAvailable && auth) {
              const email = `${trimmedUsername}@qasmi.com`;
              try {
                console.log(`[dbService Auth] Dynamic Sync: Attempting authentication sign-in for: ${email}`);
                await signInWithEmailAndPassword(auth, email, password);
                console.log(`[dbService Auth] Authentication successful. UID matches: ${auth.currentUser?.uid}`);
              } catch (signInErr: any) {
                console.warn("[dbService Auth] User credentials match Firestore but Auth record is missing/mismatched. Registering dynamically now:", signInErr);
                try {
                  const authUid = await createAuthUserSafely(trimmedUsername, password);
                  if (authUid) {
                    finalUid = authUid;
                    // Transfer and save the profile document with the exact Auth user uid
                    await setDoc(doc(db, 'users', authUid), { ...userData, id: authUid, uid: authUid }, { merge: true });
                    
                    // If the old record was using a placeholder ID, delete it to prevent leftovers
                    if (userDoc.id !== authUid) {
                      try {
                        await deleteDoc(doc(db, 'users', userDoc.id));
                        console.log(`[dbService Auth] Cleaned up legacy doc ID: ${userDoc.id}`);
                      } catch (deleteErr) {
                        console.warn("[dbService Auth] Failed to prune legacy fallback document, skipping:", deleteErr);
                      }
                    }
                    
                    // Proceed with standard Auth login block
                    await signInWithEmailAndPassword(auth, email, password);
                    console.log("[dbService Auth] Dynamic Sync: Registration and authentication logged in successfully.");
                  }
                } catch (regErr) {
                  console.error("[dbService Auth] Failed dynamic user-sync registration in Firebase Auth:", regErr);
                }
              }
            }

            const session: UserSession = {
              uid: finalUid,
              username: userData.username,
              role: userRole,
              displayName: userData.displayName || userData.username,
              level: userData.level,
              subject: userData.subject || '',
              assignedClasses: userData.assignedClasses || []
            };
            localStorage.setItem('edu_session', JSON.stringify(session));
            return session;
          } else {
            throw new Error("كلمة المرور المدخلة غير صحيحة.");
          }
        } else {
          throw new Error("اسم المستخدم المدخل غير مسجل لدينا في قاعدة البيانات.");
        }
      } catch (err: any) {
        // If the error message is an explicit login validation mismatch, bubble it up to let the user know
        const validationKeywords = ["غير صحيح", "غير مسجل", "بيانات الحساب غير مكتملة", "المرور", "قاعدة البيانات"];
        const errMsg = err?.message || String(err);
        if (validationKeywords.some(kw => errMsg.includes(kw))) {
          throw err;
        }

        console.error("[dbService login] Switch-Gate: Firestore error or offline state. Switching login attempt to offline state mode.", err);
        deactivateFirebase(); // Dynamic switch to local fallback!
      }
    }

    // 2. Offline / Local Fallback Mode (Only active if Firebase isn't configured/connected)
    const localUsers = getLocalItems<any>('edu_users_all');
    
    // Auto-seed offline store with default superadmin and original fallbacks for local compatibility
    if (localUsers.length === 0) {
      localUsers.push(
        {
          id: 'uid_superadmin',
          username: 'superadmin',
          password: 'superadmin2026',
          displayName: 'المشرف العام للمنصة',
          role: 'superadmin'
        },
        {
          id: 'uid_teacher_default',
          username: 'teacher',
          password: 'moallim2026',
          displayName: 'السيد الأستاذ المقتدر',
          role: 'teacher'
        }
      );
      saveLocalItems('edu_users_all', localUsers);
    }

    let localMatched = localUsers.find(
      u => u.username.toLowerCase() === trimmedUsername && u.password === password
    );

    // Dynamic support for students who were saved in edu_student_accounts but not synced to edu_users_all yet
    if (!localMatched) {
      const localStudents = getLocalItems<any>('edu_student_accounts');
      const studentMatched = localStudents.find(
        u => u.username.toLowerCase() === trimmedUsername && u.password === password
      );
      if (studentMatched) {
        localMatched = {
          id: studentMatched.id,
          username: studentMatched.username,
          password: studentMatched.password,
          displayName: studentMatched.displayName,
          role: 'student',
          level: studentMatched.level
        };
      }
    }

    if (localMatched) {
      // Check if role is missing or corrupt in Local Storage fallback
      const validRoles = ['superadmin', 'teacher', 'student'];
      const roleVal = localMatched.role ? String(localMatched.role).trim().toLowerCase() : '';
      if (!roleVal || !validRoles.includes(roleVal)) {
        throw new Error("بيانات الحساب غير مكتملة، يرجى تحديث بيانات هذا المستخدم");
      }

      let userRole: UserRole = UserRole.TEACHER;
      if (localMatched.role === 'superadmin' || localMatched.role === UserRole.SUPERADMIN) {
        userRole = UserRole.SUPERADMIN;
      } else if (localMatched.role === 'teacher' || localMatched.role === UserRole.TEACHER) {
        userRole = UserRole.TEACHER;
      } else if (localMatched.role === 'student' || localMatched.role === UserRole.STUDENT_5 || localMatched.role === UserRole.STUDENT_6) {
        userRole = localMatched.level === '6' ? UserRole.STUDENT_6 : UserRole.STUDENT_5;
      }

      const session: UserSession = {
        uid: localMatched.id || `uid_${localMatched.username}`,
        username: localMatched.username,
        role: userRole,
        displayName: localMatched.displayName,
        level: localMatched.level,
        subject: localMatched.subject || '',
        assignedClasses: localMatched.assignedClasses || []
      };
      localStorage.setItem('edu_session', JSON.stringify(session));
      return session;
    }

    throw new Error("بيانات الولوج خاطئة أو غير مسجلة في منصتنا مسبقاً.");
  },

  // Super Admin API: Fetch all user accounts
  getAllUsers: async (): Promise<any[]> => {
    const logPath = 'users';
    let firebaseUsers: any[] = [];
    console.log("[dbService] getAllUsers: Start fetching users from Firestore...");
    if (isFirebaseAvailable) {
      try {
        const snapshot = await getDocs(collection(db, logPath));
        console.log(`[dbService] getAllUsers: Successfully fetched ${snapshot.size} documents from Firestore.`);
        firebaseUsers = snapshot.docs.map(docSnap => {
          const data = docSnap.data() as any;
          let derivedRole = data.role || 'student';
          if (data.username === 'superadmin') derivedRole = 'superadmin';
          if (data.username === 'teacher') derivedRole = 'teacher';
          const userObj: any = {
            id: docSnap.id,
            uid: docSnap.id,
            role: derivedRole,
            ...data
          };
          console.log(`[dbService] getAllUsers parsed doc:`, { id: userObj.id, username: userObj.username, role: userObj.role });
          return userObj;
        });
        return firebaseUsers;
      } catch (error) {
        console.error("[dbService] Error fetching users from Firestore:", error);
      }
    }
    
    // Fallback seed ONLY if isFirebaseAvailable is false
    const local = getLocalItems<any>('edu_users_all');
    console.log(`[dbService] getAllUsers fallback check. Firebase offline. Local storage user count: ${local.length}`);
    if (local.length === 0) {
      const defaultList = [
        {
          id: 'uid_superadmin',
          uid: 'uid_superadmin',
          username: 'superadmin',
          password: 'superadmin2026',
          displayName: 'المشرف العام للمنصة',
          role: 'superadmin'
        }
      ];
      saveLocalItems('edu_users_all', defaultList);
      return defaultList;
    }
    return local.map(u => ({
      uid: u.uid || u.id || `uid_${u.username}`,
      role: u.role || (u.username === 'superadmin' ? 'superadmin' : u.username === 'teacher' ? 'teacher' : 'student'),
      ...u
    }));
  },

  // Super Admin API: Save or modify user details (Create teacher, student, admin, or modify password)
  saveUserAccount: async (user: { 
    id?: string; 
    username: string; 
    displayName: string; 
    role: 'superadmin' | 'teacher' | 'student'; 
    level?: '5' | '6'; 
    password: string;
    subject?: string;
    assignedClasses?: string[];
  }): Promise<void> => {
    console.log("[dbService] saveUserAccount triggered for user:", user);
    let uid = user.id || `uid_${user.username.trim().toLowerCase()}`;
    
    if (isFirebaseAvailable) {
      try {
        console.log(`[dbService] Dual-write active: creating Authentication account for: ${user.username}`);
        const authUid = await createAuthUserSafely(user.username, user.password);
        if (authUid) {
          console.log(`[dbService] Auth account created successfully with UID: ${authUid}. Overriding destination ID.`);
          uid = authUid;
        }
      } catch (authErr) {
        console.error("[dbService] Firebase Auth dual-write creation failed, falling back to custom state:", authErr);
      }
    }

    const logPath = `users/${uid}`;
    const payload = {
      uid: uid,
      username: user.username.trim().toLowerCase(),
      displayName: user.displayName.trim(),
      role: user.role,
      level: user.level || '5',
      password: user.password.trim(),
      subject: user.subject || '',
      assignedClasses: user.assignedClasses || [],
      updatedAt: new Date().toISOString()
    };
    
    console.log(`[dbService] saveUserAccount payload for Firestore doc ${uid}:`, payload);
    
    if (isFirebaseAvailable) {
      try {
        await setDoc(doc(db, 'users', uid), payload, { merge: true });
        console.log(`[dbService] Successfully wrote document to Firestore path: ${logPath}`);
        return; // single source of truth - bypass local storage writing when online
      } catch (error) {
        console.error(`[dbService] Firestore document write failure for ${logPath}:`, error);
        handleFirestoreError(error, OperationType.WRITE, logPath);
      }
    }

    // Sync to unified local storage ONLY in fallback offline mode
    const localUsers = getLocalItems<any>('edu_users_all');
    const existingIndex = localUsers.findIndex(u => u.id === uid || u.username === payload.username);
    if (existingIndex !== -1) {
      localUsers[existingIndex] = { id: uid, ...payload };
    } else {
      localUsers.push({ id: uid, ...payload });
    }
    saveLocalItems('edu_users_all', localUsers);
    console.log(`[dbService] Local fallback cache 'edu_users_all' synced. Total count: ${localUsers.length}`);

    // Backward compatibility sync with existing student list if student
    if (user.role === 'student') {
      const localStudentAccounts = getLocalItems<any>('edu_student_accounts');
      const idx = localStudentAccounts.findIndex(u => u.id === uid);
      const studPayload = {
         id: uid,
         uid: uid,
         username: user.username.trim().toLowerCase(),
         displayName: user.displayName.trim(),
         level: user.level || '5',
         password: user.password.trim(),
         notes: '',
         role: 'student',
         createdAt: new Date().toISOString()
      };
      if (idx !== -1) {
         localStudentAccounts[idx] = studPayload;
      } else {
         localStudentAccounts.push(studPayload);
      }
      saveLocalItems('edu_student_accounts', localStudentAccounts);
    }
  },

  // SUPER ADMIN API: Update password of any other user directly
  updateUserPassword: async (userId: string, newPassword: string): Promise<void> => {
    const logPath = `users/${userId}`;
    const trimmedPassword = newPassword.trim();
    if (!trimmedPassword) {
      throw new Error("كلمة المرور الجديدة لا يمكن أن تكون فارغة.");
    }

    if (isFirebaseAvailable) {
      try {
        await setDoc(doc(db, 'users', userId), {
          password: trimmedPassword,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        return; // single source of truth - bypass localStorage
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, logPath);
      }
    }

    // Update in local storage ('edu_users_all') ONLY if offline fallback
    const localUsers = getLocalItems<any>('edu_users_all');
    const userIndex = localUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      localUsers[userIndex].password = trimmedPassword;
      localUsers[userIndex].updatedAt = new Date().toISOString();
      saveLocalItems('edu_users_all', localUsers);
    }

    // Also sync in local student accounts if it is a student
    const localStudentAccounts = getLocalItems<any>('edu_student_accounts');
    const studIndex = localStudentAccounts.findIndex(u => u.id === userId);
    if (studIndex !== -1) {
      localStudentAccounts[studIndex].password = trimmedPassword;
      saveLocalItems('edu_student_accounts', localStudentAccounts);
    }
  },

  // Super Admin API: Remove a user
  deleteUserAccount: async (uid: string): Promise<void> => {
    const logPath = `users/${uid}`;
    if (isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        return; // single source of truth - bypass localStorage
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
      }
    }

    // Sync local ONLY if offline
    const localUsers = getLocalItems<any>('edu_users_all');
    const updatedUsers = localUsers.filter(u => u.id !== uid);
    saveLocalItems('edu_users_all', updatedUsers);

    // Backward compatibility sync
    const localStudentAccounts = getLocalItems<any>('edu_student_accounts');
    const updatedStuds = localStudentAccounts.filter(acc => acc.id !== uid);
    saveLocalItems('edu_student_accounts', updatedStuds);
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
    let firebaseExercises: Exercise[] = [];
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        firebaseExercises = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Exercise));
        
        const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
        if (isHideDemo) {
          firebaseExercises = firebaseExercises.filter(ex => !['ex1', 'ex2', 'ex3', 'ex4'].includes(ex.id) && ex.authorId !== 'system_teacher');
        }
        return firebaseExercises;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, logPath);
      }
    }
    
    // Fallback with exact segregation of levels
    const local = getLocalItems<Exercise>('edu_exercises');
    const sorted = local.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
    const filteredSeed = isHideDemo 
      ? sorted.filter(ex => !['ex1', 'ex2', 'ex3', 'ex4'].includes(ex.id) && ex.authorId !== 'system_teacher')
      : sorted;

    if (level) {
      return filteredSeed.filter(ex => ex.level === level);
    }
    return filteredSeed;
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
    let firebaseScores: Score[] = [];
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        firebaseScores = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Score));

        const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
        if (isHideDemo) {
          firebaseScores = firebaseScores.filter(sc => !['sc1', 'sc2', 'sc3', 'sc4'].includes(sc.id));
        }
        return firebaseScores;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, logPath);
      }
    }

    const local = getLocalItems<Score>('edu_scores');
    const sorted = local.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
    const filteredSeed = isHideDemo 
      ? sorted.filter(sc => !['sc1', 'sc2', 'sc3', 'sc4'].includes(sc.id))
      : sorted;

    if (level) {
      return filteredSeed.filter(sc => sc.level === level);
    }
    return filteredSeed;
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
    let firebaseAbsences: Absence[] = [];
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        firebaseAbsences = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Absence));
        
        const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
        if (isHideDemo) {
          firebaseAbsences = firebaseAbsences.filter(ab => !['ab1', 'ab2'].includes(ab.id));
        }
        return firebaseAbsences;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, logPath);
      }
    }

    const local = getLocalItems<Absence>('edu_absences');
    const sorted = local.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
    const filteredSeed = isHideDemo 
      ? sorted.filter(ab => !['ab1', 'ab2'].includes(ab.id))
      : sorted;

    if (level) {
      return filteredSeed.filter(ab => ab.level === level);
    }
    return filteredSeed;
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
    let firebaseDocuments: EduDocument[] = [];
    if (isFirebaseAvailable) {
      try {
        let q;
        if (level) {
          q = query(collection(db, logPath), where('level', '==', level), orderBy('createdAt', 'desc'));
        } else {
          q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        }
        const snapshot = await getDocs(q);
        firebaseDocuments = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as EduDocument));
        
        const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
        if (isHideDemo) {
          firebaseDocuments = firebaseDocuments.filter(docItem => !['doc1', 'doc2', 'doc3'].includes(docItem.id) && docItem.authorId !== 'system_teacher');
        }
        return firebaseDocuments;
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, logPath);
      }
    }

    const local = getLocalItems<EduDocument>('edu_documents');
    const sorted = local.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
    const filteredSeed = isHideDemo 
      ? sorted.filter(docItem => !['doc1', 'doc2', 'doc3'].includes(docItem.id) && docItem.authorId !== 'system_teacher')
      : sorted;

    if (level) {
      return filteredSeed.filter(docItem => docItem.level === level);
    }
    return filteredSeed;
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
                          errMessage.includes('Failed to get document') || 
                          errMessage.includes('Failed to get documents') || 
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
  getStudentNotes: async (level?: '5' | '6'): Promise<{ id: string; username: string; displayName: string; level: '5' | '6'; notes: string; role?: string }[]> => {
    const list = await dbService.getStudentAccounts(level);
    const localNotes = getLocalItems<any>('edu_student_notes');

    return list.map(acc => {
      // prioritize notes stored dynamically on user object
      const userNotes = (acc as any).notes;
      const role = acc.role || 'student';
      if (userNotes !== undefined) {
        return {
          id: acc.id,
          username: acc.username,
          displayName: acc.displayName,
          level: acc.level,
          notes: userNotes || '',
          role
        };
      }
      const noteMatch = localNotes.find((ln: any) => ln.id === acc.id);
      return {
        id: acc.id,
        username: acc.username,
        displayName: acc.displayName,
        level: acc.level,
        notes: noteMatch ? noteMatch.notes : '',
        role
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
        if (errMessage.includes('offline') || errMessage.includes('Failed to get document') || errMessage.includes('Failed to get documents') || errMessage.includes('network') || errMessage.includes('unreachable')) {
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
    
    const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
    if (isHideDemo) {
      return "";
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
  getStudentAccounts: async (level?: '5' | '6'): Promise<{ id: string; username: string; displayName: string; level: '5' | '6'; password?: string; notes?: string; role?: string }[]> => {
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

        // Single Source of Truth: In online mode, map and return database accounts exclusively
        const dbList = firebaseUsers.filter(fUser => {
          return fUser.role !== UserRole.TEACHER && fUser.username !== 'teacher' && fUser.username !== 'custom_teacher' && fUser.id !== 'custom_teacher';
        }).map(fUser => {
          const username = fUser.username || fUser.id.replace('uid_', '');
          return {
            id: fUser.id || `uid_${username}`,
            username: username,
            displayName: fUser.displayName || 'تلميذ غير مسمى',
            level: fUser.level || '5',
            password: fUser.password || '123456',
            notes: fUser.notes || '',
            role: fUser.role || 'student',
            ...(fUser as any)
          };
        });

        if (level) {
          return dbList.filter(acc => acc.level === level);
        }
        return dbList;
      } catch (error) {
        console.warn("Firestore error loading student accounts:", error);
      }
    }

    // Default built-in seed accounts for displaying & logging ONLY in offline fallback
    const seedAccounts = [
      { id: 'uid_student5', username: 'student5', displayName: 'تلميذ(ة) المستوى الخامس ابتدائي', level: '5' as const, password: 'primary5', role: 'student' },
      { id: 'uid_student6', username: 'student6', displayName: 'تلميذ(ة) المستوى السادس ابتدائي', level: '6' as const, password: 'primary6', role: 'student' },
      { id: 'uid_ahmed5', username: 'ahmed5', displayName: 'أحمد العلمي', level: '5' as const, password: 'primary5', role: 'student' },
      { id: 'uid_fatima5', username: 'fatima5', displayName: 'فاطمة الزهراء البقالي', level: '5' as const, password: 'primary5', role: 'student' },
      { id: 'uid_zinab5', username: 'zinab5', displayName: 'زينب الشاوي', level: '5' as const, password: 'primary5', role: 'student' },
      { id: 'uid_yassine6', username: 'yassine6', displayName: 'ياسين بنجلون', level: '6' as const, password: 'primary6', role: 'student' },
      { id: 'uid_maryam6', username: 'maryam6', displayName: 'مريم التازي', level: '6' as const, password: 'primary6', role: 'student' },
      { id: 'uid_omar6', username: 'omar6', displayName: 'عمر الإدريسي', level: '6' as const, password: 'primary6', role: 'student' },
    ];

    const localAccounts = getLocalItems<any>('edu_student_accounts');
    const allAccountsMap = new Map<string, any>();
    
    // Add seed accounts first (if demo is not hidden), then local, then override with firebase values
    const isHideDemo = localStorage.getItem('edu_hide_demo_data') === 'true';
    if (!isHideDemo) {
      seedAccounts.forEach(acc => allAccountsMap.set(acc.id, acc));
    }
    
    localAccounts.forEach(acc => allAccountsMap.set(acc.id, { role: 'student', ...acc }));

    const list = Array.from(allAccountsMap.values());
    if (level) {
      return list.filter(acc => acc.level === level);
    }
    return list;
  },

  addStudentAccount: async (displayName: string, level: '5' | '6', username: string, password: string): Promise<any> => {
    console.log("[dbService] addStudentAccount triggered for student:", { displayName, level, username });
    let uid = `uid_${username.trim().toLowerCase()}`;
    
    if (isFirebaseAvailable) {
      try {
        console.log(`[dbService] Dual-write active: creating Authentication account for student: ${username}`);
        const authUid = await createAuthUserSafely(username, password);
        if (authUid) {
          console.log(`[dbService] Auth account created successfully with UID: ${authUid}. Overriding destination ID.`);
          uid = authUid;
        }
      } catch (authErr) {
        console.error("[dbService] Firebase Auth dual-write creation failed for student, falling back to custom state:", authErr);
      }
    }

    const logPath = `users/${uid}`;
    const payload = {
      uid: uid,
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      level,
      password: password.trim(),
      notes: '',
      role: 'student',
      createdAt: new Date().toISOString()
    };

    console.log(`[dbService] addStudentAccount payload for Firestore doc ${uid}:`, payload);

    if (isFirebaseAvailable) {
      try {
        await setDoc(doc(db, 'users', uid), payload, { merge: true });
        console.log(`[dbService] Document written successfully to Firestore path for student: ${logPath}`);
        return payload; // single source of truth - bypass local storage writing when online
      } catch (error) {
        console.error(`[dbService] Firestore document write failure for student ${logPath}:`, error);
        handleFirestoreError(error, OperationType.WRITE, logPath);
      }
    }

    // Sync to local student accounts storage ONLY to compile with offline mode fallback
    const localAccounts = getLocalItems<any>('edu_student_accounts');
    const existingIndex = localAccounts.findIndex(acc => acc.id === uid);
    const item = { id: uid, ...payload };
    if (existingIndex !== -1) {
      localAccounts[existingIndex] = item;
    } else {
      localAccounts.push(item);
    }
    saveLocalItems('edu_student_accounts', localAccounts);

    // Sync to legacy/unified local storage
    const localUsers = getLocalItems<any>('edu_users_all');
    const existingUserIndex = localUsers.findIndex(u => u.id === uid || u.username === payload.username);
    if (existingUserIndex !== -1) {
      localUsers[existingUserIndex] = { id: uid, ...payload };
    } else {
      localUsers.push({ id: uid, ...payload });
    }
    saveLocalItems('edu_users_all', localUsers);

    // Sync to local notes storage
    const localNotes = getLocalItems<any>('edu_student_notes');
    const existingNoteIndex = localNotes.findIndex(n => n.id === uid);
    if (existingNoteIndex === -1) {
      localNotes.push({ id: uid, username: username.trim(), displayName: displayName.trim(), level, notes: '', role: 'student' });
      saveLocalItems('edu_student_notes', localNotes);
    }

    return item;
  },

  deleteStudentAccount: async (uid: string): Promise<void> => {
    const logPath = `users/${uid}`;
    if (isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, 'users', uid));
        return; // single source of truth - bypass local storage writing when online
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, logPath);
      }
    }

    // Sync local accounts ONLY when offline
    const localAccounts = getLocalItems<any>('edu_student_accounts');
    const updatedAccounts = localAccounts.filter((acc: any) => acc.id !== uid);
    saveLocalItems('edu_student_accounts', updatedAccounts);

    // Sync local unified user list
    const localUsers = getLocalItems<any>('edu_users_all');
    const updatedUsers = localUsers.filter((u: any) => u.id !== uid);
    saveLocalItems('edu_users_all', updatedUsers);

    // Sync local notes
    const localNotes = getLocalItems<any>('edu_student_notes');
    const updatedNotes = localNotes.filter((n: any) => n.id !== uid);
    saveLocalItems('edu_student_notes', updatedNotes);
  },

  subscribeAllUsers: (onUpdate: (users: any[]) => void) => {
    if (!isFirebaseAvailable) {
      dbService.getAllUsers().then(onUpdate);
      return () => {};
    }

    const q = query(collection(db, 'users'));
    return onSnapshot(q, (snapshot) => {
      const usersList = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        let derivedRole = data.role || 'student';
        if (data.username === 'superadmin') derivedRole = 'superadmin';
        if (data.username === 'teacher') derivedRole = 'teacher';
        return {
          id: docSnap.id,
          uid: docSnap.id,
          role: derivedRole,
          ...data
        };
      });
      onUpdate(usersList);
    }, (err) => {
      console.error("Error subscribing to all users in real-time:", err);
    });
  },

  subscribeStudentsForTeacher: (teacherUid: string, onUpdate: (students: any[]) => void) => {
    if (!isFirebaseAvailable) {
      dbService.getStudentsForTeacher(teacherUid).then(onUpdate);
      return () => {};
    }

    let unsubscribeStudents: (() => void) | null = null;
    let assignedClasses: string[] = [];

    const unsubscribeTeacher = onSnapshot(doc(db, 'users', teacherUid), (teacherSnap) => {
      if (teacherSnap.exists()) {
        const teacherData = teacherSnap.data();
        assignedClasses = teacherData.assignedClasses || [];
      } else {
        assignedClasses = [];
      }

      if (unsubscribeStudents) unsubscribeStudents();
      
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      unsubscribeStudents = onSnapshot(q, (snapshot) => {
        const list: any[] = [];
        snapshot.docs.forEach(docSnap => {
          const detail = docSnap.data();
          if (assignedClasses.includes(detail.level)) {
            list.push({
              id: docSnap.id,
              uid: docSnap.id,
              username: detail.username,
              displayName: detail.displayName,
              level: detail.level,
              password: detail.password || '',
              notes: detail.notes || '',
              role: 'student'
            });
          }
        });
        onUpdate(list);
      });
    }, (err) => {
      console.error("Error subscribing to teacher's profile in real-time:", err);
    });

    return () => {
      unsubscribeTeacher();
      if (unsubscribeStudents) unsubscribeStudents();
    };
  },

  getStudentsForTeacher: async (teacherUid: string): Promise<any[]> => {
    // 1. Fetch teacher details to know their assigned classes
    let teacherProfile: any = null;
    if (isFirebaseAvailable) {
      try {
        const docSnap = await getDoc(doc(db, 'users', teacherUid));
        if (docSnap.exists()) {
          teacherProfile = docSnap.data();
        }
      } catch (err) {
        console.warn("Error fetching teacher profile from Firebase:", err);
      }
    }

    if (!teacherProfile) {
      const localUsers = getLocalItems<any>('edu_users_all');
      teacherProfile = localUsers.find(u => u.id === teacherUid);
    }

    // Default custom teacher fallback if it's the custom teacher
    if (!teacherProfile && teacherUid === 'custom_teacher') {
      const customTeacher = dbService.getCustomTeacher();
      if (customTeacher) teacherProfile = customTeacher;
    }

    const assigned = teacherProfile?.assignedClasses || [];
    
    // 2. Fetch all student accounts
    const allStudents = await dbService.getStudentAccounts();
    
    // If assignedClasses is empty, teacher is not assigned to any class yet, return empty list
    if (assigned.length === 0) {
      return [];
    }

    // 3. Filter students whose level is in the teacher's assignedClasses
    return allStudents.filter(student => assigned.includes(student.level));
  },

  getTeachersForStudent: async (studentLevel: '5' | '6'): Promise<any[]> => {
    // 1. Fetch all users
    const allUsers = await dbService.getAllUsers();
    
    // 2. Filter teachers who have role 'teacher' and whose assignedClasses contains studentLevel
    const teachers = allUsers.filter(u => {
      const isTeacher = u.role === 'teacher' || u.role === UserRole.TEACHER;
      const isAssigned = u.assignedClasses && Array.isArray(u.assignedClasses) && u.assignedClasses.includes(studentLevel);
      return isTeacher && isAssigned;
    });

    return teachers.map(t => ({
      id: t.id,
      displayName: t.displayName || t.username,
      role: 'teacher',
      subject: t.subject || 'غير محدد',
      assignedClasses: t.assignedClasses || []
    }));
  },

  getStudentProfile: async (uid: string): Promise<any> => {
    let profileData: any = {
      schoolName: '',
      arabicTeacher: '',
      frenchMathTeacher: '',
      displayName: ''
    };

    if (isFirebaseAvailable) {
      try {
        const docSnap = await getDoc(doc(db, 'users', uid));
        if (docSnap.exists()) {
          const data = docSnap.data();
          profileData = {
            schoolName: data.schoolName || '',
            arabicTeacher: data.arabicTeacher || '',
            frenchMathTeacher: data.frenchMathTeacher || '',
            displayName: data.displayName || ''
          };
          return profileData;
        }
      } catch (err) {
        console.warn("Error fetching student profile from Firebase:", err);
      }
    }

    // fallback: load from local student accounts or unified users all
    const localUsers = getLocalItems<any>('edu_users_all');
    const match = localUsers.find((u: any) => u.id === uid);
    if (match) {
      profileData = {
        schoolName: match.schoolName || '',
        arabicTeacher: match.arabicTeacher || '',
        frenchMathTeacher: match.frenchMathTeacher || '',
        displayName: match.displayName || ''
      };
    } else {
      const localStudents = getLocalItems<any>('edu_student_accounts');
      const studMatch = localStudents.find((s: any) => s.id === uid);
      if (studMatch) {
        profileData = {
          schoolName: studMatch.schoolName || '',
          arabicTeacher: studMatch.arabicTeacher || '',
          frenchMathTeacher: studMatch.frenchMathTeacher || '',
          displayName: studMatch.displayName || ''
        };
      }
    }
    return profileData;
  },

  saveStudentProfile: async (uid: string, profile: { schoolName: string; displayName: string; arabicTeacher: string; frenchMathTeacher: string }): Promise<void> => {
    if (isFirebaseAvailable) {
      try {
        await setDoc(doc(db, 'users', uid), {
          schoolName: profile.schoolName.trim(),
          arabicTeacher: profile.arabicTeacher.trim(),
          frenchMathTeacher: profile.frenchMathTeacher.trim(),
          displayName: profile.displayName.trim(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Error saving student profile to Firebase:", err);
      }
    }

    // Update in edu_users_all
    const localUsers = getLocalItems<any>('edu_users_all');
    const idx = localUsers.findIndex(u => u.id === uid);
    if (idx !== -1) {
      localUsers[idx] = {
        ...localUsers[idx],
        schoolName: profile.schoolName.trim(),
        arabicTeacher: profile.arabicTeacher.trim(),
        frenchMathTeacher: profile.frenchMathTeacher.trim(),
        displayName: profile.displayName.trim(),
        updatedAt: new Date().toISOString()
      };
      saveLocalItems('edu_users_all', localUsers);
    }

    // Update in edu_student_accounts
    const localStudents = getLocalItems<any>('edu_student_accounts');
    const studIdx = localStudents.findIndex(s => s.id === uid);
    if (studIdx !== -1) {
      localStudents[studIdx] = {
        ...localStudents[studIdx],
        schoolName: profile.schoolName.trim(),
        arabicTeacher: profile.arabicTeacher.trim(),
        frenchMathTeacher: profile.frenchMathTeacher.trim(),
        displayName: profile.displayName.trim(),
        updatedAt: new Date().toISOString()
      };
      saveLocalItems('edu_student_accounts', localStudents);
    }

    // Update local profile notes list too for uniformity
    const localNotes = getLocalItems<any>('edu_student_notes');
    const noteIdx = localNotes.findIndex(n => n.id === uid);
    if (noteIdx !== -1) {
      localNotes[noteIdx].displayName = profile.displayName.trim();
      saveLocalItems('edu_student_notes', localNotes);
    }

    // Update the live session displayName if it's the current user
    try {
      const sessionRaw = localStorage.getItem('edu_session');
      if (sessionRaw) {
        const session = JSON.parse(sessionRaw);
        if (session.uid === uid) {
          session.displayName = profile.displayName.trim();
          localStorage.setItem('edu_session', JSON.stringify(session));
        }
      }
    } catch (err) {
      console.error(err);
    }
  },

  getSchoolName: async (): Promise<string> => {
    if (isFirebaseAvailable) {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'school_config'));
        if (docSnap.exists()) {
          return docSnap.data().schoolName || '';
        }
      } catch (err) {
        console.warn("Error fetching school name from Firebase:", err);
      }
    }
    return localStorage.getItem('edu_school_name') || 'مدرسة ميمونة أم المؤمنين';
  },

  saveSchoolName: async (schoolName: string): Promise<void> => {
    const cleanName = schoolName.trim();
    if (isFirebaseAvailable) {
      try {
        await setDoc(doc(db, 'settings', 'school_config'), {
          schoolName: cleanName,
          updatedAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Error saving school name to Firebase:", err);
      }
    }
    localStorage.setItem('edu_school_name', cleanName);
  },

  getAnnouncements: async (level?: '5' | '6' | 'all'): Promise<Announcement[]> => {
    const logPath = 'announcements';
    console.log(`[dbService] getAnnouncements for level: ${level}`);
    if (isFirebaseAvailable) {
      try {
        const q = query(collection(db, logPath), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        const firebaseAnnouncements = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as any) } as Announcement));
        
        // Sync to local storage
        saveLocalItems('edu_announcements', firebaseAnnouncements);
        
        if (level && level !== 'all') {
          return firebaseAnnouncements.filter(ann => ann.level === level || ann.level === 'all');
        }
        return firebaseAnnouncements;
      } catch (error) {
        console.warn("[dbService] Firestore error in getAnnouncements, falling back to local:", error);
      }
    }
    
    const local = getLocalItems<Announcement>('edu_announcements');
    const sorted = local.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (level && level !== 'all') {
      return sorted.filter(ann => ann.level === level || ann.level === 'all');
    }
    return sorted;
  },

  addAnnouncement: async (text: string, level: '5' | '6' | 'all', authorId: string, authorName: string): Promise<Announcement> => {
    const logPath = 'announcements';
    const newAnn: Omit<Announcement, 'id'> = {
      text: text.trim(),
      level,
      createdAt: new Date().toISOString(),
      authorId,
      authorName
    };

    console.log("[dbService] addAnnouncement payload:", newAnn);

    let createdAnn: Announcement;
    if (isFirebaseAvailable) {
      try {
        const docRef = await addDoc(collection(db, logPath), newAnn);
        createdAnn = { id: docRef.id, ...newAnn };
        console.log("[dbService] Announcement saved in Firestore with ID:", docRef.id);
      } catch (error) {
        console.error("[dbService] Error writing announcement to Firestore:", error);
        createdAnn = { id: `ann_${Date.now()}`, ...newAnn };
      }
    } else {
      createdAnn = { id: `ann_${Date.now()}`, ...newAnn };
    }

    // Always update local storage
    const local = getLocalItems<Announcement>('edu_announcements');
    local.unshift(createdAnn);
    saveLocalItems('edu_announcements', local);
    return createdAnn;
  },

  deleteAnnouncement: async (id: string): Promise<void> => {
    const logPath = 'announcements';
    console.log(`[dbService] deleteAnnouncement: ${id}`);
    if (isFirebaseAvailable) {
      try {
        await deleteDoc(doc(db, logPath, id));
        console.log(`[dbService] Deleted announcement from Firestore: ${id}`);
      } catch (error) {
        console.error(`[dbService] Error deleting announcement ${id} from Firestore:`, error);
      }
    }

    const local = getLocalItems<Announcement>('edu_announcements');
    const filtered = local.filter(ann => ann.id !== id);
    saveLocalItems('edu_announcements', filtered);
  },

  getTimetable: async (level: '5' | '6'): Promise<Timetable | null> => {
    const logPath = 'timetables';
    console.log(`[dbService] getTimetable for level: ${level}`);
    
    if (isFirebaseAvailable) {
      try {
        const docSnap = await getDoc(doc(db, logPath, level));
        if (docSnap.exists()) {
          const fetched = { id: docSnap.id, ...(docSnap.data() as any) } as Timetable;
          localStorage.setItem(`edu_timetable_${level}`, JSON.stringify(fetched));
          return fetched;
        } else {
          console.log(`[dbService] No timetable document found for level ${level} in Firestore.`);
        }
      } catch (error) {
        console.warn(`[dbService] Firestore error in getTimetable for level ${level}, falling back to local:`, error);
      }
    }

    const cached = localStorage.getItem(`edu_timetable_${level}`);
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        return null;
      }
    }
    return null;
  },

  saveTimetable: async (level: '5' | '6', fileUrl: string, fileName: string, authorId: string): Promise<Timetable> => {
    const logPath = 'timetables';
    const payload: Omit<Timetable, 'id'> = {
      level,
      fileUrl,
      fileName,
      createdAt: new Date().toISOString(),
      authorId
    };

    console.log(`[dbService] saveTimetable for level ${level}:`, payload);

    if (isFirebaseAvailable) {
      try {
        await setDoc(doc(db, logPath, level), payload, { merge: true });
        console.log(`[dbService] Successfully saved timetable for level ${level} in Firestore.`);
      } catch (error) {
        console.error(`[dbService] Error saving timetable for level ${level} in Firestore:`, error);
      }
    }

    const timetableObj: Timetable = { id: level, ...payload };
    localStorage.setItem(`edu_timetable_${level}`, JSON.stringify(timetableObj));
    return timetableObj;
  },

  uploadTimetableFile: async (file: File, level: '5' | '6', authorId: string): Promise<Timetable> => {
    if (isFirebaseAvailable && storage) {
      try {
        console.log(`[dbService] Starting file upload for timetable level ${level}: ${file.name}`);
        const uniqueFileName = `timetable_${level}_${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const storageRef = ref(storage, `timetables/${uniqueFileName}`);
        const snapshot = await uploadBytes(storageRef, file);
        const downloadUrl = await getDownloadURL(snapshot.ref);
        console.log(`[dbService] File uploaded successfully to Storage. URL: ${downloadUrl}`);
        return await dbService.saveTimetable(level, downloadUrl, file.name, authorId);
      } catch (error) {
        console.error("[dbService] Error in uploadTimetableFile or falling back to Base64:", error);
      }
    }

    // fallback base64
    console.log("[dbService] Falling back to Base64 for timetable local caching.");
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const fileUrl = event.target?.result as string;
          if (!fileUrl) {
            reject(new Error("تعذرت قراءة ملف استعمال الزمن المحدد."));
            return;
          }
          const timetableObj = await dbService.saveTimetable(level, fileUrl, file.name, authorId);
          resolve(timetableObj);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => {
        reject(new Error("فشلت عملية قراءة ملف استعمال الزمن المحلي."));
      };
      reader.readAsDataURL(file);
    });
  }
};

