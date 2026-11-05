export type DepartmentCode = string;

export interface Department {
  id: string;
  organization_id?: string;
  name: string;
  code: DepartmentCode;
  description: string;
  icon: string;
  color: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  plan?: string;
  invite_code?: string;
}

export interface WorkspaceMember {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: "owner" | "admin" | "manager" | "member";
  department: DepartmentCode;
  status: "online" | "away" | "offline" | "in_call";
  statusText?: string;
}

export interface Channel {
  id: string;
  name: string;
  topic?: string;
  departmentId?: string;
  departmentCode?: DepartmentCode;
  isPrivate: boolean;
  unreadCount?: number;
  isDm?: boolean;
  recipientId?: string;
  recipientName?: string;
  recipientAvatar?: string;
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[]; // member ids
}

export interface MessageAttachment {
  name: string;
  url: string;
  size: string;
  type: "image" | "file" | "code";
}

export interface Message {
  id: string;
  channelId: string;
  sender: WorkspaceMember;
  content: string;
  createdAt: string;
  reactions: MessageReaction[];
  attachments?: MessageAttachment[];
  threadCount?: number;
  isPinned?: boolean;
}
