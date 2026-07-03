'use client';

import dynamic from 'next/dynamic';

const AgentView = dynamic(() => import('@/src/views/agent/AgentView').then((m) => m.AgentView), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 text-[var(--G3)] text-sm">
      Cargando agente...
    </div>
  ),
});

export default function Page() {
  return <AgentView />;
}
