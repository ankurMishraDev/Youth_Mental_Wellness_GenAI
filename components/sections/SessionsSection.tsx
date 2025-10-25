import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

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
  return (
    <div className="flex gap-6">
      <div className="w-1/2">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-2xl">Curie your AI guide</CardTitle>
            <CardDescription className="text-base">
              Connect with Curie, your AI guide, for personalized support and
              guidance.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={onStartSession}
              className="w-full h-16 text-xl font-semibold"
            >
              <MessageCircle className="h-6 w-6 mr-3" />
              Start New Session
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="w-1/2">
        <Card className="h-full">
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
  </div>
  );
};
