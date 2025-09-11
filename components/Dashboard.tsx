import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { LogOut, Home, MessageCircle, BookOpen, Users, User as UserIcon, Heart, Brain } from "lucide-react"
import { User, DashboardPage, ViewType } from "../lib/types"

interface DashboardProps {
  currentUser: User | null
  handleLogout: () => void
  dashboardPage: DashboardPage
  setDashboardPage: (page: DashboardPage) => void
  setCurrentView: (view: ViewType) => void
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  handleLogout,
  dashboardPage,
  setDashboardPage,
  setCurrentView,
}) => {
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
                <h1 className="text-xl font-bold text-foreground">YouthGuide</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {currentUser?.name || currentUser?.email?.split("@")[0]}
                </p>
              </div>
            </div>
            <Button variant="ghost" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
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
            <Card className="col-span-full lg:col-span-2 bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Heart className="h-6 w-6 text-primary" />
                  <span>How are you feeling today?</span>
                </CardTitle>
                <CardDescription>Start a conversation with your AI mentor anytime you need support.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setCurrentView("session")} className="w-full h-14 text-lg font-semibold">
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Start AI Session
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="h-5 w-5 text-secondary" />
                  <span>Quick Check-in</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Mood</span>
                  <Badge variant="secondary">Good</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Energy</span>
                  <Badge variant="outline">Medium</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Sleep</span>
                  <Badge variant="secondary">7 hours</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Tip</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  "Take 5 deep breaths when you feel overwhelmed. It's a simple way to reset your mind and find calm."
                </p>
              </CardContent>
            </Card>

            <Card>
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
                <CardDescription>Connect with your AI mentor for personalized support and guidance.</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setCurrentView("session")} className="w-full h-14 text-lg font-semibold">
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
                  Guided meditation and breathing exercises to help you stay present.
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
                <CardDescription>Connect with others on similar journeys (Coming Soon)</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  We're building a safe space for young people to support each other. Stay tuned!
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {dashboardPage === "profile" && (
          <Card className="max-w-2xl">
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your personal information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <Input value={currentUser?.name || ""} className="mt-1" readOnly />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Age</label>
                  <Input value={currentUser?.age || ""} className="mt-1" readOnly />
                </div>
                <div>
                  <label className="text-sm font-medium">Gender</label>
                  <Input value={currentUser?.gender || ""} className="mt-1" readOnly />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input value={currentUser?.email || ""} className="mt-1" readOnly />
              </div>
              <Button className="w-full" disabled>
                Edit Profile (Coming Soon)
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}