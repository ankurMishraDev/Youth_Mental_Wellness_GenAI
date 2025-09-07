import React, { useCallback } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { TopBar } from "@/components/TopBar";

interface LayoutProps {
  children: React.ReactNode;
  currentUser?: { uid: string; email: string } | null;
  sessionTimer?: string;
  onEndSession?: () => void;
}

// Memoize the Layout component to prevent re-renders when props haven't changed
export const Layout = React.memo(
  ({ children, currentUser, sessionTimer, onEndSession }: LayoutProps) => {
    // useCallback to ensure the onEndSession function reference is stable
    const handleEndSession = useCallback(() => {
      if (onEndSession) {
        onEndSession();
      }
    }, [onEndSession]);

    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gradient-primary">
          <AppSidebar currentUser={currentUser} />

          <div className="flex-1 flex flex-col">
            <TopBar
              currentUser={currentUser}
              sessionTimer={sessionTimer}
              onEndSession={handleEndSession}
            />

            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </SidebarProvider>
    );
  }
);
