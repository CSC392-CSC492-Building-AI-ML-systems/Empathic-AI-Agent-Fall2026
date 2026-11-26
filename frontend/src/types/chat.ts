export type Sender = 'sam' | (string & {});

export type ActiveTab = 'login' | 'signup' | 'chat' | 'pastChats' | 'settings';

export type Theme = 'light' | 'dark';

export type Mood = 'great' | 'good' | 'alright' | 'terrible';

export type SidebarTab = 'login' | 'settings' | 'pastChats' | 'chat_new' | 'chat_active';

export type LoginStatus =
  | '' | 'name' | 'confirmName' | 'email' | 'confirmEmail'
  | 'password' | 'confirmPassword' | 'awaitingVerification' | 'done';

export type LoginOrSignup = '' | 'login' | 'signup';

export interface ChatMessage {
  id: string | number;
  sender: Sender;
  text: string;
  timestamp?: string;
}

export interface ChatSession {
  session_id: string;
  session_name: string;
  created_at?: string;
}

// what the backend returns for a past chat
export interface BackendHistoryItem {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface MenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
  hint?: string;
}