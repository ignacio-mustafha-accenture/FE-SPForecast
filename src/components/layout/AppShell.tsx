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
      {/* Sin overflow propio: el scroll es el de la pagina, asi los encabezados sticky
          de las vistas se anclan al viewport y no a una caja interna */}
      <main
        className="min-h-screen"
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
