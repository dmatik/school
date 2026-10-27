export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export interface WebtopChild {
  id: string;
  firstName: string;
  lastName: string;
  classCode: number;
  classNum: number;
  cellphone?: string | null;
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
