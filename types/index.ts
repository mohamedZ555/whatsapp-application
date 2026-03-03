import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string;
      uid: string;
      roleId: number;
      vendorId: string | null;
      vendorUid: string | null;
      permissions: string[];
      permissionsRestricted: boolean;
      planDisabledPerms: string[];
    };
  }
}

export type Locale = 'ar' | 'en';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
