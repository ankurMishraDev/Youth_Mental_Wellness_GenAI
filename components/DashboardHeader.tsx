import { User, DashboardPage } from "../lib/types";

interface DashboardHeaderProps {
  title?: string;
  description?: string;
  currentUser: User | null;
  currentUserName?: string;
  dashboardPage?: DashboardPage;
}

const getHeaderDetails = (dashboardPage: DashboardPage | undefined, name: string) => {
  if (dashboardPage === 'sessions') {
    return {
      title: "AI Guide Session",
      description: "Connect with your AI mentor for personalized support and guidance.",
    };
  }
  if (dashboardPage === 'resources') {
    return {
      title: "Wellness Resources",
      description: "Explore exercises and tips to support your mental well-being.",
    };
  }
  if (dashboardPage === 'profile') {
    return {
      title: "Profile Settings",
      description: "Manage your personal information.",
    };
  }
  if (dashboardPage === 'journal') {
    return {
      title: "Journal",
      description: "Reflect on your thoughts and feelings.",
    };
  }
  if (dashboardPage === 'analytics') {
    return {
      title: "",
      description: "",
    };
  }
  // Default to home
  return {
    title: `Welcome back, ${name}`,
    description: "Here's your wellness overview.",
  };
};

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  title: propTitle,
  description: propDescription,
  currentUser,
  currentUserName,
  dashboardPage,
}) => {
  const headerDetails = getHeaderDetails(dashboardPage, currentUserName || currentUser?.name || 'User');
  const title = propTitle || headerDetails.title;
  const description = propDescription !== undefined ? propDescription : headerDetails.description;
  return (
    <header className="flex justify-between items-center mb-2 pl-16 lg:pl-0">
      <div>
        <h1 className="text-2xl font-bold text-orange-800 dark:text-orange-200">
          {title}
        </h1>
        {description && (
          <p className="text-md text-orange-700/80 dark:text-orange-300/80">
            {description}
          </p>
        )}
      </div>
    </header>
  );
};
