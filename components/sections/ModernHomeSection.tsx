"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  MessageCircle,
  Heart,
  Brain,
  Activity,
  BookOpen,
  TrendingUp,
  Calendar,
  Sparkles,
  Users,
  RefreshCw,
  Zap,
  Target,
  Play,
  PenTool,
  Smile,
  Sprout,
  Flower2,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
} from "recharts";
import { MoodData, ViewType } from "../../lib/types";
import { TreeVisualization } from "../TreeVisualization";

interface ModernHomeSectionProps {
  setCurrentView: (view: ViewType) => void;
  currentUser: any;
}

export const ModernHomeSection: React.FC<ModernHomeSectionProps> = ({
  setCurrentView,
  currentUser,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [moodTrends, setMoodTrends] = useState<any[]>([]);
  const [wellnessTimeline, setWellnessTimeline] = useState<any[]>([]);
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser?.uid) {
      fetchDashboardData();
    }
  }, [currentUser?.uid]);

  const generateAvatar = async () => {
    setIsGeneratingAvatar(true);
    try {
      const response = await fetch('/api/generate-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          style: 'modern',
          gender: dashboardData?.gender?.toLowerCase() || 'neutral',
          age: dashboardData?.age && dashboardData.age < 18 ? 'teen' : 'young',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.imageUrl) {
          setAvatarUrl(data.imageUrl);
          // Optionally save to user profile in database
          console.log('Generated avatar:', data.imageUrl);
        } else {
          console.error('Failed to generate avatar:', data.error);
          alert('Failed to generate profile picture. Please try again.');
        }
      } else {
        throw new Error('Failed to generate avatar');
      }
    } catch (error) {
      console.error('Error generating avatar:', error);
      alert('Error generating profile picture. Please check your API key.');
    } finally {
      setIsGeneratingAvatar(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchDashboardData();
    }
  }, [currentUser?.uid]);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch user data, session summaries, and analytics in parallel
      const token = await currentUser.getIdToken();
      const [userResponse, summariesResponse, analyticsResponse] = await Promise.all([
        fetch(`/api/user/${currentUser.uid}`),
        fetch("/api/session-summaries", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: currentUser.uid }),
        }),
        fetch(`/api/analytics-summary/${currentUser.uid}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      // Process user and session data
      if (userResponse.ok) {
        const userData = await userResponse.json();
        let sessionCount = 0;
        let moodHistory: any[] = [];

        if (summariesResponse.ok) {
          const summariesData = await summariesResponse.json();
          sessionCount = summariesData.summaries?.length || 0;
          if (summariesData.summaries && summariesData.summaries.length > 0) {
            moodHistory = summariesData.summaries
              .slice(0, 7)
              .reverse()
              .map((summary: any, index: number) => ({
                name: `Day ${index + 1}`,
                mood: summary.summary_data?.mood_percentage || 0,
                energy: summary.summary_data?.energy_level || 0,
                stress: 100 - (summary.summary_data?.stress_level || 0),
                date: new Date(summary.created_at?.seconds * 1000).toLocaleDateString(),
              }));
          }
        }

        const journalResponse = await fetch("/api/journal");
        let journalCount = 0;
        if (journalResponse.ok) {
          const journalData = await journalResponse.json();
          journalCount = journalData.entries?.length || 0;
        }

        setDashboardData({
          ...userData,
          sessionCount,
          journalCount,
          latestMood: userData.latestSummary?.summary_data,
        });
        setMoodTrends(moodHistory);
      }

      // Process analytics data for wellness timeline
      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        if (analyticsData.exists && analyticsData.summary.daily_history) {
          const formattedTimeline = analyticsData.summary.daily_history
            .map((item: any) => ({
              date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
              mood: item.mood_avg,
              stress: item.stress_avg,
              energy: item.energy_avg,
            }))
            .slice(0, 7) // Take the last 7 days
            .reverse(); // To show oldest to newest
          setWellnessTimeline(formattedTimeline);
        }
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getSessionsProgress = () => {
    const totalSessions = dashboardData?.sessionCount || 0;
    const weeklyGoal = 7; // Goal: 7 sessions per week
    return Math.min((totalSessions / weeklyGoal) * 100, 100);
  };

  const getJournalsProgress = () => {
    const totalJournals = dashboardData?.journalCount || 0;
    const weeklyGoal = 5; // Goal: 5 journal entries per week
    return Math.min((totalJournals / weeklyGoal) * 100, 100);
  };

  // Mock developed areas - In real app, fetch from user profiling
  const developedAreas = [
    { name: "Emotional Awareness", progress: 71, color: "#f97316" },
    { name: "Stress Management", progress: 92, color: "#ec4899" },
    { name: "Social Skills", progress: 53, color: "#8b5cf6" },
    { name: "Self-Reflection", progress: 56, color: "#06b6d4" },
    { name: "Mindfulness", progress: 79, color: "#10b981" },
  ];

  if (isLoading && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      {/* Welcome Header - Simple and Minimal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Hello, {dashboardData?.name || "User"}!
          </h1>
          <p className="text-sm text-muted-foreground">Your personal dashboard overview</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={fetchDashboardData}
          disabled={isLoading}
          className="h-7 w-7"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Main Grid - Jigsaw Puzzle Layout */}
      <div className="grid grid-cols-12 gap-4 w-full">
        {/* Left Column - Profile (4 cols) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col space-y-4">
          {/* Profile Card - Enhanced with bigger avatar */}
          <Card className="relative overflow-hidden border border-orange-200/60 dark:border-orange-800/50 shadow-sm bg-gradient-to-br from-orange-50 via-white to-orange-100/80 py-2">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-400/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-400/10 rounded-full blur-2xl" />
            
            {/* Generate Avatar button in top-right corner */}
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={generateAvatar}
                disabled={isGeneratingAvatar}
                className="w-7 h-7 bg-gradient-to-br from-orange-400 to-pink-400 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 shadow-lg cursor-pointer hover:scale-110 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                title="Generate AI Profile Picture"
              >
                {isGeneratingAvatar ? (
                  <RefreshCw className="h-3.5 w-3.5 text-white animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                )}
              </button>
            </div>
            
            <CardContent className="relative px-2 py-0.5">
              <div className="flex flex-col items-center text-center space-y-2">
                <div className="relative group">
                  <Avatar className="h-24 w-24 border-4 border-white/60 dark:border-slate-800/60 shadow-2xl ring-4 ring-orange-300/70 dark:ring-orange-600/60">
                    <AvatarImage src={avatarUrl || dashboardData?.photoURL} />
                    <AvatarFallback className="text-3xl font-bold bg-gradient-to-br from-orange-400 to-pink-500 text-white">
                      {getInitials(dashboardData?.name || "User")}
                    </AvatarFallback>
                  </Avatar>
                  {isGeneratingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                      <div className="w-8 h-8 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
                
                <div>
                  <h3 className="font-bold text-2xl text-foreground">{dashboardData?.name || "User"}</h3>
                  <p className="text-sm text-muted-foreground">
                    {dashboardData?.gender || "Not specified"} • {dashboardData?.age || "N/A"} years
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 w-full pt-2">
                  <div className="text-center bg-white/50 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl p-1 border border-white/30 dark:border-slate-700/30 shadow-md">
                    <Users className="h-5 w-5 mx-auto mb-1 text-orange-600 dark:text-orange-400" />
                    <div className="text-xl font-bold text-foreground">
                      {dashboardData?.sessionCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Sessions</p>
                  </div>
                  <div className="text-center bg-white/50 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl p-1 border border-white/30 dark:border-slate-700/30 shadow-md">
                    <BookOpen className="h-5 w-5 mx-auto mb-1 text-cyan-600 dark:text-cyan-400" />
                    <div className="text-xl font-bold text-foreground">
                      {dashboardData?.journalCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Journals</p>
                  </div>
                  <div className="text-center bg-white/50 dark:bg-slate-800/40 backdrop-blur-sm rounded-xl p-1 border border-white/30 dark:border-slate-700/30 shadow-md">
                    <Zap className="h-5 w-5 mx-auto mb-1 text-purple-600 dark:text-purple-400" />
                    <div className="text-xl font-bold text-foreground">
                      {Math.floor(Math.random() * 30) + 1}
                    </div>
                    <p className="text-xs text-muted-foreground">Streak</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Daily Check-ins - Moved from right column */}
          <Card className="flex-grow border border-orange-200/60 dark:border-orange-800/50 shadow-sm bg-gradient-to-br from-orange-50 via-white to-orange-100/80 py-2">
            <CardHeader className="px-2 py-0.5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                  <Calendar className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  Daily Check-ins
                </CardTitle>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-orange-300/30">
                  <Calendar className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-2 py-0.5 space-y-2">
              {/* Check-in items */}
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm hover:shadow-md transition-all cursor-pointer border border-white/40 dark:border-slate-700/40">
                <div className="w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex items-center justify-center shadow-md flex-shrink-0 border border-orange-300/40 dark:border-orange-500/40">
                  <Brain className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-foreground">Evening Reflection</div>
                  <div className="text-xs text-muted-foreground">Today • 07:00 PM</div>
                </div>
                <div className="text-xs font-medium text-orange-600 dark:text-orange-400 flex-shrink-0">
                  3h
                </div>
              </div>
              
              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm hover:shadow-md transition-all cursor-pointer border border-white/40 dark:border-slate-700/40">
                <div className="w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex items-center justify-center shadow-md flex-shrink-0 border border-blue-300/40 dark:border-blue-500/40">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-foreground">Morning Journal</div>
                  <div className="text-xs text-muted-foreground">Tomorrow • 09:00 AM</div>
                </div>
                <div className="text-xs font-medium text-blue-600 dark:text-blue-400 flex-shrink-0">
                  Tmr
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm hover:shadow-md transition-all cursor-pointer border border-white/40 dark:border-slate-700/40">
                <div className="w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex items-center justify-center shadow-md flex-shrink-0 border border-purple-300/40 dark:border-purple-500/40">
                  <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-foreground">Wellness Check</div>
                  <div className="text-xs text-muted-foreground">Wed • 02:00 PM</div>
                </div>
                <div className="text-xs font-medium text-purple-600 dark:text-purple-400 flex-shrink-0">
                  Wed
                </div>
              </div>

              <div className="flex items-center gap-2 p-2 rounded-lg bg-white/60 dark:bg-slate-800/50 backdrop-blur-sm hover:shadow-md transition-all cursor-pointer border border-white/40 dark:border-slate-700/40">
                <div className="w-10 h-10 rounded-full bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm flex items-center justify-center shadow-md flex-shrink-0 border border-emerald-300/40 dark:border-emerald-500/40">
                  <Heart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate text-foreground">Mood Review</div>
                  <div className="text-xs text-muted-foreground">Fri • 06:00 PM</div>
                </div>
                <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  Fri
                </div>
              </div>

              <Button variant="ghost" className="w-full mt-2 h-8 hover:bg-indigo-200/50 dark:hover:bg-indigo-800/40 backdrop-blur-sm text-sm" size="sm">
                See all →
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Middle Column - Analytics (5 cols) */}
        <div className="col-span-12 lg:col-span-6 flex flex-col space-y-4">
          {/* Mood Trends Chart - Enhanced Glassmorphic */}
          <Card className="border border-orange-200/60 dark:border-orange-800/50 shadow-sm bg-gradient-to-br from-orange-50 via-white to-orange-100/80 py-2">
            <CardHeader className="px-2 py-0.5">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-xl font-semibold">
                  <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  Focus Trends
                </CardTitle>
                <span className="text-sm text-muted-foreground">Last 7 Sessions</span>
              </div>
            </CardHeader>
            <CardContent className="px-2 py-0.5 h-[280px]">
              {wellnessTimeline.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={wellnessTimeline} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 12 }}
                      stroke="#6b7280"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="circle"
                    />
                    <Line
                      type="monotone"
                      dataKey="mood"
                      stroke="#10b981"
                      strokeWidth={3}
                      name="Mood"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="stress"
                      stroke="#ef4444"
                      strokeWidth={3}
                      name="Stress"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="energy"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      name="Energy"
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Activity className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">Complete a few more sessions to see your wellness trends.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards Grid */}
          <div className="grid grid-cols-2 gap-4 flex-grow">
            {/* Prioritized Tasks Card */}
            <Card className="relative overflow-hidden border-orange-500/60 dark:border-orange-500/50 shadow-lg bg-gradient-to-br from-orange-100 to-rose-100 dark:from-orange-900/50 dark:to-rose-900/50 hover:shadow-xl transition-all duration-300 cursor-pointer group py-2" onClick={() => setCurrentView("session")}>
              <CardContent className="relative px-2 py-0.5 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-md font-semibold text-foreground/90 mb-0.5">Prioritized Tasks</p>
                    <div className="text-5xl font-bold bg-gradient-to-br from-orange-600 to-pink-600 bg-clip-text text-transparent leading-none">
                      {dashboardData?.latestMood?.mood_percentage || 0}%
                    </div>
                  </div>
                  <div className="p-1.5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                    <Heart className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <p className="text-sm text-foreground/70 mt-auto">Avg. Completed</p>
              </CardContent>
            </Card>

            {/* Additional Tasks Card */}
            <Card className="relative overflow-hidden border-cyan-500/60 dark:border-cyan-500/50 shadow-lg bg-gradient-to-br from-cyan-100 to-indigo-100 dark:from-cyan-900/50 dark:to-indigo-900/50 hover:shadow-xl transition-all duration-300 cursor-pointer group py-2" onClick={() => (window.location.href = "/journal")}>
              <CardContent className="relative px-2 py-0.5 h-full flex flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-md font-semibold text-foreground/90 mb-0.5">Additional Tasks</p>
                    <div className="text-5xl font-bold bg-gradient-to-br from-cyan-600 to-blue-600 bg-clip-text text-transparent leading-none">
                      {Math.round(((dashboardData?.journalCount || 0) / 10) * 100)}%
                    </div>
                  </div>
                  <div className="p-1.5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                    <BookOpen className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>
                <p className="text-sm text-foreground/70 mt-auto">Avg. Completed</p>
              </CardContent>
            </Card>

            {/* Developed Areas Card - Moved from right column */}
            <Card className="relative overflow-hidden border-gray-200/60 dark:border-gray-800/50 shadow-sm bg-white/80 dark:bg-gray-950/70 col-span-2 py-2">
              <div className="absolute top-0 right-0 w-24 h-24 bg-purple-400/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-20 h-20 bg-pink-400/10 rounded-full blur-2xl" />
              
              <CardContent className="relative px-2 py-0.5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm">
                      <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <p className="text-md font-semibold text-foreground/90">Developed Areas</p>
                  </div>
                  <span className="text-sm font-medium text-purple-600 dark:text-purple-400 bg-white/50 dark:bg-slate-800/50 px-2 py-0.5 rounded-full">
                    5 total
                  </span>
                </div>
                <div className="space-y-2">
                  {developedAreas.slice(0, 3).map((area) => (
                    <div key={area.name} className="flex items-center gap-2">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-foreground/90">{area.name}</span>
                          <span className="text-sm font-bold" style={{ color: area.color }}>
                            {area.progress}%
                          </span>
                        </div>
                        <div className="h-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-full overflow-hidden border border-white/30 dark:border-slate-700/30">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${area.progress}%`,
                              background: `linear-gradient(90deg, ${area.color}cc, ${area.color})`,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        {/* Right Column - Wellness Tree & Quick Actions (3 cols) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col space-y-4">
          {/* Streak Plant Growth - Taller card with more tree space */}
          <Card className="border border-emerald-600/70 dark:border-emerald-500/60 shadow-lg bg-gradient-to-br from-emerald-500 to-green-600 dark:from-emerald-600 dark:to-green-700 overflow-hidden py-2">
            <CardHeader className="px-2 py-0.5">
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center gap-2 text-xl font-semibold">
                  <Sprout className="h-6 w-6" />
                  Wellness Plant
                </span>
                <span className="text-3xl font-bold">{Math.floor(Math.random() * 30) + 1}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 py-0.5">
              {/* Animated Tree Visualization - Increased height */}
              <div className="relative h-64 bg-white/10 backdrop-blur-sm rounded-2xl border-2 border-white/20 overflow-hidden mb-3 flex items-center justify-center">
                <TreeVisualization 
                  streak={Math.floor(Math.random() * 30) + 1} 
                  className="h-60"
                />
              </div>
              
              {/* Stats in white */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-md font-medium text-white/90">Current Streak</span>
                  <span className="text-lg font-bold text-white">
                    {Math.floor(Math.random() * 30) + 1} days 🔥
                  </span>
                </div>
                <div className="h-2.5 bg-white/20 rounded-full overflow-hidden border border-white/30">
                  <div 
                    className="h-full bg-white rounded-full transition-all duration-700"
                    style={{ width: `${Math.min((Math.floor(Math.random() * 30) + 1) * 10, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">Growth Stage</span>
                  <span className="font-semibold text-white">
                    {Math.floor(Math.random() * 30) + 1 >= 7 ? "Blooming 🌸" : 
                     Math.floor(Math.random() * 30) + 1 >= 3 ? "Growing 🌱" : "Seedling 🌰"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions - Moved from left column */}
          <Card className="flex-grow border border-orange-200/60 dark:border-orange-800/50 shadow-sm bg-gradient-to-br from-orange-50 via-white to-orange-100/80 py-2">
            <CardHeader className="px-2 py-0.5">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <Zap className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="px-2 py-0.5 space-y-2">
              <Button
                className="w-full justify-start gap-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all h-9 text-sm font-semibold"
                onClick={() => setCurrentView("session")}
              >
                <Play className="h-4 w-4" />
                Start Session
              </Button>
              <Button
                className="w-full justify-start gap-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transition-all h-9 text-sm"
                onClick={() => (window.location.href = "/journal")}
              >
                <PenTool className="h-4 w-4" />
                New Journal
              </Button>
              <Button
                className="w-full justify-start gap-2 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 text-white shadow-lg hover:shadow-xl transition-all h-9 text-sm"
              >
                <Smile className="h-4 w-4" />
                Log Mood
              </Button>
              <div className="pt-2 border-t border-violet-300/30 dark:border-violet-500/20">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Today's Progress</span>
                  <span className="font-semibold text-violet-600 dark:text-violet-400">
                    {Math.round(((dashboardData?.sessionCount || 0) / 3) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-white/40 dark:bg-slate-800/40 backdrop-blur-sm rounded-full overflow-hidden border border-white/30 dark:border-slate-700/30">
                  <div
                    className="h-full bg-gradient-to-r from-violet-500 to-purple-500 rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(((dashboardData?.sessionCount || 0) / 3) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
