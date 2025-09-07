import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Brain, Mic, MessageCircle } from "lucide-react";

interface StartScreenProps {
  onStartSession: () => void;
}

export function StartScreen({ onStartSession }: StartScreenProps) {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-lg glass-card border-glass-border text-center">
        <CardContent className="p-8">
          <div className="w-24 h-24 bg-gradient-accent rounded-full flex items-center justify-center mx-auto mb-6 shadow-glow">
            <MessageCircle className="h-12 w-12 text-white" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">Welcome to YouthGuide</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Your personal AI mentor is here to listen and support you through any challenges.
          </p>
          
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <Mic className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium">Voice-First Interaction</p>
                <p className="text-sm text-muted-foreground">Natural conversation through speech</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 text-left">
              <div className="w-8 h-8 bg-secondary/20 rounded-lg flex items-center justify-center">
                <Brain className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <p className="font-medium">AI-Powered Guidance</p>
                <p className="text-sm text-muted-foreground">Intelligent responses tailored to you</p>
              </div>
            </div>
          </div>
          
          <Button
            onClick={onStartSession}
            className="btn-gradient text-white font-semibold py-3 px-8 text-lg rounded-full"
          >
            Start Your Session
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}