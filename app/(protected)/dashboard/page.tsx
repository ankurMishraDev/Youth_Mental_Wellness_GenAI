'use client';

import { ModernHomeSection } from '@/components/sections/ModernHomeSection';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const auth = useAuth();

  return (
    <div className="flex flex-col h-full bg-gray-200 dark:bg-gray-900 p-2 md:p-4 max-w-full">
      <ModernHomeSection
        setCurrentView={(view) => {
          if (view === 'session') {
            router.push('/session');
          }
        }}
        currentUser={auth.currentUser}
      />
    </div>
  );
}
