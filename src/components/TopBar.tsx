import { Clock, PhoneOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TopBarProps {
  currentUser?: { uid: string; email: string } | null;
  sessionTimer?: string;
  onEndSession?: () => void;
}

export function TopBar({ currentUser, sessionTimer, onEndSession }: TopBarProps) {
  return (
    <header className="h-16 glass-card border-b border-glass-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-semibold">AI Mentoring Session</h1>
        {sessionTimer && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{sessionTimer}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
        >
          <Volume2 className="h-4 w-4 mr-2" />
          Audio Settings
        </Button>
        
        {onEndSession && (
          <Button
            variant="destructive"
            size="sm"
            onClick={onEndSession}
            className="bg-destructive hover:bg-destructive/90"
          >
            <PhoneOff className="h-4 w-4 mr-2" />
            End Session
          </Button>
        )}
      </div>
    </header>
  );
}