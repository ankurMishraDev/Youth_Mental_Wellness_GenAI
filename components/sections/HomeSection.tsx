import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {   MessageCircle,
  Heart,
  Brain,
  Activity,
  MoonStar,
  Users,
  Dumbbell,
  Gauge,
  Target,
  Sparkles,
  BookOpen, } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
} from "recharts";
import { MoodData, ViewType } from "../../lib/types";
import { PositiveTipCard } from "../PositiveTipCard";

interface HomeSectionProps {
  setCurrentView: (view: ViewType) => void;
  isLoadingMood: boolean;
  moodData: MoodData | null;
  currentTip: string;
  positiveTip: string;
}

export const HomeSection: React.FC<HomeSectionProps> = ({
  setCurrentView,
  isLoadingMood,
  moodData,
  currentTip,
  positiveTip,
}) => {
   const formatHours = (hours: number | null | undefined) => {
    if (hours === null || hours === undefined || Number.isNaN(hours)) {
      return "Not available";
    }
    if (hours === 0) {
      return "0 hrs";
    }
    const rounded = Math.round(hours * 10) / 10;
    return `${rounded} hrs`;
  };

  const formatNumber = (value: number | null | undefined, suffix = "%") => {
    if (value === null || value === undefined || Number.isNaN(value)) {
      return "Not available";
    }
    // Ensure the value is within valid range (0-100 for percentages)
    const clampedValue = suffix === "%" ? Math.max(0, Math.min(100, value)) : value;
    return `${Math.round(clampedValue)}${suffix}`;
  };

  const formatText = (value: string | null | undefined) => {
    if (!value) {
      return "Not available";
    }
    return value;
  };
  return (
    <div className="space-y-6">
      <div className="flex justify-center items-center min-h-[120px] w-full">
        <div className="flex justify-center w-full">
          <PositiveTipCard tip={positiveTip} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card className="h-full bg-white/80 dark:bg-gray-950/70 border border-gray-200/60 dark:border-gray-800/50 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2 text-xl">
                <Brain className="h-6 w-6 text-orange-500" />
                <span>Mood Analytics</span>
              </CardTitle>
              <CardDescription className="text-base">
                Your emotional wellness insights from recent sessions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingMood ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading mood data...</p>
                </div>
              ) : moodData ? (
                <div className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-6">
                      {/* Mood Overview */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-500">
                            {moodData.mood}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Current Mood
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-500">
                            {formatNumber(moodData.mood_percentage, "%")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Mood Score
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {/* Energy Level Chart */}
                        <div className="flex flex-col items-center">
                          <div className="relative mb-2">
                            <ResponsiveContainer width={150} height={150}>
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Energy",
                                      value: Math.max(0, Math.min(100, moodData.energy_level || 0)),
                                      fill: "#f97316",
                                    },
                                    {
                                      name: "Remaining",
                                      value: 100 - Math.max(0, Math.min(100, moodData.energy_level || 0)),
                                      fill: "#e5e7eb",
                                    },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  startAngle={180}
                                  endAngle={0}
                                  innerRadius={45}
                                  outerRadius={70}
                                  paddingAngle={0}
                                  dataKey="value"
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-orange-500">
                                  {formatNumber(moodData.energy_level, "%")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Energy
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-orange-500">
                              {moodData.mood_stability}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Stability
                            </div>
                          </div>
                        </div>

                        {/* Stress Level Chart */}
                        <div className="flex flex-col items-center">
                          <div className="relative mb-2">
                            <ResponsiveContainer width={150} height={150}>
                              <PieChart>
                                <Pie
                                  data={[
                                    {
                                      name: "Stress",
                                      value: Math.max(0, Math.min(100, moodData.stress_level || 0)),
                                      fill: "#f97316",
                                    },
                                    {
                                      name: "Remaining",
                                      value: 100 - Math.max(0, Math.min(100, moodData.stress_level || 0)),
                                      fill: "#e5e7eb",
                                    },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  startAngle={180}
                                  endAngle={0}
                                  innerRadius={45}
                                  outerRadius={70}
                                  paddingAngle={0}
                                  dataKey="value"
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-orange-500">
                                  {formatNumber(moodData.stress_level, "%")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Stress
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-orange-500">
                              {moodData.mood_calmness}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Calmness
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {/* Cognitive & Emotional Metrics */}
                      <div className="grid grid-cols-2 gap-4">
                        {/* Cognitive Score Chart */}
                        <div className="flex flex-col items-center">
                          <div className="relative mb-2">
                            <ResponsiveContainer width={150} height={150}>
                              <PieChart>
                                <Pie
                                  data={[
                                  {
                                    name: "Cognitive",
                                    value: Math.max(0, Math.min(100, moodData?.cognitive_score || 0)),
                                    fill: "#f97316",
                                  },
                                  {
                                    name: "Remaining",
                                    value: 100 - Math.max(0, Math.min(100, moodData?.cognitive_score || 0)),
                                    fill: "#e5e7eb",
                                  },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  startAngle={180}
                                  endAngle={0}
                                  innerRadius={45}
                                  outerRadius={70}
                                  paddingAngle={0}
                                  dataKey="value"
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-orange-500">
                                  {formatNumber(moodData.cognitive_score, "%")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Cognitive
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-orange-500">
                              {moodData.focus_level}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Focus
                            </div>
                          </div>
                        </div>

                        {/* Emotional Score Chart */}
                        <div className="flex flex-col items-center">
                          <div className="relative mb-2">
                            <ResponsiveContainer width={150} height={150}>
                              <PieChart>
                                <Pie
                                  data={[
                                  {
                                    name: "Emotional",
                                    value: Math.max(0, Math.min(100, moodData?.emotional_score || 0)),
                                    fill: "#f97316",
                                  },
                                  {
                                    name: "Remaining",
                                    value: 100 - Math.max(0, Math.min(100, moodData?.emotional_score || 0)),
                                    fill: "#e5e7eb",
                                  },
                                  ]}
                                  cx="50%"
                                  cy="50%"
                                  startAngle={180}
                                  endAngle={0}
                                  innerRadius={45}
                                  outerRadius={70}
                                  paddingAngle={0}
                                  dataKey="value"
                                />
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-orange-500">
                                  {formatNumber(moodData.emotional_score, "%")}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  Emotional
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center">
                            <div className="text-sm font-medium text-orange-500">
                              {moodData.mood_calmness}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Calmness
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Complete a session to see your mood analytics
                  </p>
                  <Button
                    onClick={() => setCurrentView("session")}
                    className="mt-4"
                    size="sm"
                  >
                    Start Session
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="flex flex-col gap-6">
          <Card className="bg-white/80 dark:bg-gray-950/70 border border-gray-200/60 dark:border-gray-800/50 shadow-sm">
            <CardHeader>
              <CardTitle>Quick Tip</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                "{currentTip}"
              </p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-950/30 dark:to-rose-950/30 border-orange-200 dark:border-orange-800">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span>My Journal</span>
              </CardTitle>
              <CardDescription>
                Express your thoughts and track your emotional journey
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => window.location.href = '/journal'}
                className="w-full bg-orange-500 text-white hover:bg-orange-600"
              >
                <BookOpen className="h-4 w-4 mr-2" />
                Open Journal
              </Button>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-pink-500 border-orange-600">
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2 text-xl text-white">
                <Heart className="h-7 w-7 text-white" />
                <span>How are you feeling today?</span>
              </CardTitle>
              <CardDescription className="text-base text-white/80">
                Start a conversation with Curie, your AI guide, anytime you need
                support.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button
                onClick={() => setCurrentView("session")}
                className="w-full h-16 text-xl font-semibold bg-white text-orange-600 hover:bg-orange-50"
              >
                <MessageCircle className="h-6 w-6 mr-3" />
                Start AI Session
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
