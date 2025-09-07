import React from "react";
import { Brain, User } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { menuItems, accountItems } from "@/config/sidebar-config";

// Memoized component for rendering menu items to prevent unnecessary re-renders
const SidebarMenuItems = React.memo(
  ({
    items,
    collapsed,
  }: {
    items: { id: string; title: string; icon: React.ElementType }[];
    collapsed: boolean;
  }) => (
    <SidebarMenu>
      {items.map((item) => (
        <SidebarMenuItem key={item.id}>
          <SidebarMenuButton
            className="hover:bg-sidebar-accent/50 transition-colors"
            tooltip={collapsed ? item.title : undefined}
          >
            <item.icon className="h-4 w-4" />
            {!collapsed && <span>{item.title}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
);

// Component for displaying user profile information
const UserProfile = ({
  currentUser,
  collapsed,
}: {
  currentUser?: { uid: string; email: string } | null;
  collapsed: boolean;
}) =>
  !collapsed &&
  currentUser && (
    <div className="p-4 border-t border-glass-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <User className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{currentUser.email}</p>
          <p className="text-xs text-muted-foreground">Active User</p>
        </div>
      </div>
    </div>
  );

interface AppSidebarProps {
  currentUser?: { uid: string; email: string } | null;
}

export function AppSidebar({ currentUser }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  return (
    <Sidebar
      className={`${
        collapsed ? "w-14" : "w-64"
      } glass-card border-r-0 border-glass-border`}
    >
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-accent rounded-lg flex items-center justify-center">
            <Brain className="h-6 w-6 text-white" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-bold text-lg">YouthGuide</h2>
              <p className="text-xs text-muted-foreground">AI Mentor</p>
            </div>
          )}
        </div>
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Mentoring
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenuItems items={menuItems} collapsed={collapsed} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            Account
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenuItems items={accountItems} collapsed={collapsed} />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <UserProfile currentUser={currentUser} collapsed={collapsed} />

      <SidebarTrigger className="absolute -right-4 top-4 glass-subtle border border-glass-border" />
    </Sidebar>
  );
}
