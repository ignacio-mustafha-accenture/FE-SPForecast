'use client';

import type { Permission } from '@/src/core/domain/permission';
import { useAuthStore } from '@/src/store/StoreProvider';

export function usePermission(permission: Permission): boolean {
  return useAuthStore((s) => s.permissions.includes(permission));
}
