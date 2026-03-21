import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { useLocation } from 'react-router-dom';

const TITLES: Record<string, string> = {
    '/': 'Live Feed',
    '/review': 'Human Review Queue',
    '/analytics': 'Analytics',
    '/settings': 'Settings',
};

export function Layout({ children }: { children: ReactNode }) {
    const { pathname } = useLocation();
    const title = pathname.startsWith('/run/') ? 'Run Detail'
        : TITLES[pathname] ?? 'PipelineIQ';

    return (
        <div className="flex h-screen bg-bg0 overflow-hidden">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <TopBar title={title} />
                <main className="flex-1 overflow-y-auto p-6" role="main">
                    {children}
                </main>
            </div>
        </div>
    );
}
