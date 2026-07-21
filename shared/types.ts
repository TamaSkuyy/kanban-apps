export interface Task {
  id: string;
  column_id: string;
  title: string;
  description: string;
  assignee: string;
  due_date: string | null;
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
  created_at: string;
  updated_at: string;
  columns?: Column[];
}
