import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { AuthScreen } from "@/components/AuthScreen";
import { StartScreen } from "@/components/StartScreen";
import { ChatSession } from "@/components/ChatSession";

type AppState = "auth" | "start" | "session";

interface User {
  uid: string;
  email: string;
}

const Index = () => {
  const [appState, setAppState] = useState<AppState>("auth");
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionTimer, setSessionTimer] = useState<string>("00:00");
  const [sessionSeconds, setSessionSeconds] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (appState === "session") {
      interval = setInterval(() => {
        setSessionSeconds(prev => {
          const newSeconds = prev + 1;
          const minutes = Math.floor(newSeconds / 60).toString().padStart(2, '0');
          const seconds = (newSeconds % 60).toString().padStart(2, '0');
          setSessionTimer(`${minutes}:${seconds}`);
          return newSeconds;
        });
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [appState]);

  const handleAuth = (user: User) => {
    setCurrentUser(user);
    setAppState("start");
  };

  const handleStartSession = () => {
    setSessionSeconds(0);
    setSessionTimer("00:00");
    setAppState("session");
  };

  const handleEndSession = () => {
    setAppState("start");
    setSessionSeconds(0);
    setSessionTimer("Session ended");
  };

  if (appState === "auth") {
    return <AuthScreen onAuth={handleAuth} />;
  }

  return (
    <Layout 
      currentUser={currentUser}
      sessionTimer={appState === "session" ? sessionTimer : undefined}
      onEndSession={appState === "session" ? handleEndSession : undefined}
    >
      {appState === "start" && <StartScreen onStartSession={handleStartSession} />}
      {appState === "session" && <ChatSession onEndSession={handleEndSession} currentUser={currentUser} />}
    </Layout>
  );
};

export default Index;
