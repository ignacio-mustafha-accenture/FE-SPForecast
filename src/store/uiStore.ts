import { createStore } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface DrawerState {
  employeeDrawer: { open: boolean; employeeId: string | null };
  ticketPanel: { open: boolean; ticketId: string | null };
}

export interface UIState extends DrawerState {
  toasts: Toast[];
  columnOrder: Record<string, string[]>;
  openEmployeeDrawer: (employeeId: string) => void;
  closeEmployeeDrawer: () => void;
  openTicketPanel: (ticketId: string | null) => void;
  closeTicketPanel: () => void;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  setColumnOrder: (tableKey: string, order: string[]) => void;
}

export type UIStore = ReturnType<typeof createUIStore>;

export function createUIStore() {
  return createStore<UIState>()(
    persist(
      (set) => ({
        employeeDrawer: { open: false, employeeId: null },
        ticketPanel: { open: false, ticketId: null },
        toasts: [],
        columnOrder: {},
        openEmployeeDrawer: (employeeId) =>
          set({ employeeDrawer: { open: true, employeeId } }),
        closeEmployeeDrawer: () =>
          set({ employeeDrawer: { open: false, employeeId: null } }),
        openTicketPanel: (ticketId) =>
          set({ ticketPanel: { open: true, ticketId } }),
        closeTicketPanel: () =>
          set({ ticketPanel: { open: false, ticketId: null } }),
        addToast: (toast) =>
          set((s) => ({
            toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }],
          })),
        removeToast: (id) =>
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
        setColumnOrder: (tableKey, order) =>
          set((s) => ({ columnOrder: { ...s.columnOrder, [tableKey]: order } })),
      }),
      {
        name: 'sp-forecast-ui',
        storage: createJSONStorage(() =>
          typeof window !== 'undefined' ? sessionStorage : { getItem: () => null, setItem: () => {}, removeItem: () => {} }
        ),
        partialize: (s) => ({ columnOrder: s.columnOrder }),
      },
    ),
  );
}
