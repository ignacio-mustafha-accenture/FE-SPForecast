import { createStore } from 'zustand';

import type { Permission } from '@/src/core/domain/permission';
import type { User } from '@/src/core/domain/user';

export interface AuthState {
  user: User | null;
  permissions: Permission[];
  setUser: (user: User | null) => void;
  setPermissions: (permissions: Permission[]) => void;
  hasPermission: (permission: Permission) => boolean;
}

export type AuthStore = ReturnType<typeof createAuthStore>;

export function createAuthStore(initialUser: User | null = null) {
  return createStore<AuthState>((set, get) => ({
    user: initialUser,
    permissions: [],
    setUser: (user) => set({ user }),
    setPermissions: (permissions) => set({ permissions }),
    hasPermission: (permission) => get().permissions.includes(permission),
  }));
}
