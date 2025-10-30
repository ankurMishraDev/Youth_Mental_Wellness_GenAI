'use client';

import { AnalyticsSection } from '@/components/sections/AnalyticsSection';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';

export default function AnalyticsPage() {
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <DashboardHeader
          dashboardPage="analytics"
          currentUserName={auth.currentUser?.name || 'User'}
          currentUser={auth.currentUser}
        />
        
        <div className="mt-8">
          <AnalyticsSection currentUser={auth.currentUser} />
        </div>
      </div>
    </div>
  );
}
