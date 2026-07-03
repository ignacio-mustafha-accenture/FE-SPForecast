import { ToastContainer } from '../ui/ToastContainer';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <TopBar />
      <Sidebar />
      <main
        className="min-h-screen overflow-y-auto"
        style={{
          paddingTop: 'var(--topbar-h)',
          paddingLeft: 'var(--sidebar-w)',
        }}
      >
        <div className="p-6">{children}</div>
      </main>
      <ToastContainer />
    </>
  );
}
