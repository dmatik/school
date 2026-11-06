export type UserRole = 'admin' | 'user';
export type FamilyRole = 'parent' | 'child';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  familyRole: FamilyRole;
  linkedChildId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebtopChild {
  id: string;
  externalId?: string;
  firstName: string;
  lastName: string;
  classCode: number;
  classNum: number;
  cellphone?: string | null;
  color?: string | null;
}

export interface WebtopConfig {
  configured: boolean;
  username: string | null;
  selectedChildId: string | null;
  linkedChildren: WebtopChild[];
  lastSyncedAt: string | null;
  syncStatus: 'idle' | 'syncing' | 'success' | 'error';
  syncError: string | null;
}

export interface Incident {
  id: string;
  childId?: string;
  studentId?: string;
  studentName?: string;
  date: string;
  type: string;
  subject?: string;
  teacher?: string;
  description: string;
  hourNum?: number | null;
  isJustified?: boolean | number;
  eventCode?: number | null;
  rawData?: string;
  createdAt?: string;
}

export interface HomeworkItem {
  id: string;
  childId?: string;
  studentId?: string;
  studentName?: string;
  subject: string;
  teacher?: string;
  dueDate: string;
  description: string;
  lessonSubject?: string;
  hourNum?: number | null;
  completed: boolean;
  rawData?: string;
  createdAt?: string;
}

export interface ConsolidatedHomeworkItem extends HomeworkItem {
  hourNums: number[];
  ids: string[];
}

export interface ExamItem {
  id: string;
  childId: string;
  studentName: string;
  name: string;
  description?: string | null;
  date: string;
  grade?: string | null;
  createdAt?: string;
  updatedAt?: string;
}
