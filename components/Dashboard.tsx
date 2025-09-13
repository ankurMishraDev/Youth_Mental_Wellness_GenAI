import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Home,
  MessageCircle,
  BookOpen,
  Users,
  User as UserIcon,
  Heart,
  Brain,
  Edit,
  Check,
  X,
  TrendingUp,
  Activity,
} from "lucide-react";
import { User, DashboardPage, ViewType, MoodData } from "../lib/types";
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
  const [moodData, setMoodData] = useState<MoodData | null>(null);
  const [isLoadingMood, setIsLoadingMood] = useState(false);

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
    try {
      const response = await fetch(
        `http://localhost:3000/user/${currentUser.uid}`
      );
      console.log("Response status:", response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log("User data received:", userData);

        const latestSummary = userData.latestSummary?.summary_data;
        console.log("Latest summary:", latestSummary);

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
      } else {
        console.error("Failed to fetch user data:", response.status, response.statusText);
      }
    } catch (error) {
      console.error("Error fetching mood data:", error);
    } finally {
      setIsLoadingMood(false);
    }
  };

  useEffect(() => {
    if (currentUser?.uid) {
      fetchMoodData();
    }
  }, [currentUser?.uid]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background">
      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center">
                <MessageCircle className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  YouthGuide
                </h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back,{" "}
                  {currentUser?.name || currentUser?.email?.split("@")[0]}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation - Added multiple dashboard pages */}
        <div className="flex flex-wrap gap-2 mb-8">
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "sessions", label: "AI Sessions", icon: MessageCircle },
            { id: "resources", label: "Resources", icon: BookOpen },
            { id: "community", label: "Community", icon: Users },
            { id: "profile", label: "Profile", icon: UserIcon },
          ].map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={dashboardPage === id ? "default" : "outline"}
              onClick={() => setDashboardPage(id as DashboardPage)}
              className="flex items-center space-x-2"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </Button>
          ))}
        </div>

        {/* Dashboard Content */}
        {dashboardPage === "home" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="col-span-full lg:col-span-1 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-6 w-6 text-primary" />
                  <span>How are you feeling today?</span>
                </CardTitle>
                <CardDescription>
                  Start a conversation with your AI mentor anytime you need
                  support.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setCurrentView("session")}
                  className="w-full h-14 text-lg font-semibold"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Start AI Session
                </Button>
              </CardContent>
            </Card>

            <Card className="col-span-full lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-secondary" />
                  <span>Mood Analytics</span>
                </CardTitle>
                <CardDescription>
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
                <CardTitle>Daily Tip</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  "Take 5 deep breaths when you feel overwhelmed. It's a simple
                  way to reset your mind and find calm."
                </p>
              </CardContent>
            </Card>

            <Card className="col-span-full md:col-span-1">
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Your conversation history and insights will appear here.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {dashboardPage === "sessions" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Mentor Sessions</CardTitle>
                <CardDescription>
                  Connect with your AI mentor for personalized support and
                  guidance.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => setCurrentView("session")}
                  className="w-full h-14 text-lg font-semibold"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Start New Session
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {dashboardPage === "resources" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Mindfulness</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Guided meditation and breathing exercises to help you stay
                  present.
                </p>
                <Button variant="outline" className="w-full bg-transparent">
                  Explore
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Coping Strategies</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Learn healthy ways to manage stress and difficult emotions.
                </p>
                <Button variant="outline" className="w-full bg-transparent">
                  Learn More
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crisis Support</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Immediate help and resources when you need urgent support.
                </p>
                <Button variant="destructive" className="w-full">
                  Get Help Now
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {dashboardPage === "community" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Community Support</CardTitle>
                <CardDescription>
                  Connect with others on similar journeys (Coming Soon)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We're building a safe space for young people to support each
                  other. Stay tuned!
                </p>
              </CardContent>
            </Card>
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
      </div>
    </div>
  );
};
