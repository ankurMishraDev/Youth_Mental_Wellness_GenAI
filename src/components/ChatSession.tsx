import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Video, VideoOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAudioClient } from "@/hooks/useAudioClient";

interface Message {
  id: string;
  text: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface ChatSessionProps {
  onEndSession: () => void;
  currentUser?: { uid: string; email: string } | null;
}

export function ChatSession({ onEndSession, currentUser }: ChatSessionProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm YouthGuide, your AI mentor. I'm here to listen and support you. What's on your mind today?",
      sender: "assistant",
      timestamp: new Date(),
    },
  ]);
  const [currentResponseElement, setCurrentResponseElement] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const {
    initializeAudioClient,
    startRecording: startAudioRecording,
    stopRecording: stopAudioRecording,
    sendUserId,
    interrupt,
    close,
    isConnected,
    isRecording,
    isModelSpeaking,
    sessionId
  } = useAudioClient();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (text: string, sender: "user" | "assistant") => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      sender,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  };

  const updateMessage = (id: string, text: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, text } : msg
    ));
  };

  useEffect(() => {
    const initAudio = async () => {
      try {
        let currentResponseText = '';
        let currentResponseElement: string | null = null;

        await initializeAudioClient({
          onReady: () => {
            console.log('Audio client ready');
            if (currentUser?.uid) {
              sendUserId(currentUser.uid);
            }
          },
          onAudioReceived: () => {
            // Audio indicator will be shown when model is speaking
          },
          onTextReceived: (text: string) => {
            if (text && text.trim()) {
              if (!currentResponseElement) {
                currentResponseText = text;
                currentResponseElement = addMessage(text, "assistant");
                setCurrentResponseElement(currentResponseElement);
              } else {
                currentResponseText += ' ' + text.trim();
                updateMessage(currentResponseElement, currentResponseText);
              }
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }
          },
          onTurnComplete: () => {
            currentResponseText = '';
            currentResponseElement = null;
            setCurrentResponseElement(null);
          },
          onError: (error: any) => {
            console.error('Audio client error:', error);
            addMessage("Sorry, I encountered an error. Please try again.", "assistant");
            currentResponseText = '';
            currentResponseElement = null;
            setCurrentResponseElement(null);
          },
          onInterrupted: () => {
            console.log('Interruption detected');
            interrupt();
            currentResponseText = '';
            currentResponseElement = null;
            setCurrentResponseElement(null);
          }
        });
      } catch (error) {
        console.error('Failed to initialize audio client:', error);
        addMessage("Sorry, I'm having trouble connecting. Please try again later.", "assistant");
      }
    };

    initAudio();

    return () => {
      close();
    };
  }, [initializeAudioClient, sendUserId, currentUser, interrupt, close]);

  const handleMicClick = async () => {
    if (isRecording) {
      stopAudioRecording();
      // Remove placeholder message if it exists
      setMessages(prev => prev.filter(msg => msg.text !== "..."));
    } else {
      try {
        const success = await startAudioRecording();
        if (success) {
          addMessage("...", "user"); // Placeholder for user speech
        }
      } catch (error) {
        console.error('Error starting recording:', error);
      }
    }
  };

  const handleEndSession = () => {
    if (isRecording) {
      stopAudioRecording();
    }
    close();
    addMessage("Our session has ended. Remember to take care.", "assistant");
    onEndSession();
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
      <Card className="w-full max-w-2xl h-[600px] glass-card border-glass-border flex flex-col">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Chat Header */}
          <div className="p-4 border-b border-glass-border flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-accent rounded-full flex items-center justify-center">
              <Mic className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold">YouthGuide Session</h2>
              <p className="text-xs text-muted-foreground">AI Mentor • Active</p>
            </div>
          </div>

          {/* Messages */}
          <div 
            ref={chatContainerRef}
            className="flex-1 p-4 overflow-y-auto custom-scrollbar space-y-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex",
                  message.sender === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] p-3 rounded-2xl",
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "glass-subtle rounded-bl-sm"
                  )}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Audio Indicator */}
          {isModelSpeaking && (
            <div className="px-4 pb-2 flex justify-center">
              <div className="audio-wave flex items-center gap-1">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="p-4 border-t border-glass-border flex items-center justify-center gap-4">
            <Button
              variant="ghost"
              size="lg"
              className="w-14 h-14 rounded-full glass-subtle border border-glass-border opacity-50 cursor-not-allowed"
              disabled
            >
              <VideoOff className="h-6 w-6" />
            </Button>

            <Button
              onClick={handleMicClick}
              size="lg"
              className={cn(
                "w-20 h-20 rounded-full text-white transition-all duration-900",
                isRecording
                  ? "bg-secondary hover:bg-secondary/90 pulse-ring"
                  : "bg-primary hover:bg-primary/90"
              )}
            >
              {isRecording ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </Button>

            <Button
              onClick={handleEndSession}
              variant="destructive"
              size="lg"
              className="w-14 h-14 rounded-full"
            >
              <svg
                className="h-6 w-6"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.68.28-.26 0-.51-.1-.71-.29-.19-.19-.29-.45-.29-.71s.1-.52.29-.71c1.25-1.17 2.7-2.1 4.27-2.74C8.15 11 10.05 10.5 12 10.5s3.85.5 4.94.9c1.57.64 3.02 1.57 4.27 2.74.19.19.29.45.29.71s-.1.52-.29.71c-.2.19-.45.29-.71.29-.25 0-.5-.1-.68-.28-.79-.73-1.68-1.36-2.66-1.85-.33-.16-.56-.51-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z"/>
              </svg>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}