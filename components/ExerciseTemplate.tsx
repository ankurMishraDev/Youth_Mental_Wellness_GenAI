import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Exercise } from "../lib/types";
import { X, Clock, Youtube, Volume2, VolumeX } from "lucide-react";

interface ExerciseTemplateProps {
  exercise: Exercise;
  onClose: () => void;
}

export const ExerciseTemplate: React.FC<ExerciseTemplateProps> = ({ exercise, onClose }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(false);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  useEffect(() => {
    const playAudio = async () => {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
        } catch (error) {
          console.error("Audio play failed:", error);
          // Autoplay was prevented. We can show a play button to the user here if needed.
        }
      }
    };

    playAudio();

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [exercise]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <Card className="w-full max-w-2xl bg-card text-card-foreground relative">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{exercise.exercise_name}</CardTitle>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={onClose}>
            <X className="h-6 w-6" />
          </Button>
        </CardHeader>
          <div className="flex items-center justify-center px-2 py-2">
          <div className="w-[400px] h-[300px] rounded-lg shadow-lg overflow-hidden">
            <img 
              src={exercise.image} 
              alt={exercise.exercise_name} 
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <CardContent className="space-y-6 p-6">
          <p className="text-base leading-relaxed">{exercise.procedure}</p>
          <div className="flex items-center text-sm text-muted-foreground">
            <Clock className="h-4 w-4 mr-2" />
            <span>Expected time to complete: {exercise.expected_time_to_complete}</span>
          </div>
          <Button className="w-full" onClick={() => window.open(exercise.video_link, "_blank")}>
            <Youtube className="h-5 w-5 mr-2" />
            Watch Video
          </Button>
          <Button variant="outline" size="icon" className="absolute bottom-4 right-4" onClick={toggleMute}>
            {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </Button>
        </CardContent>
      </Card>
      <audio ref={audioRef} src={exercise.bgSound} loop muted={isMuted} />
    </div>
  );
};
