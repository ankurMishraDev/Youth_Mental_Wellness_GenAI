import { User } from "../lib/types";

interface DashboardHeaderProps {
  title: string;
  description?: string;
  currentUser: User | null;
}

const getHeaderDetails = (pathname: string, name: string) => {
  if (pathname.includes('/sessions')) {
    return {
      title: "AI Guide Session",
      description: "Connect with your AI mentor for personalized support and guidance.",
    };
  }
  if (pathname.includes('/resources')) {
    return {
      title: "Wellness Resources",
      description: "Explore exercises and tips to support your mental well-being.",
    };
  }
  if (pathname.includes('/profile')) {
    return {
      title: "Profile Settings",
      description: "Manage your personal information.",
    };
  }
  if (pathname.includes('/journal')) {
    return {
      title: "Journal",
      description: "Reflect on your thoughts and feelings.",
    };
  }
  // Default to home
  return {
    title: `Welcome back, ${name}`,
    description: "Here's your wellness overview.",
  };
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title,
  description,
  currentUser,
}) => {
  return (
    <header className="flex justify-between items-center mb-8 md:mt-0 mt-12">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {title}
        </h1>
        {description && (
          <p className="text-lg text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </header>
  );
};
