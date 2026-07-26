export interface Task {
  id: string;
  column_id: string;
  title: string;
  description: string;
  assignee: string;
  due_date: string | null;
  labels: string[];
  position: number;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  title: string;
  position: number;
  created_at: string;
  tasks: Task[];
}

export interface Board {
  id: string;
  user_id: string;
  title: string;
  theme_color: string | null;
  created_at: string;
  updated_at: string;
  columns?: Column[];
}

export interface BoardMember {
  board_id: string;
  user_id: string;
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  created_at: string;
}

export interface OnlineUser {
  user_id: string;
  email: string;
}
