export type UserRole = 'STUDENT' | 'EVENT_OWNER' | 'SYSTEM_ADMIN' | 'CLASS_REPRESENTATIVE';

export interface UserInfo {
  id: string;
  loginId: string;
  fullName: string;
  studentCode?: string;
  roles: UserRole[];
  classId?: string;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: UserInfo;
}

