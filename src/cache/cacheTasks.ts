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
  const { allPackages, tasks, taskDepsGraph } = context;

  for (const pkg of Object.keys(allPackages)) {
    const hashTaskId = getTaskId(pkg, ComputeHashTask);
    tasks.set(hashTaskId, () => generateTask(hashTaskId, context));

    const fetchTaskId = getTaskId(pkg, CacheFetchTask);
    tasks.set(fetchTaskId, () => generateTask(fetchTaskId, context));

    const putTaskId = getTaskId(pkg, CachePutTask);
    tasks.set(putTaskId, () => generateTask(hashTaskId, context));

    taskDepsGraph.push([hashTaskId, fetchTaskId]);
  }

  for (const taskId of tasks.keys()) {
    const [pkg, task] = getPackageTaskFromId(taskId);

    if (
      task !== CacheFetchTask &&
      task !== CachePutTask &&
      task !== ComputeHashTask
    ) {
      const fetchTaskId = getTaskId(pkg, CacheFetchTask);
      const putTaskId = getTaskId(pkg, CachePutTask);

      // set up the graph
      taskDepsGraph.push([fetchTaskId, taskId]);
      taskDepsGraph.push([taskId, putTaskId]);
    }
  }
}
