/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  TEACHER = 'TEACHER',
  STUDENT_5 = 'STUDENT_5',
  STUDENT_6 = 'STUDENT_6',
}

export interface UserSession {
  uid: string;
  username: string;
  role: UserRole;
  displayName: string;
  level?: '5' | '6';
  subject?: string;
  assignedClasses?: string[];
}

export interface Exercise {
  id: string;
  text: string;
  level: '5' | '6';
  category: 'تمرين' | 'فرض' | 'مراقبة مستمرة';
  createdAt: string; // ISO String
  authorId: string;
}

export interface Score {
  id: string;
  studentName: string;
  level: '5' | '6';
  subject: string;
  scoreValue: string; // e.g. "8.5/10" or "18/20"
  scoreType: 'نقطة المراقبة المستمرة' | 'الفرض';
  createdAt: string; // ISO String
}

export interface Absence {
  id: string;
  studentName: string;
  level: '5' | '6';
  date: string; // YYYY-MM-DD
  absenceType: 'غياب مبرر' | 'غياب غير مبرر';
  createdAt: string; // ISO String
}

export interface EduDocument {
  id: string;
  name: string;
  level: '5' | '6';
  fileType: string; // e.g. "وثيقة تربوية" | "صورة توضيحية" | "تمرين مصور" | "ملخص الدرس"
  fileUrl: string; // Firebase Storage URL or base64 Data URL
  createdAt: string; // ISO String
  authorId: string;
}

export interface Announcement {
  id: string;
  text: string;
  createdAt: string; // ISO String
  level: '5' | '6' | 'all';
  authorId: string;
  authorName: string;
}

export interface Timetable {
  id: string;
  level: '5' | '6';
  fileUrl: string;
  fileName: string;
  createdAt: string;
  authorId: string;
}

export interface EduResource {
  id: string;
  title: string;
  subject: string;
  fileUrl: string; // Google Drive url or external url
  level: '5' | '6' | 'all';
  createdAt: string; // ISO string
  authorId: string;
  authorName: string;
}

