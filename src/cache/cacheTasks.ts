import { RunContext } from "../types/RunContext";
import { getTaskId, getPackageTaskFromId } from "../task/taskId";
import { TaskDepsGraph, Tasks } from "../types/Task";
import { taskWrapper } from "../task/taskWrapper";
import { putBackfill, fetchBackfill } from "./backfill";
import { generateTask } from "../task/generateTask";

export const ComputeHashTask = "??computeHash";
export const CacheFetchTask = "??fetch";
export const CachePutTask = "??put";

export function generateCacheTasks(context: RunContext) {
  const { tasks, taskDepsGraph } = context;

  for (const taskId of tasks.keys()) {
    const [pkg, task] = getPackageTaskFromId(taskId);

    if (
      task !== CacheFetchTask &&
      task !== CachePutTask &&
      task !== ComputeHashTask &&
      pkg
    ) {
      const hashTaskId = getTaskId(pkg, ComputeHashTask);
      const fetchTaskId = getTaskId(pkg, CacheFetchTask);
      const putTaskId = getTaskId(pkg, CachePutTask);

      // set up the graph
      taskDepsGraph.push([hashTaskId, fetchTaskId]);
      tasks.set(hashTaskId, () => generateTask(hashTaskId, context));

      taskDepsGraph.push([fetchTaskId, taskId]);
      tasks.set(fetchTaskId, () => generateTask(fetchTaskId, context));

      taskDepsGraph.push([taskId, putTaskId]);
      tasks.set(putTaskId, () => generateTask(putTaskId, context));
    }
  }
}
