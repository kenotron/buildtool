import { RunContext } from "../types/RunContext";
import { TaskId } from "../types/Task";
import { getPackageTaskFromId, getTaskId } from "./taskId";
import toposort from "toposort";
import {
  ComputeHashTask,
  CacheFetchTask,
  CachePutTask,
} from "../cache/cacheTasks";

/**
 * Using scoped entry points, generate the execution taskGraph (planning)
 * @param context
 */
export function getSortedTaskIds(context: RunContext) {
  const { command, taskDepsMap } = context;

  // start taskStack with entry points (future: add scoped packages as well)
  const taskStack: TaskId[] = [];

  for (const taskId of taskDepsMap.keys()) {
    const [_, taskName] = getPackageTaskFromId(taskId);
    if (taskName === command) {
      taskStack.push(taskId);
    }
  }

  const visited = new Set<TaskId>();
  const taskGraph: [string, string][] = [];

  while (taskStack.length > 0) {
    const taskId = taskStack.pop()!;

    if (!visited.has(taskId)) {
      const deps = taskDepsMap.get(taskId);

      if (deps && deps.length > 0) {
        for (const depTaskId of deps!) {
          taskGraph.push([depTaskId, taskId]);
          taskStack.push(depTaskId);
        }
      } else {
        taskGraph.push(["", taskId]);
      }
      visited.add(taskId);
    }
  }

  return toposort(taskGraph).filter((id) => id);
}
