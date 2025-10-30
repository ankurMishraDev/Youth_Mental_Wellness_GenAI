import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ComposedChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Brain,
  Zap,
  Moon,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  Users,
  AlertCircle,
  Lock,
  RefreshCw,
} from "lucide-react";

interface MetricData {
  id: string;
  source: "ai_session" | "journal_entry";
  timestamp: string;
  confidence: number;
  mood_percentage: number | null;
  energy_level: number | null;
  stress_level: number | null;
  anxiety_level: number | null;
  emotional_score: number | null;
  cognitive_score: number | null;
  sleep_quality: number | null;
  social_connection_level: number | null;
  mood_stability: string | null;
  mood_calmness: string | null;
}

interface Aggregates {
  mood: {
    average: number | null;
    min: number | null;
    max: number | null;
    data_points: number;
    reliable: boolean;
  };
  stress: {
    average: number | null;
    min: number | null;
    max: number | null;
    data_points: number;
    reliable: boolean;
  };
  energy: {
    average: number | null;
    min: number | null;
    max: number | null;
    data_points: number;
    reliable: boolean;
  };
  anxiety: {
    average: number | null;
    data_points: number;
    reliable: boolean;
  };
  sleep: {
    average: number | null;
    data_points: number;
    reliable: boolean;
  };
  confidence: {
    average: number;
    high_confidence_count: number;
    medium_confidence_count: number;
    low_confidence_count: number;
  };
  total_entries: number;
  date_range: {
    earliest: string | null;
    latest: string | null;
  };
}

interface AnalyticsSectionProps {
  currentUser: { uid: string } | null;
}

// Helper component for window comparison cards
const WindowComparisonCard = ({ 
  period, 
  data, 
  isActive, 
  onClick 
}: { 
  period: string; 
  data: any; 
  isActive: boolean; 
  onClick: () => void;
}) => {
  if (!data) return null;
  
  const getTrendIcon = (current: number, previous: number) => {
    if (!previous) return <Minus className="h-4 w-4 text-gray-400" />;
    const diff = ((current - previous) / previous) * 100;
    if (diff > 5) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (diff < -5) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-400" />;
  };
  
  return (
    <Card 
      className={`cursor-pointer transition-all ${
        isActive ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span>{period}</span>
          <Calendar className="h-4 w-4 text-gray-400" />
        </CardTitle>
        <CardDescription className="text-xs">
          {data.entries_count} entries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Mood</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-green-600">{data.mood_avg || 0}</span>
            {getTrendIcon(data.mood_avg || 0, 70)}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Stress</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-red-600">{data.stress_avg || 0}</span>
            {getTrendIcon(data.stress_avg || 0, 30)}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Energy</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-yellow-600">{data.energy_avg || 0}</span>
            {getTrendIcon(data.energy_avg || 0, 65)}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const COLORS = {
  mood: "#10b981",
  stress: "#ef4444",
  energy: "#f59e0b",
  anxiety: "#8b5cf6",
  sleep: "#3b82f6",
  ai_session: "#06b6d4",
  journal_entry: "#ec4899",
};

export const AnalyticsSection: React.FC<AnalyticsSectionProps> = ({
  currentUser,
}) => {
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [breakdown, setBreakdown] = useState({ ai_sessions: 0, journal_entries: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "ai_session" | "journal_entry">("all");
  const [limit, setLimit] = useState(30);
  
  // NEW: Time period filter for embedded windows
  const [timePeriod, setTimePeriod] = useState<"7" | "30" | "90" | "all">("30");
  const [windowData, setWindowData] = useState<any>(null);
  const [weeklyHistory, setWeeklyHistory] = useState<any[]>([]);
  const [monthlyHistory, setMonthlyHistory] = useState<any[]>([]);

  // DEBUG: Log when component mounts and when currentUser changes
  useEffect(() => {
    console.log("🔍 AnalyticsSection mounted/updated");
    console.log("👤 currentUser:", currentUser);
    console.log("🆔 currentUser.uid:", currentUser?.uid);
  }, [currentUser]);

  const fetchMetrics = async () => {
    console.log("🚀 fetchMetrics CALLED");
    console.log("👤 currentUser in fetchMetrics:", currentUser);
    console.log("🆔 UID:", currentUser?.uid);
    
    if (!currentUser?.uid) {
      console.log("❌ NO UID - Aborting fetch");
      return;
    }

    console.log("✅ UID exists, proceeding with fetch");
    setIsLoading(true);
    
    try {
      const url = `/api/analytics-summary/${currentUser.uid}`;
      console.log("📡 Fetching from:", url);
      
      // Fetch analytics summary (FAST - 1 read)
      const summaryResponse = await fetch(url);
      console.log("📥 Response received:", summaryResponse.status, summaryResponse.ok);
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json();
        console.log("📦 Response data:", summaryData);
        
        if (summaryData.exists) {
          console.log("✅ Summary exists, processing data...");
          const summary = summaryData.summary;
          
          console.log("📦 RAW SUMMARY DATA:", summary);
          console.log("📊 Current state:", summary.current);
          console.log("📅 Weekly history:", summary.weekly_history);
          console.log("� Monthly history:", summary.monthly_history);
          console.log("🪟 Windows:", summary.windows);
          console.log("�🔢 Breakdown:", summary.breakdown);
          
          // STORE WINDOW DATA AND HISTORIES
          setWindowData(summary.windows || null);
          setWeeklyHistory(summary.weekly_history || []);
          setMonthlyHistory(summary.monthly_history || []);
          
          // BUILD TIMELINE DATA FROM WEEKLY HISTORY (for charts)
          let weeklyTimeline = (summary.weekly_history || [])
            .slice()
            .reverse()
            .map((week: any) => ({
              date: week.week,
              mood: week.mood_avg,
              stress: week.stress_avg,
              energy: week.energy_avg,
              entries: week.entries_count,
              id: week.week,
              source: "aggregated",
              timestamp: week.snapshot_taken_at,
              confidence: 0.85,
              mood_percentage: week.mood_avg,
              energy_level: week.energy_avg,
              stress_level: week.stress_avg,
              anxiety_level: null,
              emotional_score: null,
              cognitive_score: null,
              sleep_quality: null,
              social_connection_level: null,
              mood_stability: null,
              mood_calmness: null
            }));
          
          // FALLBACK: If no weekly history, use current state
          if (weeklyTimeline.length === 0 && summary.current?.mood?.data_points > 0) {
            console.log("⚠️ No weekly history, creating fallback from current state");
            weeklyTimeline = [{
              date: "Current",
              mood: summary.current.mood.average,
              stress: summary.current.stress.average,
              energy: summary.current.energy.average,
              entries: summary.breakdown?.total || 0,
              id: "current",
              source: "current",
              timestamp: new Date().toISOString(),
              confidence: 0.85,
              mood_percentage: summary.current.mood.average,
              energy_level: summary.current.energy.average,
              stress_level: summary.current.stress.average,
              anxiety_level: summary.current.anxiety?.average || null,
              emotional_score: null,
              cognitive_score: null,
              sleep_quality: summary.current.sleep?.average || null,
              social_connection_level: null,
              mood_stability: null,
              mood_calmness: null
            }];
          }
          
          console.log("📈 Timeline data created:", weeklyTimeline.length, "points");
          
          // Store timeline data
          setMetrics(weeklyTimeline as any);
          
          // Build aggregates from summary
          const aggregatesData = {
            mood: summary.current?.mood || { average: null, min: null, max: null, data_points: 0, reliable: false },
            stress: summary.current?.stress || { average: null, min: null, max: null, data_points: 0, reliable: false },
            energy: summary.current?.energy || { average: null, min: null, max: null, data_points: 0, reliable: false },
            anxiety: summary.current?.anxiety || { average: null, data_points: 0, reliable: false },
            sleep: summary.current?.sleep || { average: null, data_points: 0, reliable: false },
            confidence: {
              average: 0.85,
              high_confidence_count: summary.breakdown?.ai_sessions || 0,
              medium_confidence_count: summary.breakdown?.journal_entries || 0,
              low_confidence_count: 0
            },
            total_entries: summary.breakdown?.total || 0,
            date_range: {
              earliest: summary.metadata?.first_entry || null,
              latest: summary.metadata?.last_entry || null
            }
          };
          
          console.log("📊 Aggregates built:", aggregatesData);
          setAggregates(aggregatesData);
          
          setBreakdown({
            ai_sessions: summary.breakdown?.ai_sessions || 0,
            journal_entries: summary.breakdown?.journal_entries || 0
          });
          
          console.log("✅ Analytics loaded successfully:", {
            totalEntries: summary.breakdown?.total,
            weeklyDataPoints: weeklyTimeline.length,
            currentMood: summary.current?.mood,
            hasWeeklyHistory: (summary.weekly_history || []).length > 0,
            fullSummary: summary
          });
        } else {
          // No data yet
          setMetrics([]);
          setAggregates(null);
          setBreakdown({ ai_sessions: 0, journal_entries: 0 });
        }
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [currentUser?.uid, filter, limit]);

  // Get current period data based on selected time period
  const getCurrentPeriodData = () => {
    if (!windowData) return aggregates; // Fallback to all-time if no windows
    
    let periodWindow;
    switch (timePeriod) {
      case "7":
        periodWindow = windowData.last_7_days;
        break;
      case "30":
        periodWindow = windowData.last_30_days;
        break;
      case "90":
        periodWindow = windowData.last_90_days;
        break;
      case "all":
        return aggregates; // Return all-time aggregates
      default:
        periodWindow = windowData.last_30_days;
    }
    
    // Convert window format to aggregates format for compatibility
    if (periodWindow) {
      return {
        mood: {
          average: periodWindow.mood_avg,
          min: null,
          max: null,
          data_points: periodWindow.entries_count,
          reliable: true
        },
        stress: {
          average: periodWindow.stress_avg,
          min: null,
          max: null,
          data_points: periodWindow.entries_count,
          reliable: true
        },
        energy: {
          average: periodWindow.energy_avg,
          min: null,
          max: null,
          data_points: periodWindow.entries_count,
          reliable: true
        },
        anxiety: {
          average: periodWindow.anxiety_avg || null,
          data_points: periodWindow.entries_count,
          reliable: true
        },
        sleep: {
          average: periodWindow.sleep_avg || null,
          data_points: periodWindow.entries_count,
          reliable: true
        },
        confidence: aggregates?.confidence || { 
          average: 0.85, 
          high_confidence_count: 0, 
          medium_confidence_count: 0, 
          low_confidence_count: 0 
        },
        total_entries: periodWindow.entries_count,
        date_range: aggregates?.date_range || { earliest: null, latest: null }
      };
    }
    
    return aggregates;
  };

  const currentPeriodData = getCurrentPeriodData();
  
  // Calculate trend: compare current period with previous
  const calculateTrend = (metric: 'mood' | 'stress' | 'energy') => {
    if (!weeklyHistory || weeklyHistory.length < 2) return { direction: 'stable', percentage: 0 };
    
    const sortedHistory = [...weeklyHistory].sort((a, b) => 
      b.week.localeCompare(a.week)
    );
    
    const current = sortedHistory[0];
    const previous = sortedHistory[1];
    
    const metricKey = `${metric}_avg`;
    const currentValue = current?.[metricKey] || 0;
    const previousValue = previous?.[metricKey] || 0;
    
    if (previousValue === 0) return { direction: 'stable', percentage: 0 };
    
    const percentChange = ((currentValue - previousValue) / previousValue) * 100;
    
    return {
      direction: percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable',
      percentage: Math.abs(percentChange).toFixed(1)
    };
  };

  const moodTrend = calculateTrend('mood');
  const stressTrend = calculateTrend('stress');
  const energyTrend = calculateTrend('energy');

  // Prepare data for charts
  const timelineData = metrics
    .slice()
    .reverse()
    .map((m: any) => ({
      date: m.date || "N/A",
      mood: m.mood_percentage || m.mood || null,
      stress: m.stress_level || m.stress || null,
      energy: m.energy_level || m.energy || null,
      anxiety: m.anxiety_level || null,
      source: m.source || "aggregated",
      confidence: (m.confidence || 0.85) * 100,
    }));

  // Filter timeline data based on selected period
  const getFilteredTimelineData = () => {
    if (timePeriod === "all") return timelineData;
    
    const now = new Date();
    const daysBack = parseInt(timePeriod);
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
    
    return timelineData.filter((item: any) => {
      if (!item.date || item.date === "N/A" || item.date === "Current") return true;
      
      // Handle week format (YYYY-WXX)
      if (item.date.includes('-W')) {
        const [year, week] = item.date.split('-W');
        const weekDate = new Date(parseInt(year), 0, 1 + (parseInt(week) - 1) * 7);
        return weekDate >= cutoffDate;
      }
      
      // Handle ISO date format
      const itemDate = new Date(item.date);
      return itemDate >= cutoffDate;
    });
  };

  const filteredTimelineData = getFilteredTimelineData();

  const radarData = [
    {
      metric: "Mood",
      value: currentPeriodData?.mood?.average || 0,
      fullMark: 100,
    },
    {
      metric: "Energy",
      value: currentPeriodData?.energy?.average || 0,
      fullMark: 100,
    },
    {
      metric: "Stress",
      value: 100 - (currentPeriodData?.stress?.average || 0), // Inverted for better visual
      fullMark: 100,
    },
    {
      metric: "Anxiety",
      value: 100 - (currentPeriodData?.anxiety?.average || 0), // Inverted
      fullMark: 100,
    },
    {
      metric: "Sleep",
      value: currentPeriodData?.sleep?.average || 0,
      fullMark: 100,
    },
  ];

  const sourceData = [
    { name: "AI Sessions", value: breakdown.ai_sessions, color: COLORS.ai_session },
    { name: "Journal Entries", value: breakdown.journal_entries, color: COLORS.journal_entry },
  ];

  const confidenceData = [
    { name: "High (≥80%)", value: aggregates?.confidence.high_confidence_count || 0, color: "#10b981" },
    { name: "Medium (65-80%)", value: aggregates?.confidence.medium_confidence_count || 0, color: "#f59e0b" },
    { name: "Low (<65%)", value: aggregates?.confidence.low_confidence_count || 0, color: "#ef4444" },
  ];

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading analytics...</p>
        </div>
      </div>
    );
  }

  // Insufficient data message - ONLY if literally no data exists
  if (!aggregates || !aggregates.mood || aggregates.mood.data_points === 0) {
    return (
      <div className="space-y-6">
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lock className="h-16 w-16 text-gray-300 mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Analytics Data Yet</h3>
            <p className="text-gray-500 text-center max-w-md mb-4">
              Start using CureZ by having AI sessions or creating journal entries to unlock
              your personalized wellness analytics.
            </p>
            <p className="text-sm text-gray-400">
              Start your journey with your first entry!
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Wellness Analytics</h2>
          <p className="text-gray-500">
            Track your mental wellness journey over time
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Time Period Filter */}
          <div className="flex gap-2">
            <Button
              variant={timePeriod === "7" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimePeriod("7")}
            >
              7 Days
            </Button>
            <Button
              variant={timePeriod === "30" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimePeriod("30")}
            >
              30 Days
            </Button>
            <Button
              variant={timePeriod === "90" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimePeriod("90")}
            >
              90 Days
            </Button>
            <Button
              variant={timePeriod === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTimePeriod("all")}
            >
              All Time
            </Button>
          </div>
          
          {/* Source Filter */}
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "ai_session" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("ai_session")}
            >
              🎙️ Sessions
            </Button>
            <Button
              variant={filter === "journal_entry" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("journal_entry")}
            >
              📔 Journals
            </Button>
          </div>
        </div>
      </div>

      {/* Window Comparison Cards */}
      {windowData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <WindowComparisonCard
            period="Last 7 Days"
            data={windowData.last_7_days}
            isActive={timePeriod === "7"}
            onClick={() => setTimePeriod("7")}
          />
          <WindowComparisonCard
            period="Last 30 Days"
            data={windowData.last_30_days}
            isActive={timePeriod === "30"}
            onClick={() => setTimePeriod("30")}
          />
          <WindowComparisonCard
            period="Last 90 Days"
            data={windowData.last_90_days}
            isActive={timePeriod === "90"}
            onClick={() => setTimePeriod("90")}
          />
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Mood Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardDescription>Average Mood</CardDescription>
                <CardTitle className="text-3xl">
                  {Math.round(currentPeriodData?.mood?.average || 0)}
                  <span className="text-sm font-normal text-gray-500">/100</span>
                </CardTitle>
              </div>
              <Heart className="h-8 w-8 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {currentPeriodData?.mood?.data_points || 0} data points
              </span>
              {moodTrend.direction !== 'stable' && (
                <div className={`flex items-center gap-1 text-xs ${
                  moodTrend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {moodTrend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{moodTrend.percentage}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stress Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardDescription>Average Stress</CardDescription>
                <CardTitle className="text-3xl">
                  {Math.round(currentPeriodData?.stress?.average || 0)}
                  <span className="text-sm font-normal text-gray-500">/100</span>
                </CardTitle>
              </div>
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {currentPeriodData?.stress?.data_points || 0} data points
              </span>
              {stressTrend.direction !== 'stable' && (
                <div className={`flex items-center gap-1 text-xs ${
                  stressTrend.direction === 'down' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stressTrend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{stressTrend.percentage}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Energy Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardDescription>Average Energy</CardDescription>
                <CardTitle className="text-3xl">
                  {Math.round(currentPeriodData?.energy?.average || 0)}
                  <span className="text-sm font-normal text-gray-500">/100</span>
                </CardTitle>
              </div>
              <Zap className="h-8 w-8 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                {currentPeriodData?.energy?.data_points || 0} data points
              </span>
              {energyTrend.direction !== 'stable' && (
                <div className={`flex items-center gap-1 text-xs ${
                  energyTrend.direction === 'up' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {energyTrend.direction === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{energyTrend.percentage}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Entries Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div>
                <CardDescription>Total Entries</CardDescription>
                <CardTitle className="text-3xl">
                  {aggregates?.total_entries || 0}
                </CardTitle>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-gray-500">
              {breakdown.ai_sessions} sessions, {breakdown.journal_entries} journals
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Mood, Stress, Energy Timeline (Line Chart) */}
      <Card>
        <CardHeader>
          <CardTitle>Wellness Timeline</CardTitle>
          <CardDescription>
            Track your mood, stress, and energy levels over time ({timePeriod === "all" ? "All time" : `Last ${timePeriod} days`})
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={filteredTimelineData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="mood"
                stroke={COLORS.mood}
                strokeWidth={2}
                name="Mood"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="stress"
                stroke={COLORS.stress}
                strokeWidth={2}
                name="Stress"
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="energy"
                stroke={COLORS.energy}
                strokeWidth={2}
                name="Energy"
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wellness Radar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Wellness Profile</CardTitle>
            <CardDescription>Overall wellness across key metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="metric" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar
                  name="Your Wellness"
                  dataKey="value"
                  stroke="#8b5cf6"
                  fill="#8b5cf6"
                  fillOpacity={0.6}
                />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Data Source Breakdown (Pie Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Data Sources</CardTitle>
            <CardDescription>Distribution of AI sessions vs journal entries</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-sm text-gray-600">
              <p>🎙️ AI Sessions: {breakdown.ai_sessions} (High confidence: 90%)</p>
              <p>📔 Journal Entries: {breakdown.journal_entries} (Confidence: 65-85%)</p>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Data Confidence</CardTitle>
            <CardDescription>Reliability of extracted metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={confidenceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {confidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-xs text-gray-500">
              Average confidence: {((aggregates?.confidence?.average ?? 0) * 100).toFixed(0)}%
            </div>
          </CardContent>
        </Card>

        {/* Mood & Stress Combined (Area Chart) */}
        <Card>
          <CardHeader>
            <CardTitle>Mood vs Stress</CardTitle>
            <CardDescription>Relationship between mood and stress levels</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filteredTimelineData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="mood"
                  stackId="1"
                  stroke={COLORS.mood}
                  fill={COLORS.mood}
                  fillOpacity={0.6}
                  name="Mood"
                />
                <Area
                  type="monotone"
                  dataKey="stress"
                  stackId="2"
                  stroke={COLORS.stress}
                  fill={COLORS.stress}
                  fillOpacity={0.6}
                  name="Stress"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Metric Range Bars */}
      <Card>
        <CardHeader>
          <CardTitle>Metric Ranges</CardTitle>
          <CardDescription>Your min, average, and max values</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart
              data={[
                {
                  name: "Mood",
                  min: currentPeriodData?.mood?.min || 0,
                  avg: currentPeriodData?.mood?.average || 0,
                  max: currentPeriodData?.mood?.max || 0,
                },
                {
                  name: "Stress",
                  min: currentPeriodData?.stress?.min || 0,
                  avg: currentPeriodData?.stress?.average || 0,
                  max: currentPeriodData?.stress?.max || 0,
                },
                {
                  name: "Energy",
                  min: currentPeriodData?.energy?.min || 0,
                  avg: currentPeriodData?.energy?.average || 0,
                  max: currentPeriodData?.energy?.max || 0,
                },
              ]}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="min" fill="#cbd5e1" name="Min" />
              <Bar dataKey="avg" fill="#8b5cf6" name="Average" />
              <Bar dataKey="max" fill="#06b6d4" name="Max" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Date Range Info */}
      {aggregates?.date_range && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center text-sm text-gray-500">
              <div>
                <span className="font-medium">Data Range:</span> {" "}
                {new Date(aggregates.date_range.earliest!).toLocaleDateString()} - {" "}
                {new Date(aggregates.date_range.latest!).toLocaleDateString()}
              </div>
              <div>
                Showing {metrics.length} of {aggregates.total_entries} total entries
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
