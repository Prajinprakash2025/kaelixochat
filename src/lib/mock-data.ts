import { Department, WorkspaceMember, Channel, Message, createReactionsArray } from "@/types";

export const DEPARTMENTS: Department[] = [
  {
    id: "22222222-2222-2222-2222-222222222220",
    name: "All Departments",
    code: "all",
    description: "Company-wide general channels",
    icon: "LayoutGrid",
    color: "bg-indigo-500",
  },
  {
    id: "22222222-2222-2222-2222-222222222221",
    name: "Development",
    code: "dev",
    description: "Code, bug fixes, Next.js, and Supabase",
    icon: "Code2",
    color: "bg-emerald-500",
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    name: "Teaching & Training",
    code: "teaching",
    description: "Batches, study materials & student doubt clearance",
    icon: "GraduationCap",
    color: "bg-amber-500",
  },
  {
    id: "22222222-2222-2222-2222-222222222223",
    name: "Telecalling & Leads",
    code: "telecalling",
    description: "Daily call logs, conversions & customer follow-ups",
    icon: "PhoneCall",
    color: "bg-rose-500",
  },
  {
    id: "22222222-2222-2222-2222-222222222224",
    name: "Management",
    code: "management",
    description: "Company announcements & strategic planning",
    icon: "Briefcase",
    color: "bg-purple-500",
  },
];

export const CURRENT_USER: WorkspaceMember = {
  id: "user-prajin-prakash",
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
    id: "user-arjun-dev",
    name: "Arjun Dev",
    email: "arjun@kaelixo.com",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Arjun",
    role: "manager",
    department: "dev",
    status: "online",
    statusText: "👨‍💻 Reviewing Next.js PR",
  },
  {
    id: "user-aparna-sharma",
    name: "Aparna Sharma",
    email: "aparna@kaelixo.com",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Aparna",
    role: "member",
    department: "teaching",
    status: "away",
    statusText: "📚 Taking Batch 4 Class",
  },
  {
    id: "user-rahul-nair",
    name: "Rahul Nair",
    email: "rahul@kaelixo.com",
    avatar: "https://api.dicebear.com/7.x/bottts/svg?seed=Rahul",
    role: "manager",
    department: "telecalling",
    status: "in_call",
    statusText: "📞 On a customer call",
  },
  {
    id: "user-sneha-patel",
    name: "Sneha Patel",
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
    id: "33333333-3333-3333-3333-333333333331",
    name: "announcements",
    topic: "📢 Company-wide important announcements and milestones",
    departmentCode: "all",
    isPrivate: false,
    unreadCount: 0,
  },
  {
    id: "33333333-3333-3333-3333-333333333332",
    name: "general",
    topic: "💬 Casual chat, tea break talks, and celebrations",
    departmentCode: "all",
    isPrivate: false,
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    name: "dev-sprint",
    topic: "⚡ Tech updates, Next.js architecture, and Supabase migrations",
    departmentCode: "dev",
    isPrivate: false,
    unreadCount: 0,
  },
  {
    id: "33333333-3333-3333-3333-333333333334",
    name: "teaching-hub",
    topic: "📚 Daily class schedules, slide decks, and student doubts",
    departmentCode: "teaching",
    isPrivate: false,
  },
  {
    id: "33333333-3333-3333-3333-333333333335",
    name: "telecalling-leads",
    topic: "🎯 Lead conversion logs, daily calling reports, and targets",
    departmentCode: "telecalling",
    isPrivate: false,
  },
  {
    id: "33333333-3333-3333-3333-333333333336",
    name: "management-sync",
    topic: "🔒 Executive team weekly sync and business operations",
    departmentCode: "management",
    isPrivate: true,
  },
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  "33333333-3333-3333-3333-333333333331": [
    {
      id: "66075f43-db3d-4e7d-8e0c-163892051143",
      channelId: "33333333-3333-3333-3333-333333333331",
      sender: CURRENT_USER,
      content: "👋 Welcome to **Kaelixo**! Our enterprise team workspace is live. Channels are configured for Engineering, Product, Operations, and Sales teams. Feel free to explore threads, attach files, and collaborate in real-time! 🎉",
      createdAt: "10:00 AM",
      reactions: createReactionsArray([
        { emoji: "🚀", count: 4, users: ["user-arjun-dev", "user-aparna-sharma", "user-rahul-nair", "user-sneha-patel"] },
        { emoji: "❤️", count: 3, users: ["user-arjun-dev", "user-sneha-patel", "user-aparna-sharma"] },
      ]),
      threadCount: 2,
      isPinned: true,
    },
  ],
  "33333333-3333-3333-3333-333333333332": [
    {
      id: "msg-gen-1",
      channelId: "33333333-3333-3333-3333-333333333332",
      sender: TEAM_MEMBERS[2],
      content: "Good morning team! Have a great productive day everyone ☕✨",
      createdAt: "10:05 AM",
      reactions: createReactionsArray([{ emoji: "☕", count: 5, users: ["user-prajin-prakash", "user-arjun-dev", "user-rahul-nair"] }]),
    },
    {
      id: "msg-gen-2",
      channelId: "33333333-3333-3333-3333-333333333332",
      sender: TEAM_MEMBERS[1],
      content: "Morning! The Kaelixo UI is looking super clean and fast! ❤️",
      createdAt: "10:08 AM",
      reactions: createReactionsArray([{ emoji: "🙌", count: 3, users: ["user-prajin-prakash", "user-aparna-sharma"] }]),
    },
  ],
  "33333333-3333-3333-3333-333333333333": [
    {
      id: "0a4f29b0-a070-4f46-bc4d-d881fb7aa643",
      channelId: "33333333-3333-3333-3333-333333333333",
      sender: TEAM_MEMBERS[1],
      content: "Next.js 16 + Supabase Realtime setup is live and connected. All messages sync instantly across workspaces.",
      createdAt: "10:12 AM",
      reactions: createReactionsArray([{ emoji: "🔥", count: 2, users: ["user-prajin-prakash"] }]),
      threadCount: 0,
    },
  ],
  "33333333-3333-3333-3333-333333333334": [
    {
      id: "msg-teach-1",
      channelId: "33333333-3333-3333-3333-333333333334",
      sender: TEAM_MEMBERS[2],
      content: "Session notes and slide deck for Q4 Onboarding are uploaded. Please drop any questions or feedback in this thread 📖",
      createdAt: "09:45 AM",
      reactions: createReactionsArray([{ emoji: "👍", count: 4, users: ["user-prajin-prakash", "user-rahul-nair"] }]),
    },
  ],
  "33333333-3333-3333-3333-333333333335": [
    {
      id: "msg-sales-1",
      channelId: "33333333-3333-3333-3333-333333333335",
      sender: TEAM_MEMBERS[4],
      content: "📞 **Morning Outreach Update:**\n- Calls made: 28\n- Interested leads: 7\n- Scheduled demo calls: 3\nFollow-up sheet updated!",
      createdAt: "10:15 AM",
      reactions: createReactionsArray([{ emoji: "🎯", count: 4, users: ["user-prajin-prakash", "user-rahul-nair"] }]),
    },
  ],
  "33333333-3333-3333-3333-333333333336": [
    {
      id: "msg-mgmt-1",
      channelId: "33333333-3333-3333-3333-333333333336",
      sender: CURRENT_USER,
      content: "Internal testing phase is live. All teams please test real-time messaging, threads, attachments, and invite codes! 💼",
      createdAt: "09:30 AM",
      reactions: createReactionsArray([{ emoji: "💼", count: 2, users: ["user-rahul-nair"] }]),
      isPinned: true,
    },
  ],
};
