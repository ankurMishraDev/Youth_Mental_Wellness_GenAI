import {
  MessageCircle,
  History,
  Settings,
  User,
  Brain,
  HeadphonesIcon,
} from "lucide-react";

export const menuItems = [
  { title: "Active Session", icon: MessageCircle, id: "session" },
  { title: "Chat History", icon: History, id: "history" },
  { title: "Voice Settings", icon: HeadphonesIcon, id: "voice" },
  { title: "AI Preferences", icon: Brain, id: "preferences" },
];

export const accountItems = [
  { title: "Profile", icon: User, id: "profile" },
  { title: "Settings", icon: Settings, id: "settings" },
];
