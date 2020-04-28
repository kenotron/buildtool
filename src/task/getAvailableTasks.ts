import { RunContext } from "../types/RunContext";

export function getAvailableTasks(context: RunContext) {
  const { taskDepsMap, completedTasks } = context;

  // Choose a taskId that has not been completed
  const candidates = [...taskDepsMap.keys()].filter(
    (taskId) => !completedTasks.has(taskId)
  );

  // Check its dependencies to make sure it is satisfied
  return candidates.filter((taskId) => {
    const depTaskIds = taskDepsMap.get(taskId);

    if (!depTaskIds) {
      return true;
    }

    return depTaskIds.every((depTaskId) => completedTasks.has(depTaskId));
  });
}
