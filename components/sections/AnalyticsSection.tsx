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
import { MobileHeader } from "../MobileHeader";
import { useIsMobile } from "@/hooks/use-mobile";
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
      className={`cursor-pointer transition-all hover:scale-[1.02] ${
        isActive 
          ? 'ring-2 ring-purple-500 shadow-xl bg-gradient-to-br from-purple-50 to-white' 
          : 'hover:shadow-lg bg-white'
      }`}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold flex items-center justify-between text-gray-800">
          <span>{period}</span>
          <div className={`p-2 rounded-lg ${isActive ? 'bg-purple-100' : 'bg-gray-50'}`}>
            <Calendar className={`h-4 w-4 ${isActive ? 'text-purple-600' : 'text-gray-400'}`} />
          </div>
        </CardTitle>
        <CardDescription className="text-xs font-medium text-gray-500">
          {data.entries_count} entries tracked
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-2 rounded-lg bg-green-50/50">
          <span className="text-xs font-semibold text-gray-700">Mood</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-green-600">{data.mood_avg || 0}</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-red-50/50">
          <span className="text-xs font-semibold text-gray-700">Stress</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-red-600">{data.stress_avg || 0}</span>
          </div>
        </div>
        <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50/50">
          <span className="text-xs font-semibold text-gray-700">Energy</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg text-orange-600">{data.energy_avg || 0}</span>
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
  const isMobile = useIsMobile();
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [aggregates, setAggregates] = useState<Aggregates | null>(null);
  const [breakdown, setBreakdown] = useState({ ai_sessions: 0, journal_entries: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "ai_session" | "journal_entry">("all");
  
  // Time period filter for data display
  const [timePeriod, setTimePeriod] = useState<7 | 30 | 90 | 365>(7);

  // DEBUG: Log when component mounts and when currentUser changes
  useEffect(() => {
    console.log("🔍 AnalyticsSection mounted/updated");
    console.log("👤 currentUser:", currentUser);
    console.log("🆔 currentUser.uid:", currentUser?.uid);
  }, [currentUser]);

  const fetchMetrics = async () => {
    console.log("🚀 [RAW METRICS] fetchMetrics CALLED");
    console.log("👤 currentUser:", currentUser);
    console.log("🆔 UID:", currentUser?.uid);
    
    if (!currentUser?.uid) {
      console.log("❌ NO UID - Aborting fetch");
      return;
    }

    console.log("✅ UID exists, fetching raw metrics...");
    setIsLoading(true);
    
    try {
      const url = `/api/raw-metrics/${currentUser.uid}?limit=100`;
      console.log("📡 Fetching from:", url);
      
      // Fetch raw metrics directly (TEMPORARY SOLUTION)
      const response = await fetch(url);
      console.log("📥 Response received:", response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log("📦 Raw metrics response:", data);
        
        if (data.metrics && data.metrics.length > 0) {
          console.log("✅ Found", data.metrics.length, "raw metrics");
          
          // Store raw metrics
          setMetrics(data.metrics);
          
          // Store aggregates calculated by backend
          if (data.aggregates) {
            setAggregates({
              ...data.aggregates,
              confidence: {
                average: 0.85,
                high_confidence_count: data.aggregates.breakdown?.ai_sessions || 0,
                medium_confidence_count: data.aggregates.breakdown?.journal_entries || 0,
                low_confidence_count: 0
              },
              date_range: {
                earliest: data.metrics[data.metrics.length - 1]?.timestamp || null,
                latest: data.metrics[0]?.timestamp || null
              }
            });
          }
          
          // Store breakdown
          if (data.aggregates?.breakdown) {
            setBreakdown(data.aggregates.breakdown);
          }
          
          console.log("✅ Raw metrics loaded successfully:", {
            totalMetrics: data.metrics.length,
            breakdown: data.aggregates?.breakdown,
            aggregates: data.aggregates
          });
        } else {
          // No data yet
          console.log("ℹ️ No metrics found");
          setMetrics([]);
          setAggregates(null);
          setBreakdown({ ai_sessions: 0, journal_entries: 0 });
        }
      }
    } catch (error) {
      console.error("❌ Error fetching raw metrics:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [currentUser?.uid, filter]);

  // Use aggregates as current period data (simplified - no windows)
  const currentPeriodData = aggregates;
  
  // Calculate trend: compare recent vs older data from raw metrics
  const calculateTrend = (metric: 'mood' | 'stress' | 'energy') => {
    if (metrics.length < 10) return { direction: 'stable', percentage: 0 };
    
    // Split metrics into two halves for comparison
    const halfPoint = Math.floor(metrics.length / 2);
    const recentMetrics = metrics.slice(0, halfPoint);
    const olderMetrics = metrics.slice(halfPoint);
    
    const metricKey = metric === 'mood' ? 'mood_percentage' : 
                     metric === 'stress' ? 'stress_level' : 'energy_level';
    
    // Calculate averages
    const recentValues = recentMetrics
      .map(m => m[metricKey])
      .filter(v => v !== null) as number[];
    const olderValues = olderMetrics
      .map(m => m[metricKey])
      .filter(v => v !== null) as number[];
    
    if (recentValues.length === 0 || olderValues.length === 0) {
      return { direction: 'stable', percentage: 0 };
    }
    
    const recentAvg = recentValues.reduce((a, b) => a + b, 0) / recentValues.length;
    const olderAvg = olderValues.reduce((a, b) => a + b, 0) / olderValues.length;
    
    if (olderAvg === 0) return { direction: 'stable', percentage: 0 };
    
    const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    return {
      direction: percentChange > 5 ? 'up' : percentChange < -5 ? 'down' : 'stable',
      percentage: Math.abs(percentChange).toFixed(1)
    };
  };

  const moodTrend = calculateTrend('mood');
  const stressTrend = calculateTrend('stress');
  const energyTrend = calculateTrend('energy');

  // Prepare data for charts - DAILY AGGREGATION
  const timelineData = (() => {
    // Group metrics by date (YYYY-MM-DD)
    const grouped: { [key: string]: MetricData[] } = {};
    
    metrics.forEach((m) => {
      if (!m.timestamp) return;
      const date = new Date(m.timestamp);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(m);
    });
    
    // Calculate daily averages
    return Object.entries(grouped)
      .map(([dateKey, dayMetrics]) => {
        // Helper to calculate average, filtering out nulls
        const avg = (values: (number | null)[]) => {
          const valid = values.filter((v): v is number => v !== null);
          return valid.length > 0 
            ? valid.reduce((a, b) => a + b, 0) / valid.length 
            : null;
        };
        
        const date = new Date(dateKey);
        
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rawTimestamp: date.getTime(),
          mood: avg(dayMetrics.map(m => m.mood_percentage)),
          stress: avg(dayMetrics.map(m => m.stress_level)),
          energy: avg(dayMetrics.map(m => m.energy_level)),
          anxiety: avg(dayMetrics.map(m => m.anxiety_level)),
          sleep: avg(dayMetrics.map(m => m.sleep_quality)),
          confidence: avg(dayMetrics.map(m => m.confidence * 100)),
          count: dayMetrics.length, // Number of entries that day
          sources: {
            ai_sessions: dayMetrics.filter(m => m.source === 'ai_session').length,
            journals: dayMetrics.filter(m => m.source === 'journal_entry').length,
          }
        };
      })
      .sort((a, b) => a.rawTimestamp - b.rawTimestamp); // Sort by date ascending
  })();

  // Filter timeline data based on selected period (in days) - SLIDING WINDOW
  const getFilteredTimelineData = () => {
    // Calculate the sliding window: timePeriod days ago from TODAY
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - (timePeriod - 1)); // Adjust to include today
    startDate.setHours(0, 0, 0, 0);
    
    // Fill all days in the window (including days with no data)
    const filledData = [];
    
    for (let i = 0; i < timePeriod; i++) {
      const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      const dateKey = currentDate.toISOString().split('T')[0];
      
      // Check if we have data for this day
      const existingData = timelineData.find((item: any) => {
        const itemDate = new Date(item.rawTimestamp);
        return itemDate.toISOString().split('T')[0] === dateKey;
      });
      
      if (existingData) {
        filledData.push(existingData);
      } else {
        // Add placeholder for missing day
        filledData.push({
          date: currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rawTimestamp: currentDate.getTime(),
          mood: null,
          stress: null,
          energy: null,
          anxiety: null,
          sleep: null,
          confidence: null,
          count: 0,
          sources: { ai_sessions: 0, journals: 0 }
        });
      }
    }
    
    return filledData;
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
      {/* Header with Filters - Refined */}
      {isMobile ? (
        <MobileHeader
          page="analytics"
          timePeriod={timePeriod}
          setTimePeriod={setTimePeriod}
          filter={filter}
          setFilter={setFilter}
        />
      ) : (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
              Wellness Analytics
            </h2>
            <p className="text-orange-800/80 dark:text-orange-200/80 mt-1">
              Track your mental wellness journey over time
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Time Period Filter */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <Button
                variant={timePeriod === 7 ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimePeriod(7)}
                className={timePeriod === 7 ? "shadow-md" : ""}
              >
                7 Days
              </Button>
              <Button
                variant={timePeriod === 30 ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimePeriod(30)}
                className={timePeriod === 30 ? "shadow-md" : ""}
              >
                30 Days
              </Button>
              <Button
                variant={timePeriod === 90 ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimePeriod(90)}
                className={timePeriod === 90 ? "shadow-md" : ""}
              >
                90 Days
              </Button>
              <Button
                variant={timePeriod === 365 ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimePeriod(365)}
                className={timePeriod === 365 ? "shadow-md" : ""}
              >
                All Time
              </Button>
            </div>

            {/* Source Filter */}
            <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
              <Button
                variant={filter === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter("all")}
                className={filter === "all" ? "shadow-md" : ""}
              >
                All
              </Button>
              <Button
                variant={filter === "ai_session" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter("ai_session")}
                className={filter === "ai_session" ? "shadow-md" : ""}
              >
                🎙️ Sessions
              </Button>
              <Button
                variant={filter === "journal_entry" ? "default" : "ghost"}
                size="sm"
                onClick={() => setFilter("journal_entry")}
                className={filter === "journal_entry" ? "shadow-md" : ""}
              >
                📔 Journals
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards - Refined Design */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Mood Card */}
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardDescription className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Average Mood
                </CardDescription>
                <CardTitle className="text-4xl font-bold mt-2 bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  {Math.round(currentPeriodData?.mood?.average || 0)}
                </CardTitle>
              </div>
              <div className="bg-green-50 p-3 rounded-xl">
                <Heart className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 font-medium">
                {currentPeriodData?.mood?.data_points || 0} entries tracked
              </span>
              {moodTrend.direction !== 'stable' && (
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  moodTrend.direction === 'up' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {moodTrend.direction === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span>{moodTrend.percentage}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stress Card */}
        <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardDescription className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Average Stress
                </CardDescription>
                <CardTitle className="text-4xl font-bold mt-2 bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">
                  {Math.round(currentPeriodData?.stress?.average || 0)}
                </CardTitle>
              </div>
              <div className="bg-red-50 p-3 rounded-xl">
                <AlertCircle className="h-7 w-7 text-red-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 font-medium">
                {currentPeriodData?.stress?.data_points || 0} entries tracked
              </span>
              {stressTrend.direction !== 'stable' && (
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  stressTrend.direction === 'down' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {stressTrend.direction === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span>{stressTrend.percentage}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Energy Card */}
        <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardDescription className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Average Energy
                </CardDescription>
                <CardTitle className="text-4xl font-bold mt-2 bg-gradient-to-r from-orange-600 to-amber-500 bg-clip-text text-transparent">
                  {Math.round(currentPeriodData?.energy?.average || 0)}
                </CardTitle>
              </div>
              <div className="bg-orange-50 p-3 rounded-xl">
                <Zap className="h-7 w-7 text-orange-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600 font-medium">
                {currentPeriodData?.energy?.data_points || 0} entries tracked
              </span>
              {energyTrend.direction !== 'stable' && (
                <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  energyTrend.direction === 'up' 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {energyTrend.direction === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  <span>{energyTrend.percentage}%</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Entries Card */}
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardDescription className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Total Entries
                </CardDescription>
                <CardTitle className="text-4xl font-bold mt-2 bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  {aggregates?.total_entries || 0}
                </CardTitle>
              </div>
              <div className="bg-blue-50 p-3 rounded-xl">
                <Activity className="h-7 w-7 text-blue-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex gap-3">
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-cyan-500"></div>
                <span className="text-gray-600 font-medium">{breakdown.ai_sessions} sessions</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full bg-pink-500"></div>
                <span className="text-gray-600 font-medium">{breakdown.journal_entries} journals</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mood, Stress, Energy Timeline (Line Chart) - Refined */}
        <Card className="lg:col-span-2 border-t-4 border-t-purple-500 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">Wellness Timeline</CardTitle>
                <CardDescription className="text-sm mt-1">
                  Track your mood, stress, and energy levels over time ({timePeriod === 365 ? "All time" : `Last ${timePeriod} days`})
                </CardDescription>
              </div>
              <div className="bg-purple-50 p-3 rounded-xl">
                <Activity className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={filteredTimelineData}>
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
                  stroke={COLORS.mood}
                  strokeWidth={3}
                  name="Mood"
                  dot={{ r: 5, fill: COLORS.mood }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="stress"
                  stroke={COLORS.stress}
                  strokeWidth={3}
                  name="Stress"
                  dot={{ r: 5, fill: COLORS.stress }}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="energy"
                  stroke={COLORS.energy}
                  strokeWidth={3}
                  name="Energy"
                  dot={{ r: 5, fill: COLORS.energy }}
                  activeDot={{ r: 7 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <div className="lg:col-span-1 space-y-6">
          {/* Wellness Radar Chart - Refined */}
          <Card className="border-t-4 border-t-blue-500 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-800">Wellness Profile</CardTitle>
                  <CardDescription className="text-sm mt-1">Overall wellness across key metrics</CardDescription>
                </div>
                <div className="bg-blue-50 p-3 rounded-xl">
                  <Brain className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={250}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#6b7280' }} />
                  <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#9ca3af' }} />
                  <Radar
                    name="Your Wellness"
                    dataKey="value"
                    stroke="#8b5cf6"
                    fill="#8b5cf6"
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Source Breakdown (Pie Chart) - Refined */}
        <Card className="border-t-4 border-t-cyan-500 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">Data Sources</CardTitle>
                <CardDescription className="text-sm mt-1">Distribution of AI sessions vs journal entries</CardDescription>
              </div>
              <div className="bg-cyan-50 p-3 rounded-xl">
                <Users className="h-6 w-6 text-cyan-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
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
                  strokeWidth={2}
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 p-2 bg-cyan-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                <p className="text-sm font-medium text-gray-700">🎙️ AI Sessions: {breakdown.ai_sessions} <span className="text-xs text-gray-500">(High confidence: 90%)</span></p>
              </div>
              <div className="flex items-center gap-2 p-2 bg-pink-50 rounded-lg">
                <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                <p className="text-sm font-medium text-gray-700">📔 Journal Entries: {breakdown.journal_entries} <span className="text-xs text-gray-500">(Confidence: 65-85%)</span></p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Confidence Distribution - Refined */}
        <Card className="border-t-4 border-t-emerald-500 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">Data Confidence</CardTitle>
                <CardDescription className="text-sm mt-1">Reliability of extracted metrics</CardDescription>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl">
                <TrendingUp className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
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
                  strokeWidth={2}
                >
                  {confidenceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'white', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-green-50 rounded-full">
                <span className="text-xs font-semibold text-gray-600">Average confidence:</span>
                <span className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                  {((aggregates?.confidence?.average ?? 0) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mood & Stress Combined (Area Chart) - Refined */}
        <Card className="border-t-4 border-t-rose-500 shadow-lg hover:shadow-xl transition-shadow">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-gray-800">Mood vs Stress</CardTitle>
                <CardDescription className="text-sm mt-1">Relationship between mood and stress levels</CardDescription>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl">
                <Heart className="h-6 w-6 text-rose-600" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={filteredTimelineData}>
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
                <Area
                  type="monotone"
                  dataKey="mood"
                  stackId="1"
                  stroke={COLORS.mood}
                  fill={COLORS.mood}
                  fillOpacity={0.6}
                  name="Mood"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="stress"
                  stackId="2"
                  stroke={COLORS.stress}
                  fill={COLORS.stress}
                  fillOpacity={0.6}
                  name="Stress"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Metric Range Bars - Refined */}
      <Card className="border-t-4 border-t-indigo-500 shadow-lg hover:shadow-xl transition-shadow">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl font-bold text-gray-800">Metric Ranges</CardTitle>
              <CardDescription className="text-sm mt-1">Your min, average, and max values</CardDescription>
            </div>
            <div className="bg-indigo-50 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 12, fontWeight: 600 }}
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
              <Bar dataKey="min" fill="#cbd5e1" name="Min" radius={[4, 4, 0, 0]} />
              <Bar dataKey="avg" fill="#8b5cf6" name="Average" radius={[4, 4, 0, 0]} />
              <Bar dataKey="max" fill="#06b6d4" name="Max" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Date Range Info - Refined */}
      {aggregates?.date_range && (
        <Card className="bg-gradient-to-r from-gray-50 to-slate-50 border-l-4 border-l-gray-400 shadow-md">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Data Range</span>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">
                    {new Date(aggregates.date_range.earliest!).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })} - {" "}
                    {new Date(aggregates.date_range.latest!).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 p-2 rounded-lg">
                  <Activity className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Showing</span>
                  <p className="text-sm font-medium text-gray-700 mt-0.5">
                    {metrics.length} of {aggregates.total_entries} total entries
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
