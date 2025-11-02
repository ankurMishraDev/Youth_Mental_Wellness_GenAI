import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExerciseCard } from "../ExerciseCard";
import { ExerciseTemplate } from "../ExerciseTemplate";
import { Activity } from "lucide-react";
import { Exercise, ViewType } from "../../lib/types";
import allExercises from "../../lib/exercises.json";

interface ResourcesSectionProps {
  isLoadingExercises: boolean;
  suggestedExercises: Exercise[];
  setSelectedExercise: (exercise: Exercise | null) => void;
  setCurrentView: (view: ViewType) => void;
}

export const ResourcesSection: React.FC<ResourcesSectionProps> = ({
  isLoadingExercises,
  suggestedExercises,
  setSelectedExercise,
  setCurrentView,
}) => {
  const [showAllExercises, setShowAllExercises] = useState(false);
  const [selectedExerciseForModal, setSelectedExerciseForModal] = useState<Exercise | null>(null);

  const handleGetStarted = (exercise: Exercise) => {
    const correctedExercise = {
      ...exercise,
      image: exercise.image.replace('./images/', '/images/'),
      bgSound: exercise.bgSound.replace('./sounds/', '/sounds/')
    };
    setSelectedExerciseForModal(correctedExercise);
  };

  return (
    <>
      <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Your Suggested Exercises</h2>
        {isLoadingExercises ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading exercises...</p>
          </div>
        ) : suggestedExercises.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {suggestedExercises.map(exercise => (
              <ExerciseCard 
                key={exercise.id} 
                exercise={exercise} 
                onGetStarted={() => handleGetStarted(exercise)} 
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 border border-orange-200/60 dark:border-orange-800/50 rounded-lg bg-white/80 dark:bg-gray-950/70">
            <Activity className="h-12 w-12 text-orange-500 mx-auto mb-4" />
            <p className="text-orange-800/80 dark:text-orange-200/80">
              Your AI mentor will add personalized exercises here after your sessions.
            </p>
            <Button
              onClick={() => setCurrentView("session")}
              className="mt-4 bg-orange-500 text-white hover:bg-orange-600"
              size="sm"
            >
              Start a Session to Get Started
            </Button>
          </div>
        )}
      </div>

      <div className="text-center">
        <Button onClick={() => setShowAllExercises(!showAllExercises)} className="bg-orange-500 text-white hover:bg-orange-600">
          {showAllExercises ? "Less Exercises" : "More Exercises"}
        </Button>
      </div>

      {showAllExercises && (
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-4 mt-8">All Available Exercises</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {allExercises.map(exercise => {
              const correctedExercise = {
                ...exercise,
                image: exercise.image.replace('./images/', '/images/')
              };
              return (
                <ExerciseCard 
                  key={correctedExercise.id} 
                  exercise={correctedExercise} 
                  onGetStarted={() => handleGetStarted(correctedExercise)} 
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
      {selectedExerciseForModal && (
        <ExerciseTemplate 
          exercise={selectedExerciseForModal} 
          onClose={() => setSelectedExerciseForModal(null)} 
        />
      )}
    </>
  );
};
