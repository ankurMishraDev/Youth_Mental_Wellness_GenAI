import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Exercise } from "../lib/types"
import Image from "next/image"
import { Clock, Youtube } from "lucide-react"

interface ExerciseCardProps {
  exercise: Exercise;
  onGetStarted: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, onGetStarted }) => {
  return (
    <Card className="overflow-hidden flex flex-col h-full group border border-orange-200/60 dark:border-orange-800/50 shadow-sm bg-white/80 dark:bg-gray-950/70 hover:shadow-xl transition-all duration-300">
      <CardHeader className="p-0">
        <div className="relative aspect-[4/3] w-full">
          <Image
            src={exercise.image}
            alt={exercise.exercise_name}
            layout="fill"
            objectFit="cover"
            className="rounded-t-lg transition-transform duration-300 group-hover:scale-105"
          />
        </div>
      </CardHeader>
      <CardContent className="p-3 flex flex-col flex-grow">
        <CardTitle className="text-sm font-semibold mb-1 truncate">{exercise.exercise_name}</CardTitle>
        <div className="flex items-center text-xs text-muted-foreground mb-2">
          <Clock className="h-3 w-3 mr-1" />
          <span>{exercise.expected_time_to_complete}</span>
        </div>
        <div className="mt-auto">
          <Button
            size="sm"
            className="w-full text-xs bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white shadow-md hover:shadow-lg transition-all"
            onClick={onGetStarted}
          >
            Get Started
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
