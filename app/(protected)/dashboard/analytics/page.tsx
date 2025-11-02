'use client';

import { AnalyticsSection } from '@/components/sections/AnalyticsSection';
import { DashboardHeader } from '@/components/DashboardHeader';
import { useAuth } from '@/hooks/useAuth';

export default function AnalyticsPage() {
  const auth = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-orange-100 p-2 md:p-4">
      <DashboardHeader
        dashboardPage="analytics"
        currentUserName={auth.currentUser?.name || 'User'}
        currentUser={auth.currentUser}
      />
      
      <AnalyticsSection currentUser={auth.currentUser} />
    </div>
  );
}
