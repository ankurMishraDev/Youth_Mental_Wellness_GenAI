import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LogOut,
  MessageCircle,
  Heart,
  Brain,
  Edit,
  Check,
  X,
  Activity,
} from "lucide-react";
import { User, DashboardPage, ViewType, MoodData, Exercise } from "../lib/types";
import tips from "../lib/health-tips.json";
import allExercises from "../lib/exercises.json";
import { Sidebar } from "./Sidebar";
import { ExerciseCard } from "./ExerciseCard";
import { ExerciseTemplate } from "./ExerciseTemplate";
import {
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
} from "recharts";

interface DashboardProps {
  currentUser: User | null;
  currentUserName: string;
  handleLogout: () => void;
  dashboardPage: DashboardPage;
  setDashboardPage: (page: DashboardPage) => void;
  setCurrentView: (view: ViewType) => void;
  onUserUpdate?: (user: User) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  handleLogout,
  dashboardPage,
  setDashboardPage,
  setCurrentView,
  onUserUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(currentUser?.name || "");
  const [editedAge, setEditedAge] = useState(
    currentUser?.age?.toString() || ""
  );
  const [editedGender, setEditedGender] = useState(currentUser?.gender || "");
  const [isLoading, setIsLoading] = useState(false);
  const [currentUserName,setUserName]=useState("")
  const [moodData, setMoodData] = useState<MoodData | null>(null);
  const [isLoadingMood, setIsLoadingMood] = useState(false);
  const [currentTip, setCurrentTip] = useState("");
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [suggestedExercises, setSuggestedExercises] = useState<Exercise[]>([]);
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);

  const handleEdit = () => {
    setEditedName(currentUser?.name || "");
    setEditedAge(currentUser?.age?.toString() || "");
    setEditedGender(currentUser?.gender || "");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedName(currentUser?.name || "");
    setEditedAge(currentUser?.age?.toString() || "");
    setEditedGender(currentUser?.gender || "");
  };

  const handleSave = async () => {
    if (!currentUser?.uid) return;

    setIsLoading(true);
    try {
      const response = await fetch("http://localhost:3000/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: currentUser.uid,
          name: editedName,
          age: editedAge,
          gender: editedGender,
        }),
      });

      if (response.ok) {
        // Update local storage with new data
        const updatedUser = {
          ...currentUser,
          name: editedName,
          age: editedAge ? Number.parseInt(editedAge) : undefined,
          gender: editedGender,
        };
        localStorage.setItem("youthguide_user", JSON.stringify(updatedUser));

        // Update current user in parent component
        if (onUserUpdate) {
          onUserUpdate(updatedUser);
        }

        alert("Profile updated successfully!");
        setIsEditing(false);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMoodData = async () => {
    if (!currentUser?.uid) {
      console.log("No current user UID available");
      return;
    }
    
    console.log("Fetching mood data for user:", currentUser.uid);
    setIsLoadingMood(true);
    setIsLoadingSession(true);
    try {
      const response = await fetch(
        `http://localhost:3000/user/${currentUser.uid}`
      );
      console.log("Response status:", response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log("User data received:", userData);
        setUserName(userData.name);
        console.log(currentUserName)

        const latestSummary = userData.latestSummary?.summary_data;
        console.log("Latest summary:", latestSummary);

        // Set session summary data
        if (userData.latestSummary) {
          setSessionSummary(userData.latestSummary);
        }

        if (latestSummary && latestSummary.mood) {
          const moodDataObj = {
            mood: latestSummary.mood,
            mood_percentage: latestSummary.mood_percentage || 0,
            energy_level: latestSummary.energy_level || 0,
            stress_level: latestSummary.stress_level || 0,
            mood_stability: latestSummary.mood_stability || "Unknown",
            mood_calmness: latestSummary.mood_calmness || "Unknown",
            generated_at_utc:
              latestSummary.generated_at_utc || new Date().toISOString(),
          };
          console.log("Setting mood data:", moodDataObj);
          setMoodData(moodDataObj);
        } else {
          console.log("No mood data found in latest summary");
        }

        // Filter and set suggested exercises
        if (userData.suggested_exercise_ids && Array.isArray(userData.suggested_exercise_ids)) {
          const filteredExercises = allExercises.filter(ex => 
            userData.suggested_exercise_ids.includes(ex.id)
          );
          setSuggestedExercises(filteredExercises);
        }
      } else {
        console.error("Failed to fetch user data:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching mood data:", error);
    } finally {
      setIsLoadingMood(false);
      setIsLoadingSession(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchMoodData();
    }
  }, [currentUser?.uid]);
  
    useEffect(() => {
      const updateTip = () => {
        const now = Date.now();
        const interval = 12 * 60 * 60 * 1000; // 12 hours in ms
        const index = Math.floor(now / interval) % tips.length;
        setCurrentTip(tips[index].tip);
      };
  
      updateTip(); // Set initial tip
  
      const timer = setInterval(updateTip, 12 * 60 * 60 * 1000);
  
      return () => clearInterval(timer);
    }, []);

  return (
    <div className="min-h-screen flex relative">
      {selectedExercise && (
        <ExerciseTemplate 
          exercise={selectedExercise} 
          onClose={() => setSelectedExercise(null)} 
        />
      )}
      <Sidebar
        dashboardPage={dashboardPage}
        setDashboardPage={setDashboardPage}
        handleLogout={handleLogout}
      />
      <main className="flex-1 p-6 md:p-8 transition-all duration-300">
        <header className="flex justify-between items-center mb-8 md:mt-0 mt-12">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {currentUser?.name || currentUser?.email?.split("@")[0]}
            </h1>
            <p className="text-lg text-muted-foreground">
              Here's your wellness overview.
            </p>
          </div>
        </header>

        {/* Dashboard Content */}
        {dashboardPage === "home" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="col-span-full lg:col-span-1 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Heart className="h-7 w-7 text-primary" />
                  <span>How are you feeling today?</span>
                </CardTitle>
                <CardDescription className="text-base">
                  Start a conversation with your AI mentor anytime you need
                  support.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setCurrentView("session")}
                  className="w-full h-16 text-xl font-semibold"
                >
                  <MessageCircle className="h-6 w-6 mr-3" />
                  Start AI Session
                </Button>
              </CardContent>
            </Card>

            <Card className="col-span-full lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-xl">
                  <Brain className="h-6 w-6 text-secondary" />
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
                  <div className="space-y-6">
                    {/* Mood Overview */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">
                          {moodData.mood}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Current Mood
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-secondary">
                          {moodData.mood_percentage}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Mood Score
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {moodData.energy_level}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Energy Level
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {moodData.stress_level}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Stress Level
                        </div>
                      </div>
                    </div>

                    {/* Energy and Stress Level Half Doughnut Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Energy Level Chart */}
                      <div className="flex flex-col items-center">
                        <div className="relative mb-2">
                          <ResponsiveContainer width={150} height={150}>
                            <PieChart>
                              <Pie
                                data={[
                                  {
                                    name: "Energy",
                                    value: moodData.energy_level,
                                    fill: "#10b981",
                                  },
                                  {
                                    name: "Remaining",
                                    value: 100 - moodData.energy_level,
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
                          {/* Center Text */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-green-600">
                                {moodData.energy_level}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Energy
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-green-700">
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
                                    value: moodData.stress_level,
                                    fill: "#ef4444",
                                  },
                                  {
                                    name: "Remaining",
                                    value: 100 - moodData.stress_level,
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
                          {/* Center Text */}
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                              <div className="text-2xl font-bold text-red-600">
                                {moodData.stress_level}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Stress
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-medium text-blue-700">
                            {moodData.mood_calmness}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Calmness
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

            <Card className="col-span-full md:col-span-1">
              <CardHeader>
                <CardTitle>Quick Tip</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  "{currentTip}"
                </p>
              </CardContent>
            </Card>

          </div>
        )}

        {dashboardPage === "sessions" && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">AI Mentor Sessions</CardTitle>
                <CardDescription className="text-base">
                  Connect with your AI mentor for personalized support and
                  guidance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setCurrentView("session")}
                  className="w-full h-16 text-xl font-semibold"
                >
                  <MessageCircle className="h-6 w-6 mr-3" />
                  Start New Session
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Summary</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingSession ? (
                  <div className="flex items-center justify-center h-16">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    <p className="ml-2 text-sm text-muted-foreground">Loading session data...</p>
                  </div>
                ) : sessionSummary ? (
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium text-foreground mb-2">Last Session Summary:</p>
                      {sessionSummary.description || sessionSummary.summary_text || sessionSummary.summary ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {sessionSummary.description || sessionSummary.summary_text || sessionSummary.summary}
                          </p>
                          {sessionSummary.generated_at_utc && (
                            <div className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
                              Session completed: {new Date(sessionSummary.generated_at_utc).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : sessionSummary.summary_data ? (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            {sessionSummary.summary_data.summary ||
                             sessionSummary.summary_data.summary ||
                             "Session completed with mood analysis and wellness insights."}
                          </p>
                          {sessionSummary.summary_data.generated_at_utc && (
                            <div className="text-xs text-muted-foreground mt-3 pt-2 border-t border-border">
                              Session completed: {new Date(sessionSummary.summary_data.generated_at_utc).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">Session data available but summary details not found.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Complete a session to see your conversation history and insights here.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {dashboardPage === "resources" && (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-4">Your Suggested Exercises</h2>
              {suggestedExercises.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {suggestedExercises.map(exercise => (
                    <ExerciseCard 
                      key={exercise.id} 
                      exercise={exercise} 
                      onGetStarted={() => setSelectedExercise(exercise)} 
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border rounded-lg">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Your AI mentor will add personalized exercises here after your sessions.
                  </p>
                  <Button
                    onClick={() => setCurrentView("session")}
                    className="mt-4"
                    size="sm"
                  >
                    Start a Session to Get Started
                  </Button>
                </div>
              )}
            </div>

            <div className="text-center">
              <Button onClick={() => setShowAllExercises(!showAllExercises)}>
                {showAllExercises ? "Less Exercises" : "More Exercises"}
              </Button>
            </div>

            {showAllExercises && (
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 mt-8">All Available Exercises</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {allExercises.map(exercise => (
                    <ExerciseCard 
                      key={exercise.id} 
                      exercise={exercise} 
                      onGetStarted={() => setSelectedExercise(exercise)} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}


        {dashboardPage === "profile" && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>
                Manage your personal information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input
                  value={isEditing ? editedName : currentUser?.name || ""}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="mt-1"
                  readOnly={!isEditing}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Age</label>
                  <Input
                    type="number"
                    min="13"
                    max="25"
                    value={isEditing ? editedAge : currentUser?.age || ""}
                    onChange={(e) => setEditedAge(e.target.value)}
                    className="mt-1"
                    readOnly={!isEditing}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Gender</label>
                  {isEditing ? (
                    <Select
                      value={editedGender}
                      onValueChange={setEditedGender}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="prefer-not-to-say">
                          Prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      value={currentUser?.gender || ""}
                      className="mt-1"
                      readOnly
                    />
                  )}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input
                  value={currentUser?.email || ""}
                  className="mt-1"
                  readOnly
                />
              </div>
              {!isEditing ? (
                <Button onClick={handleEdit} className="w-full">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {isLoading ? "Saving..." : "Confirm"}
                  </Button>
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};
