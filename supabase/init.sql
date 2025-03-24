-- Create the tasks table
create table public.tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  title text not null,
  description text,
  due_date date not null,
  priority text not null check (priority in ('low', 'medium', 'high')),
  status text not null check (status in ('todo', 'in_progress', 'done')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.tasks enable row level security;

-- Create policy to allow users to select only their own tasks
create policy "Users can view their own tasks"
  on public.tasks
  for select
  using (auth.uid() = user_id);

-- Create policy to allow users to insert their own tasks
create policy "Users can insert their own tasks"
  on public.tasks
  for insert
  with check (auth.uid() = user_id);

-- Create policy to allow users to update their own tasks
create policy "Users can update their own tasks"
  on public.tasks
  for update
  using (auth.uid() = user_id);

-- Create policy to allow users to delete their own tasks
create policy "Users can delete their own tasks"
  on public.tasks
  for delete
  using (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Create trigger to automatically update updated_at timestamp
create trigger handle_tasks_updated_at
  before update on public.tasks
  for each row
  execute function public.handle_updated_at(); 