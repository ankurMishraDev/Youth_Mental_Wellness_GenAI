import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MobileHeader } from "../MobileHeader";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  MessageCircle, 
  Calendar, 
  CheckCircle2,
  Sparkles,
  TrendingUp,
  BarChart3,
  Clock,
  ArrowLeft,
  Mic,
  MicOff,
  Send,
  Keyboard,
  Activity,
  User,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useMessages } from '@/hooks/useMessages';
import { useSession } from '@/hooks/useSession';
import { useAuth } from '@/hooks/useAuth';
import { formatTime } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface SessionsSectionProps {
  onStartSession: () => void;
  isLoadingSession: boolean;
  sessionSummary: any;
}

export const SessionsSection: React.FC<SessionsSectionProps> = ({
  onStartSession,
  isLoadingSession,
  sessionSummary,
}) => {
  const isMobile = useIsMobile();
  const auth = useAuth();
  const [isFlipped, setIsFlipped] = useState(false);
  const [textMessage, setTextMessage] = useState("");
  const [currentInputMode, setCurrentInputMode] = useState<"audio" | "text">("audio");
  
  // Local timer state (independent of WebSocket)
  const [localTimerSeconds, setLocalTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // NEW: Dynamic session stats
  const [sessionStats, setSessionStats] = useState({
    totalSessions: 0,
    thisWeek: 0,
    avgDuration: "0m",
    streak: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  
  const { messages, setMessages, messagesEndRef } = useMessages();
  const session = useSession(auth.currentUser, setMessages);

  // NEW: Fetch session analytics from backend
  useEffect(() => {
    const fetchSessionAnalytics = async () => {
      if (!auth.currentUser?.uid) {
        setLoadingStats(false);
        return;
      }
      
      try {
        const response = await fetch(`/api/session-analytics/${auth.currentUser.uid}`);
        const data = await response.json();
        
        if (data.exists && data.data) {
          setSessionStats({
            totalSessions: data.data.total_sessions || 0,
            thisWeek: data.data.sessions_this_week || 0,
            avgDuration: `${data.data.avg_duration_minutes || 0}m`,
            streak: data.data.current_streak || 0,
          });
        }
      } catch (error) {
        console.error("Error fetching session analytics:", error);
      } finally {
        setLoadingStats(false);
      }
    };
    
    fetchSessionAnalytics();
  }, [auth.currentUser?.uid]);

  // Local timer effect - runs independently
  useEffect(() => {
    if (isTimerRunning) {
      console.log("🎬 Local timer STARTED");
      timerIntervalRef.current = setInterval(() => {
        setLocalTimerSeconds(prev => {
          const newVal = prev + 1;
          if (newVal % 10 === 0) console.log(`⏱️ Local timer: ${newVal}s`);
          return newVal;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        console.log("⏹️ Local timer STOPPED");
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerRunning]);

  const handleStartSession = () => {
    setIsFlipped(true);
    setLocalTimerSeconds(0); // Reset timer
    // DON'T start timer here - wait for user interaction
    console.log("📱 Session card flipped - waiting for user to interact");
    if (auth.currentUser && !session.audioClientRef.current) {
      session.initializeAudioClient();
    }
  };

  const handleEndSession = () => {
    setIsTimerRunning(false); // Stop local timer
    console.log(`⏹️ Session ended - Duration: ${localTimerSeconds} seconds`);
    session.endSession();
    setIsFlipped(false);
    setMessages([]);
    setTextMessage("");
  };

  const handleSendText = () => {
    if (textMessage.trim()) {
      // Start timer on first text message
      if (!isTimerRunning) {
        setIsTimerRunning(true);
        console.log("▶️ Timer started - User sent first text message");
      }
      session.sendTextMessage(textMessage.trim());
      setTextMessage("");
    }
  };

  const toggleInputMode = () => {
    const newMode = currentInputMode === "audio" ? "text" : "audio";
    setCurrentInputMode(newMode);
    session.setInputMode(newMode);
  };

  // Handle recording start - user starts speaking
  const handleStartRecording = async () => {
    // Start timer on first mic click
    if (!isTimerRunning) {
      setIsTimerRunning(true);
      console.log("▶️ Timer started - User clicked mic button");
    }
    await session.startRecording();
  };

  // Handle recording stop - user stops speaking
  const handleStopRecording = () => {
    session.stopRecording();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[calc(100vh-8rem)]">
      {isMobile && <MobileHeader page="sessions" />}
      {/* Left Column - Stats (top) and Session Info Card (bottom) */}
      <div className="lg:col-span-4 flex flex-col gap-4">
        {/* Stats Cards - All Percentage Style */}
        <div className="grid grid-cols-2 gap-3">
          {/* Card 1 - Session Completion */}
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 backdrop-blur-sm border border-orange-200/60 dark:border-orange-700/40 shadow-md hover:shadow-lg transition-all py-2 relative overflow-hidden">
            <CardContent className="pt-3 pb-2 relative z-10">
              <div className="flex flex-col">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-xs font-medium text-muted-foreground">Session Completion</h3>
                  <div className="p-1 bg-orange-100/60 dark:bg-orange-900/40 backdrop-blur-sm rounded-lg">
                    <TrendingUp className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-0.5 leading-none">
                  {Math.round((sessionStats.thisWeek / sessionStats.totalSessions) * 100) || 0}%
                </p>
                <p className="text-[10px] text-muted-foreground">Avg. Completed</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 2 - This Week */}
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 backdrop-blur-sm border border-orange-200/60 dark:border-orange-700/40 shadow-md hover:shadow-lg transition-all py-2 relative overflow-hidden">
            <CardContent className="pt-3 pb-2 relative z-10">
              <div className="flex flex-col">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-xs font-medium text-muted-foreground">This Week</h3>
                  <div className="p-1 bg-orange-100/60 dark:bg-orange-900/40 backdrop-blur-sm rounded-lg">
                    <Calendar className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-0.5 leading-none">
                  {sessionStats.thisWeek}
                </p>
                <p className="text-[10px] text-muted-foreground">Sessions</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 3 - Avg Duration */}
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 backdrop-blur-sm border border-orange-200/60 dark:border-orange-700/40 shadow-md hover:shadow-lg transition-all py-2 relative overflow-hidden">
            <CardContent className="pt-3 pb-2 relative z-10">
              <div className="flex flex-col">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-xs font-medium text-muted-foreground">Avg Duration</h3>
                  <div className="p-1 bg-orange-100/60 dark:bg-orange-900/40 backdrop-blur-sm rounded-lg">
                    <Clock className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-0.5 leading-none">
                  {sessionStats.avgDuration}
                </p>
                <p className="text-[10px] text-muted-foreground">Minutes</p>
              </div>
            </CardContent>
          </Card>

          {/* Card 4 - Active Streak */}
          <Card className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 backdrop-blur-sm border border-orange-200/60 dark:border-orange-700/40 shadow-md hover:shadow-lg transition-all py-2 relative overflow-hidden">
            <CardContent className="pt-3 pb-2 relative z-10">
              <div className="flex flex-col">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="text-xs font-medium text-muted-foreground">Active Streak</h3>
                  <div className="p-1 bg-orange-100/60 dark:bg-orange-900/40 backdrop-blur-sm rounded-lg">
                    <BarChart3 className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <p className="text-4xl font-bold text-orange-600 dark:text-orange-400 mb-0.5 leading-none">
                  {sessionStats.streak}%
                </p>
                <p className="text-[10px] text-muted-foreground">Daily Engagement</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session Info Card - Flip Container */}
        <div className="flex-1 relative" style={{ perspective: '1000px' }}>
          <div
            className="relative w-full h-full transition-all duration-700"
            style={{
              transformStyle: 'preserve-3d',
              transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front - Last Session Summary */}
            <div
              className="absolute inset-0"
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
              }}
            >
              <Card className="w-full h-full bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20 backdrop-blur-sm border border-orange-200/60 dark:border-orange-700/40 shadow-md hover:shadow-lg transition-all py-3 flex flex-col relative overflow-hidden">
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/10 to-transparent rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-rose-400/10 to-transparent rounded-full blur-2xl"></div>
                
            <CardHeader className="pb-2 px-3 py-1.5 flex-shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100/80 dark:bg-orange-900/50 backdrop-blur-sm rounded-lg shadow-sm">
                  <MessageCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent leading-tight">Last Session Summary</CardTitle>
                  <CardDescription className="text-sm lg:text-base mt-0.5">Review your recent insights</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 py-1.5 flex-1 flex flex-col overflow-hidden relative z-10">
              {isLoadingSession ? (
                <div className="flex items-center justify-center flex-1">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <p className="ml-2 text-sm lg:text-base text-muted-foreground">Loading...</p>
                </div>
              ) : sessionSummary ? (
                <div className="space-y-2 lg:space-y-3 flex-1 flex flex-col">
                  <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-3 lg:p-4 border border-blue-100 dark:border-blue-900 flex-1 overflow-y-auto backdrop-blur-sm">
                    <p className="text-sm lg:text-base xl:text-lg text-foreground leading-relaxed">
                      {sessionSummary.description || 
                      sessionSummary.summary_text || 
                      sessionSummary.summary ||
                      "Your last session provided valuable insights into your mental wellness journey."}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 lg:gap-2 flex-shrink-0">
                    <div className="bg-purple-50/60 dark:bg-purple-950/40 backdrop-blur-sm rounded-lg p-2 lg:p-3 border border-purple-100/40 dark:border-purple-900/40 text-center">
                      <p className="text-lg lg:text-2xl xl:text-3xl font-bold text-purple-600 dark:text-purple-400 leading-none">
                        {sessionSummary.duration || "12m"}
                      </p>
                      <p className="text-[10px] lg:text-xs xl:text-sm text-muted-foreground mt-0.5 lg:mt-1">Duration</p>
                    </div>
                    <div className="bg-blue-50/60 dark:bg-blue-950/40 backdrop-blur-sm rounded-lg p-2 lg:p-3 border border-blue-100/40 dark:border-blue-900/40 text-center">
                      <p className="text-lg lg:text-2xl xl:text-3xl font-bold text-blue-600 dark:text-blue-400 leading-none">
                        {sessionSummary.mood || "Calm"}
                      </p>
                      <p className="text-[10px] lg:text-xs xl:text-sm text-muted-foreground mt-0.5 lg:mt-1">Mood</p>
                    </div>
                    <div className="bg-green-50/60 dark:bg-green-950/40 backdrop-blur-sm rounded-lg p-2 lg:p-3 border border-green-100/40 dark:border-green-900/40 text-center">
                      <p className="text-lg lg:text-2xl xl:text-3xl font-bold text-green-600 dark:text-green-400 leading-none">
                        {sessionSummary.insights || "5"}
                      </p>
                      <p className="text-[10px] lg:text-xs xl:text-sm text-muted-foreground mt-0.5 lg:mt-1">Insights</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center flex-1">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-gray-100/60 dark:bg-gray-800/40 backdrop-blur-sm rounded-full mb-2 lg:mb-3">
                      <MessageCircle className="h-6 w-6 lg:h-8 lg:w-8 text-gray-400" />
                    </div>
                    <p className="text-xs lg:text-sm xl:text-base text-muted-foreground">
                      Complete your first session
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
            </div>

            {/* Back - Session in Progress */}
            <div
              className="absolute inset-0"
              style={{ 
                backfaceVisibility: 'hidden',
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              <Card className="w-full h-full bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20 backdrop-blur-sm border border-orange-200/60 dark:border-orange-700/40 shadow-md transition-all py-3 flex flex-col relative overflow-hidden">
                {/* Decorative gradient overlay */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/10 to-transparent rounded-full blur-2xl"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-rose-400/10 to-transparent rounded-full blur-2xl"></div>
                
            <CardHeader className="pb-2 px-3 py-1.5 flex-shrink-0 relative z-10">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-orange-100/80 dark:bg-orange-900/50 backdrop-blur-sm rounded-lg shadow-sm">
                  <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-xl lg:text-2xl font-bold bg-gradient-to-r from-orange-600 to-rose-600 bg-clip-text text-transparent leading-tight">Session in Progress</CardTitle>
                  <CardDescription className="text-sm lg:text-base mt-0.5">Real-time metrics</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 py-1.5 flex-1 flex flex-col relative z-10">
              <div className="space-y-2 lg:space-y-3 flex-1">
                <div className="bg-gradient-to-br from-green-50 to-teal-50 dark:from-green-950/30 dark:to-teal-950/30 rounded-lg p-2.5 lg:p-4 border border-green-100 dark:border-green-900 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-1.5 lg:mb-2">
                    <span className="text-xs lg:text-sm xl:text-base font-semibold text-foreground">Duration</span>
                    <span className="text-xl lg:text-2xl xl:text-3xl font-bold text-green-600 dark:text-green-400 leading-none">
                      {formatTime(localTimerSeconds)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-full h-2 lg:h-2.5">
                    <div 
                      className="bg-gradient-to-r from-green-500 to-teal-500 h-2 lg:h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${Math.min((localTimerSeconds / 900) * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] lg:text-xs xl:text-sm text-muted-foreground mt-1">Recommended: 10-15 minutes</p>
                </div>

                <div className="grid grid-cols-2 gap-2 lg:gap-3">
                  <div className="bg-purple-50/60 dark:bg-purple-950/40 backdrop-blur-sm rounded-lg p-2 lg:p-3 border border-purple-100/40 dark:border-purple-900/40">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MessageCircle className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600 dark:text-purple-400" />
                      <span className="text-[10px] lg:text-xs font-medium text-muted-foreground">Messages</span>
                    </div>
                    <p className="text-2xl lg:text-3xl xl:text-4xl font-bold text-purple-600 dark:text-purple-400 leading-none">{messages.length}</p>
                  </div>
                  <div className="bg-blue-50/60 dark:bg-blue-950/40 backdrop-blur-sm rounded-lg p-2 lg:p-3 border border-blue-100/40 dark:border-blue-900/40">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Mic className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600 dark:text-blue-400" />
                      <span className="text-[10px] lg:text-xs font-medium text-muted-foreground">Mode</span>
                    </div>
                    <p className="text-base lg:text-lg xl:text-xl font-bold text-blue-600 dark:text-blue-400 capitalize leading-none">
                      {currentInputMode}
                    </p>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 rounded-lg p-2 lg:p-3 border border-orange-100 dark:border-orange-900 backdrop-blur-sm">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Sparkles className="h-4 w-4 lg:h-5 lg:w-5 text-orange-600 dark:text-orange-400" />
                    <span className="text-xs lg:text-sm xl:text-base font-semibold text-foreground">Session Tips</span>
                  </div>
                  <ul className="space-y-1 text-[10px] lg:text-xs xl:text-sm text-muted-foreground">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Speak naturally and openly</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Take your time to reflect</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="h-3 w-3 lg:h-3.5 lg:w-3.5 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>Your privacy is protected</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Full Height Session Card (Flip Container) */}
      <div className="lg:col-span-8 relative h-full min-h-[600px]" style={{ perspective: '1000px' }}>
        <div
          className="relative w-full h-full transition-all duration-700"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front - Start Session View */}
          <div
            className="absolute inset-0"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
            }}
          >
            <Card className="w-full h-full bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20 backdrop-blur-sm border border-orange-200/60 dark:border-orange-700/40 shadow-lg hover:shadow-xl transition-all py-4 flex flex-col relative overflow-hidden">
              {/* Decorative gradient overlay */}
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-orange-400/10 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-rose-400/10 to-transparent rounded-full blur-2xl"></div>
              
              <CardHeader className="pb-4 px-6 py-3 flex-shrink-0 relative z-10">
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-gradient-to-br from-orange-500 to-pink-500 rounded-2xl shadow-lg flex-shrink-0">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-3xl font-bold mb-1 bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">Curie, your AI guide</CardTitle>
                    <CardDescription className="text-base">
                      Connect with Curie for personalized support and guidance
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 px-6 py-3 flex-1 flex flex-col justify-between relative z-10">
                <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 backdrop-blur-sm rounded-2xl p-5 border border-purple-100/40 dark:border-purple-900/40">
                  <p className="text-base text-foreground leading-relaxed">
                    💬 Start a conversation with your AI wellness companion to discuss your feelings, concerns, and mental health journey.
                  </p>
                </div>

                <div className="space-y-4">
                  <Button
                    onClick={handleStartSession}
                    className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Start New Session
                  </Button>

                  <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>Private & Secure</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>~10-15 minutes</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Back - Active Session View */}
          <div
            className="absolute inset-0"
            style={{ 
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
            }}
          >
            <Card className="w-full h-full bg-gradient-to-br from-orange-50/80 via-rose-50/80 to-red-50/80 dark:from-orange-950/40 dark:to-rose-950/40 backdrop-blur-lg border border-orange-200/50 dark:border-orange-700/30 shadow-2xl flex flex-col overflow-hidden relative">
              {/* Decorative gradient overlays */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-400/10 via-rose-400/10 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-red-400/10 to-transparent rounded-full blur-2xl"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-rose-400/5 to-orange-400/5 rounded-full blur-3xl"></div>
              
              {/* Header */}
              <div className="flex-shrink-0 px-6 py-4 flex justify-between items-center border-b border-orange-200/40 dark:border-orange-700/30 backdrop-blur-sm relative z-10">
                <div className="flex items-center space-x-4">
                  {/* Avatar with status indicator */}
                  <div className="relative">
                    <div className="w-14 h-14 bg-gradient-to-br from-orange-500 via-pink-500 to-red-500 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 relative overflow-hidden">
                      <Sparkles className="h-7 w-7 text-white relative z-10" />
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                    </div>
                    {/* Connection status indicator */}
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white dark:border-slate-900 rounded-full flex items-center justify-center">
                      <Activity className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <h2 className="font-bold text-xl bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent">Curie</h2>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <p className="text-sm text-muted-foreground font-medium">
                        {isTimerRunning ? `Active • ${formatTime(localTimerSeconds)}` : "Connecting..."}
                      </p>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleEndSession} className="h-11 px-4 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors rounded-xl">
                  <ArrowLeft className="h-5 w-5 mr-2" />
                  <span className="font-medium">End</span>
                </Button>
              </div>

              {/* Messages Area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0 relative z-10 scroll-smooth">
                {messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center max-w-md bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-purple-200/30 dark:border-purple-700/30">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <MessageCircle className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-muted-foreground text-base leading-relaxed">
                        {currentInputMode === "audio" 
                          ? "🎙️ Click the mic button to start speaking" 
                          : "⌨️ Type your message below to begin the conversation"
                        }
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((message, index) => (
                      <div
                        key={`message-${index}`}
                        className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-3 duration-300`}
                      >
                        <div
                          className={`max-w-[80%] rounded-2xl p-4 shadow-md backdrop-blur-sm ${
                            message.sender === "user"
                              ? "bg-gradient-to-br from-purple-500 to-blue-500 text-white rounded-br-md"
                              : "bg-white/80 dark:bg-slate-800/80 text-foreground rounded-bl-md border border-purple-100/50 dark:border-purple-700/30"
                          }`}
                        >
                          {/* Sender label */}
                          <div className="flex items-center gap-2 mb-1.5">
                            {message.sender === "user" ? (
                              <User className="h-3.5 w-3.5 opacity-80" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5 opacity-80" />
                            )}
                            <span className={`text-xs font-semibold ${message.sender === "user" ? "opacity-90" : "text-purple-600 dark:text-purple-400"}`}>
                              {message.sender === "user" ? "You" : "Curie"}
                            </span>
                          </div>
                          <p className="text-base leading-relaxed whitespace-pre-wrap">{message.text}</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* AI Speaking Indicator */}
              {session.isAudioPlaying && (
                <div className="px-6 py-3 flex justify-center items-center flex-shrink-0 relative z-10">
                  <div className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-md rounded-full px-6 py-2.5 border border-purple-200/30 dark:border-purple-700/30 shadow-lg">
                    <div className="flex items-center gap-3">
                      <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">Curie is speaking</span>
                      <div className="flex items-center justify-center h-5 space-x-1">
                        {[...Array(5)].map((_, i) => (
                          <span
                            key={i}
                            className="w-1 h-4 bg-purple-600 dark:bg-purple-400 rounded-full animate-wave"
                            style={{ animationDelay: `${i * 0.1}s` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Input Controls */}
              <div className="flex-shrink-0 px-6 py-4 border-t border-purple-200/40 dark:border-purple-700/30 backdrop-blur-sm relative z-10">
                {currentInputMode === "audio" ? (
                  <div className="flex justify-between items-center">
                    {/* Toggle to text mode */}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-14 h-14 rounded-2xl hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors" 
                      onClick={toggleInputMode}
                    >
                      <Keyboard className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </Button>

                    {/* Mic Button */}
                    <Button
                      onClick={session.isRecording ? handleStopRecording : handleStartRecording}
                      className={`w-24 h-24 rounded-full text-white transition-all duration-300 shadow-2xl relative overflow-hidden ${
                        session.isRecording 
                          ? "bg-gradient-to-br from-red-500 to-pink-500 animate-pulse-glow scale-110" 
                          : "bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-600 hover:scale-105 hover:shadow-purple-500/50"
                      }`}
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
                      {session.isRecording ? (
                        <div className="relative z-10 flex flex-col items-center">
                          <MicOff className="h-10 w-10" />
                        </div>
                      ) : (
                        <Mic className="h-10 w-10 relative z-10" />
                      )}
                    </Button>

                    {/* End session */}
                    <Button 
                      onClick={handleEndSession} 
                      variant="ghost"
                      size="sm" 
                      className="w-14 h-14 rounded-2xl hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 transition-colors"
                    >
                      <ArrowLeft className="h-6 w-6" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={toggleInputMode} 
                      className="h-12 w-12 rounded-xl hover:bg-purple-100 dark:hover:bg-purple-900/30"
                    >
                      <Mic className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </Button>
                    <Input
                      type="text"
                      placeholder="Type your message..."
                      value={textMessage}
                      onChange={(e) => setTextMessage(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && handleSendText()}
                      className="flex-grow text-base h-12 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-purple-200/50 dark:border-purple-700/30 focus:border-purple-400 dark:focus:border-purple-500"
                    />
                    <Button 
                      size="icon" 
                      onClick={handleSendText} 
                      className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg"
                      disabled={!textMessage.trim()}
                    >
                      <Send className="h-5 w-5" />
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
