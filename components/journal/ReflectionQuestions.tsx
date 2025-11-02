/**
 * ReflectionQuestions Component
 * AI-generated reflection questions to deepen journaling
 */

'use client';

import React, { useState } from 'react';
import { Sparkles, Loader2, RefreshCw, MessageCircle } from 'lucide-react';

interface ReflectionQuestionsProps {
  userId: string;
  entryData: {
    title?: string;
    content: string;
    mood: string;
  };
  onAnswerQuestion?: (question: string, answer: string) => void;
}

interface ReflectionResponse {
  success: boolean;
  questions: string[];
  insight: string;
  contextUsed?: {
    recent_entries_count: number;
    has_chat_history: boolean;
  };
}

export function ReflectionQuestions({
  userId,
  entryData,
  onAnswerQuestion,
}: ReflectionQuestionsProps) {
  const [questions, setQuestions] = useState<string[]>([]);
  const [insight, setInsight] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [contextInfo, setContextInfo] = useState<ReflectionResponse['contextUsed'] | null>(null);

  const generateQuestions = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/journal/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify(entryData),
      });

      if (!response.ok) {
        throw new Error('Failed to generate reflection questions');
      }

      const data: ReflectionResponse = await response.json();
      
      setQuestions(data.questions || []);
      setInsight(data.insight || '');
      setContextInfo(data.contextUsed || null);
    } catch (err: any) {
      console.error('Error generating questions:', err);
      setError(err.message || 'Failed to generate questions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSubmit = (questionIndex: number) => {
    if (answer.trim() && onAnswerQuestion) {
      onAnswerQuestion(questions[questionIndex], answer);
      setAnswer('');
      setSelectedQuestion(null);
    }
  };

  // If no questions yet, show the generate button
  if (questions.length === 0 && !isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
            <Sparkles size={24} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              AI Reflection Assistant
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Let AI generate thoughtful questions to help you explore your thoughts and feelings more deeply.
            </p>
          </div>
        </div>

        <button
          onClick={generateQuestions}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
        >
          <Sparkles size={20} />
          <span>Generate Reflection Questions</span>
        </button>

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
        <div className="flex items-center justify-center gap-3">
          <Loader2 size={24} className="animate-spin text-orange-600" />
          <p className="text-gray-600 dark:text-gray-400">
            Generating personalized questions...
          </p>
        </div>
      </div>
    );
  }

  // Show questions
  return (
    <div className="p-6 bg-gradient-to-br from-orange-50 to-rose-50 dark:from-orange-900/20 dark:to-rose-900/20 border border-orange-200 dark:border-orange-800 rounded-xl space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
            <Sparkles size={24} className="text-orange-600 dark:text-orange-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Reflection Questions
            </h3>
            {insight && (
              <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                {insight}
              </p>
            )}
            {contextInfo && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {contextInfo.recent_entries_count > 0 && (
                  <span>✓ Personalized using {contextInfo.recent_entries_count} recent {contextInfo.recent_entries_count === 1 ? 'entry' : 'entries'}</span>
                )}
                {contextInfo.has_chat_history && (
                  <span> {contextInfo.recent_entries_count > 0 && '• '}✓ Informed by your recent conversations</span>
                )}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={generateQuestions}
          className="p-2 text-gray-600 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 transition-colors"
          title="Generate new questions"
        >
          <RefreshCw size={20} />
        </button>
      </div>

      {/* Questions */}
      <div className="space-y-3">
        {questions.map((question, index) => (
          <div
            key={index}
            className="p-4 bg-white dark:bg-orange-950/70 border border-orange-200 dark:border-orange-700 rounded-lg"
          >
            <div className="flex items-start gap-3">
              <MessageCircle size={18} className="text-orange-600 dark:text-orange-400 mt-1 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-gray-900 dark:text-white font-medium mb-2">
                  {question}
                </p>
                
                {selectedQuestion === index ? (
                  <div className="space-y-2">
                    <textarea
                      value={answer}
                      onChange={(e) => setAnswer(e.target.value)}
                      placeholder="Write your thoughts..."
                      className="w-full px-3 py-2 border border-orange-200 dark:border-orange-700 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-orange-950/70 text-gray-900 dark:text-gray-100 resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAnswerSubmit(index)}
                        disabled={!answer.trim()}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
                      >
                        Add to Entry
                      </button>
                      <button
                        onClick={() => {
                          setSelectedQuestion(null);
                          setAnswer('');
                        }}
                        className="px-4 py-2 bg-orange-200 hover:bg-orange-300 dark:bg-orange-700 dark:hover:bg-orange-600 text-orange-900 dark:text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setSelectedQuestion(index)}
                    className="text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium transition-colors"
                  >
                    Answer this question →
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
