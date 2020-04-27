export type TaskId = string;
export type TaskDeps = TaskId[];
export type TaskDepsMap = Map<TaskId, TaskDeps>;
export type Tasks = Map<TaskId, Promise<void>>;
