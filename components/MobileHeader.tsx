'use client';

import { Button } from "@/components/ui/button";

interface MobileHeaderProps {
  page: 'analytics' | 'home' | 'journal' | 'consultants' | 'profile' | 'resources' | 'sessions';
  timePeriod?: 7 | 30 | 90 | 365;
  setTimePeriod?: (period: 7 | 30 | 90 | 365) => void;
  filter?: "all" | "ai_session" | "journal_entry";
  setFilter?: (filter: "all" | "ai_session" | "journal_entry") => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  page,
  timePeriod,
  setTimePeriod,
  filter,
  setFilter,
}) => {
  const getTitle = () => {
    switch (page) {
      case 'analytics':
        return 'Wellness Analytics';
      case 'home':
        return 'Hello, User!';
      case 'journal':
        return 'My Journal';
      case 'consultants':
        return 'Mental Health Consultants';
      case 'profile':
        return 'Profile Settings';
      case 'resources':
        return 'Wellness Resources';
      case 'sessions':
        return 'AI Guide Session';
      default:
        return '';
    }
  };

  const getDescription = () => {
    switch (page) {
      case 'analytics':
        return 'Track your mental wellness journey over time';
      case 'home':
        return 'Your personal dashboard overview';
      case 'journal':
        return 'Your personal space for reflection';
      case 'consultants':
        return 'Connect with professional mental health consultants';
      case 'profile':
        return 'Manage your personal information';
      case 'resources':
        return 'Explore exercises and tips to support your mental well-being';
      case 'sessions':
        return 'Connect with your AI mentor for personalized support and guidance';
      default:
        return '';
    }
  };

  return (
    <div className="flex flex-col items-center w-full mt-4">
      <div className="text-center">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-pink-600 bg-clip-text text-transparent">
          {getTitle()}
        </h2>
        <p className="text-orange-800/80 dark:text-orange-200/80 mt-1">
          {getDescription()}
        </p>
      </div>
      {page === 'analytics' && setTimePeriod && setFilter && (
        <div className="flex flex-col gap-3 mt-4">
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={timePeriod === 7 ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod(7)}
              className={timePeriod === 7 ? "shadow-md" : ""}
            >
              7 Days
            </Button>
            <Button
              variant={timePeriod === 30 ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod(30)}
              className={timePeriod === 30 ? "shadow-md" : ""}
            >
              30 Days
            </Button>
            <Button
              variant={timePeriod === 90 ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod(90)}
              className={timePeriod === 90 ? "shadow-md" : ""}
            >
              90 Days
            </Button>
            <Button
              variant={timePeriod === 365 ? "default" : "ghost"}
              size="sm"
              onClick={() => setTimePeriod(365)}
              className={timePeriod === 365 ? "shadow-md" : ""}
            >
              All Time
            </Button>
          </div>
          <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
            <Button
              variant={filter === "all" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("all")}
              className={filter === "all" ? "shadow-md" : ""}
            >
              All
            </Button>
            <Button
              variant={filter === "ai_session" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("ai_session")}
              className={filter === "ai_session" ? "shadow-md" : ""}
            >
              🎙️ Sessions
            </Button>
            <Button
              variant={filter === "journal_entry" ? "default" : "ghost"}
              size="sm"
              onClick={() => setFilter("journal_entry")}
              className={filter === "journal_entry" ? "shadow-md" : ""}
            >
              📔 Journals
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
