export const Permission = {
  STATE_READ: 'state:read',
  TICKETS_CREATE: 'tickets:create',
  TICKETS_UPDATE: 'tickets:update',
  TICKETS_DELETE: 'tickets:delete',
  EMPLOYEES_UPDATE: 'employees:update',
  PPA_APPLY: 'ppa:apply',
  RECALCULATE: 'recalculate',
  SYNC: 'sync',
  ADMIN_READ: 'admin:read',
  ADMIN_WRITE: 'admin:write',
  EXPORT: 'export',
  MANAGE_USERS: 'manage:users',
  VIEW_ALL_COUNTRIES: 'view:all_countries',
  SETTINGS_WRITE: 'settings:write',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
