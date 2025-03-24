export interface Task {
  id: string
  user_id: string
  title: string
  description: string
  due_date: string
  priority: 'low' | 'medium' | 'high'
  status: 'todo' | 'in_progress' | 'done'
  created_at: string
  updated_at: string
}

export interface TaskFormData {
  title: string
  description: string
  due_date: string
  priority: Task['priority']
  status: Task['status']
}

export interface AIAnalysis {
  weekly_summary: string
  next_task_suggestion: string
} 