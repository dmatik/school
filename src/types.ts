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

export interface Incident {
  id: string;
  studentName?: string;
  date: string;
  type: string;
  description: string;
  teacher?: string;
  rawData?: string;
  createdAt?: string;
}

export interface HomeworkItem {
  id: string;
  studentName?: string;
  subject: string;
  dueDate: string;
  description: string;
  completed: boolean;
  rawData?: string;
  createdAt?: string;
}

