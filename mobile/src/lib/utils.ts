import { clsx } from "clsx"
import type { ClassValue } from "clsx"

export const cn = (...inputs: ClassValue[]) => clsx(inputs)

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0")
  const secs = (seconds % 60).toString().padStart(2, "0")
  return `${mins}:${secs}`
}
