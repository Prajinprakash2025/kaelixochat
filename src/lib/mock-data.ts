import { Department, WorkspaceMember, Channel, Message, createReactionsArray } from "@/types";

export const DEPARTMENTS: Department[] = [
  {
    id: "dept-all",
    name: "All Departments",
    code: "all",
    description: "Company-wide general channels",
    icon: "LayoutGrid",
    color: "bg-indigo-500",
  },
  {
    id: "dept-dev",
    name: "Development",
    code: "dev",
    description: "Code, bug fixes, Next.js, and Supabase",
    icon: "Code2",
    color: "bg-emerald-500",
  },
  {
    id: "dept-teaching",
    name: "Teaching & Training",
    code: "teaching",
    description: "Batches, study materials & student doubt clearance",
    icon: "GraduationCap",
    color: "bg-amber-500",
  },
  {
    id: "dept-telecalling",
    name: "Telecalling & Leads",
    code: "telecalling",
    description: "Daily call logs, conversions & customer follow-ups",
    icon: "PhoneCall",
    color: "bg-rose-500",
  },
  {
    id: "dept-management",
    name: "Management",
    code: "management",
    description: "Company announcements & strategic planning",
    icon: "Briefcase",
    color: "bg-purple-500",
  },
];

export const CURRENT_USER: WorkspaceMember = {
  id: "user-1",
  name: "Prajin Prakash",
  email: "prajin@kaelixo.com",
  avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Prajin",
  role: "owner",
  department: "management",
  status: "online",
  statusText: "🚀 Building Kaelixo",
};

export const TEAM_MEMBERS: WorkspaceMember[] = [
  CURRENT_USER,
  {
    id: "user-2",
    name: "Arjun (Tech Lead)",
    email: "arjun@kaelixo.com",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Arjun",
    role: "manager",
    department: "dev",
    status: "online",
    statusText: "👨‍💻 Reviewing Next.js PR",
  },
  {
    id: "user-3",
    name: "Aparna (Instructor)",
    email: "aparna@kaelixo.com",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Aparna",
    role: "member",
    department: "teaching",
    status: "away",
    statusText: "📚 Taking Batch 4 Class",
  },
  {
    id: "user-4",
    name: "Rahul (Sales Lead)",
    email: "rahul@kaelixo.com",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Rahul",
    role: "manager",
    department: "telecalling",
    status: "in_call",
    statusText: "📞 On a customer call",
  },
  {
    id: "user-5",
    name: "Sneha (Telecaller)",
    email: "sneha@kaelixo.com",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Sneha",
    role: "member",
    department: "telecalling",
    status: "online",
    statusText: "🎯 45 calls completed today",
  },
];

export const INITIAL_CHANNELS: Channel[] = [
  {
    id: "chan-announcements",
    name: "announcements",
    topic: "📢 Company-wide important announcements and milestones",
    departmentCode: "all",
    isPrivate: false,
    unreadCount: 1,
  },
  {
    id: "chan-general",
    name: "general",
    topic: "💬 Casual chat, tea break talks, and celebrations",
    departmentCode: "all",
    isPrivate: false,
  },
  {
    id: "chan-dev-sprint",
    name: "dev-sprint",
    topic: "⚡ Tech updates, Next.js architecture, and Supabase migrations",
    departmentCode: "dev",
    isPrivate: false,
    unreadCount: 2,
  },
  {
    id: "chan-teaching-hub",
    name: "teaching-hub",
    topic: "📚 Daily class schedules, slide decks, and student doubts",
    departmentCode: "teaching",
    isPrivate: false,
  },
  {
    id: "chan-telecalling-leads",
    name: "telecalling-leads",
    topic: "🎯 Lead conversion logs, daily calling reports, and targets",
    departmentCode: "telecalling",
    isPrivate: false,
    unreadCount: 3,
  },
  {
    id: "chan-management-sync",
    name: "management-sync",
    topic: "🔒 Executive team weekly sync and business operations",
    departmentCode: "management",
    isPrivate: true,
  },
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  "chan-announcements": [
    {
      id: "msg-1",
      channelId: "chan-announcements",
      sender: CURRENT_USER,
      content: "👋 Welcome to **Kaelixo**! Our enterprise team workspace is live. Channels are configured for Engineering, Product, Operations, and Sales teams. Feel free to explore threads, attach files, and collaborate in real-time! 🎉",
      createdAt: "10:00 AM",
      reactions: createReactionsArray([
        { emoji: "🚀", count: 4, users: ["user-2", "user-3", "user-4", "user-5"] },
        { emoji: "❤️", count: 3, users: ["user-2", "user-5", "user-3"] },
      ]),
      threadCount: 2,
      isPinned: true,
    },
  ],
  "chan-general": [
    {
      id: "msg-2",
      channelId: "chan-general",
      sender: TEAM_MEMBERS[2], // Aparna
      content: "Good morning team! Have a great productive day everyone ☕✨",
      createdAt: "10:05 AM",
      reactions: createReactionsArray([{ emoji: "☕", count: 5, users: ["user-1", "user-2", "user-4"] }]),
    },
    {
      id: "msg-3",
      channelId: "chan-general",
      sender: TEAM_MEMBERS[1], // Arjun
      content: "Morning! Kaelixo UI is looking super clean and cute! ❤️",
      createdAt: "10:08 AM",
      reactions: createReactionsArray([{ emoji: "🙌", count: 3, users: ["user-1", "user-3"] }]),
    },
  ],
  "chan-dev-sprint": [
    {
      id: "msg-4",
      channelId: "chan-dev-sprint",
      sender: TEAM_MEMBERS[1], // Arjun
      content: "Next.js 15 App router + Supabase Realtime setup is rock solid. Check the migration script in `supabase/schema.sql` if you need to run RLS policies.",
      createdAt: "10:12 AM",
      reactions: createReactionsArray([{ emoji: "🔥", count: 2, users: ["user-1"] }]),
      threadCount: 1,
    },
  ],
  "chan-teaching-hub": [
    {
      id: "msg-5",
      channelId: "chan-teaching-hub",
      sender: TEAM_MEMBERS[2], // Aparna
      content: "Session notes and slide deck for Q4 Onboarding are uploaded. Please drop any questions or feedback in this thread 📖",
      createdAt: "09:45 AM",
      reactions: createReactionsArray([{ emoji: "👍", count: 4, users: ["user-1", "user-4"] }]),
    },
  ],
  "chan-telecalling-leads": [
    {
      id: "msg-6",
      channelId: "chan-telecalling-leads",
      sender: TEAM_MEMBERS[4], // Sneha
      content: "📞 **Morning Lead Update:**\n- Calls made: 28\n- Interested leads: 7\n- Scheduled demo calls: 3\nFollow-up sheet updated!",
      createdAt: "10:15 AM",
      reactions: createReactionsArray([{ emoji: "🎯", count: 4, users: ["user-1", "user-4"] }]),
    },
  ],
  "chan-management-sync": [
    {
      id: "msg-7",
      channelId: "chan-management-sync",
      sender: CURRENT_USER,
      content: "Internal testing phase starts today. Once our teams approve the daily workflow, we will launch Kaelixo as a SaaS offering for other companies! 💼",
      createdAt: "09:30 AM",
      reactions: createReactionsArray([{ emoji: "💼", count: 2, users: ["user-4"] }]),
      isPinned: true,
    },
  ],
};
