import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, MicOff, PhoneOff, Settings, Home, MessageCircle } from "lucide-react"
import { Message, ViewType } from "../lib/types"
import { formatTime } from "../lib/utils"

interface SessionProps {
  messages: Message[]
  messagesEndRef: React.RefObject<HTMLDivElement>
  isRecording: boolean
  sessionSeconds: number
  sessionActive: boolean
  isAudioPlaying: boolean
  startRecording: () => void
  stopRecording: () => void
  endSession: () => void
  setCurrentView: (view: ViewType) => void
}

export const Session: React.FC<SessionProps> = ({
  messages,
  messagesEndRef,
  isRecording,
  sessionSeconds,
  sessionActive,
  isAudioPlaying,
  startRecording,
  stopRecording,
  endSession,
  setCurrentView,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-background flex items-center justify-center p-4">
      <Card className="w-full max-w-lg h-[90vh] max-h-[700px] shadow-2xl border-0 bg-card/90 backdrop-blur-sm flex flex-col overflow-hidden">
        {/* Session Header */}
        <div className="flex-shrink-0 p-4 flex justify-between items-center border-b border-border bg-card/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center shadow-lg">
              <MessageCircle className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="font-bold text-foreground">YouthGuide</h2>
              <p className="text-xs text-muted-foreground">
                {sessionActive ? formatTime(sessionSeconds) : "Connecting..."}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setCurrentView("dashboard")}>
            <Home className="h-4 w-4" />
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-grow p-4 overflow-y-auto space-y-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                message.sender === "user"
                  ? "ml-auto bg-primary text-primary-foreground rounded-br-md"
                  : "mr-auto bg-muted text-muted-foreground rounded-bl-md"
              }`}
            >
              {message.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Audio Indicator */}
        {isAudioPlaying && (
          <div className="px-4 pb-2 flex justify-center items-center h-10">
            <div className="flex items-center justify-center h-5 space-x-1">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className="w-1 h-4 bg-secondary rounded-full animate-wave"
                  style={{ animationDelay: `${i * 0.1}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="flex-shrink-0 p-4 flex justify-around items-center border-t border-border bg-card/50">
          <Button variant="ghost" size="lg" className="w-14 h-14 rounded-full opacity-50 cursor-not-allowed">
            <Settings className="h-6 w-6" />
          </Button>

          <Button
            onClick={isRecording ? stopRecording : startRecording}
            className={`w-20 h-20 rounded-full text-white transition-all duration-300 ${
              isRecording ? "bg-secondary animate-pulse-glow" : "bg-primary hover:bg-primary/90"
            }`}
          >
            {isRecording ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
          </Button>

          <Button onClick={endSession} variant="destructive" size="lg" className="w-14 h-14 rounded-full">
            <PhoneOff className="h-6 w-6" />
          </Button>
        </div>
      </Card>
    </div>
  )
}