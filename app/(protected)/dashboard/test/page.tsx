'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function TestDataPage() {
  const auth = useAuth();
  const [authData, setAuthData] = useState<any>(null);
  const [sessionData, setSessionData] = useState<any>(null);
  const [userApiData, setUserApiData] = useState<any>(null);
  const [dashboardStatsData, setDashboardStatsData] = useState<any>(null);
  const [rawMetricsData, setRawMetricsData] = useState<any>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (auth.currentUser) {
      setAuthData(auth.currentUser);
    }
  }, [auth.currentUser]);

  const fetchSessionData = async () => {
    setLoading(prev => ({ ...prev, session: true }));
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        cache: 'no-store'
      });
      const data = await response.json();
      setSessionData({ status: response.status, data });
    } catch (error: any) {
      setSessionData({ error: error.message });
    } finally {
      setLoading(prev => ({ ...prev, session: false }));
    }
  };

  const fetchUserApiData = async () => {
    if (!auth.currentUser?.uid) {
      setUserApiData({ error: 'No UID available' });
      return;
    }
    
    setLoading(prev => ({ ...prev, user: true }));
    try {
      const response = await fetch(`/api/user/${auth.currentUser.uid}`, {
        cache: 'no-store'
      });
      const data = await response.json();
      setUserApiData({ status: response.status, data });
    } catch (error: any) {
      setUserApiData({ error: error.message });
    } finally {
      setLoading(prev => ({ ...prev, user: false }));
    }
  };

  const fetchDashboardStats = async () => {
    if (!auth.currentUser?.uid) {
      setDashboardStatsData({ error: 'No UID available' });
      return;
    }
    
    setLoading(prev => ({ ...prev, stats: true }));
    try {
      const response = await fetch(`/api/dashboard-stats/${auth.currentUser.uid}`, {
        cache: 'no-store'
      });
      const data = await response.json();
      setDashboardStatsData({ status: response.status, data });
    } catch (error: any) {
      setDashboardStatsData({ error: error.message });
    } finally {
      setLoading(prev => ({ ...prev, stats: false }));
    }
  };

  const fetchRawMetrics = async () => {
    if (!auth.currentUser?.uid) {
      setRawMetricsData({ error: 'No UID available' });
      return;
    }
    
    setLoading(prev => ({ ...prev, metrics: true }));
    try {
      const response = await fetch(`/api/raw-metrics/${auth.currentUser.uid}?limit=5`, {
        cache: 'no-store'
      });
      const data = await response.json();
      setRawMetricsData({ status: response.status, data });
    } catch (error: any) {
      setRawMetricsData({ error: error.message });
    } finally {
      setLoading(prev => ({ ...prev, metrics: false }));
    }
  };

  const fetchAllData = () => {
    fetchSessionData();
    fetchUserApiData();
    fetchDashboardStats();
    fetchRawMetrics();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Data Debug Page</h1>
        <Button onClick={fetchAllData}>Fetch All Data</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Auth Hook Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🔐 Auth Hook (useAuth)</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {JSON.stringify(authData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Session Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>🍪 Session Data (/api/auth/me)</span>
              <Button 
                size="sm" 
                onClick={fetchSessionData}
                disabled={loading.session}
              >
                {loading.session ? 'Loading...' : 'Fetch'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {sessionData ? JSON.stringify(sessionData, null, 2) : 'Click Fetch to load data'}
            </pre>
          </CardContent>
        </Card>

        {/* User API Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>👤 User Profile (/api/user/:uid)</span>
              <Button 
                size="sm" 
                onClick={fetchUserApiData}
                disabled={loading.user || !auth.currentUser?.uid}
              >
                {loading.user ? 'Loading...' : 'Fetch'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {userApiData ? JSON.stringify(userApiData, null, 2) : 'Click Fetch to load data'}
            </pre>
          </CardContent>
        </Card>

        {/* Dashboard Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📊 Dashboard Stats</span>
              <Button 
                size="sm" 
                onClick={fetchDashboardStats}
                disabled={loading.stats || !auth.currentUser?.uid}
              >
                {loading.stats ? 'Loading...' : 'Fetch'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {dashboardStatsData ? JSON.stringify(dashboardStatsData, null, 2) : 'Click Fetch to load data'}
            </pre>
          </CardContent>
        </Card>

        {/* Raw Metrics (Last 5) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>📈 Raw Metrics (Last 5)</span>
              <Button 
                size="sm" 
                onClick={fetchRawMetrics}
                disabled={loading.metrics || !auth.currentUser?.uid}
              >
                {loading.metrics ? 'Loading...' : 'Fetch'}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
              {rawMetricsData ? JSON.stringify(rawMetricsData, null, 2) : 'Click Fetch to load data'}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* UID Display */}
      {auth.currentUser?.uid && (
        <Card>
          <CardHeader>
            <CardTitle>Current User UID</CardTitle>
          </CardHeader>
          <CardContent>
            <code className="bg-gray-100 p-2 rounded block">
              {auth.currentUser.uid}
            </code>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
