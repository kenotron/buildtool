import { TaskId } from "../types/Task";

import { getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";

import {
  ComputeHashTask,
  CacheFetchTask,
  CachePutTask,
} from "../cache/cacheTasks";
import { generateNpmTask } from "./generateNpmTask";
import { computeHash, fetchBackfill, putBackfill } from "../cache/backfill";
import { generateFnTask } from "./generateFnTask";

export function generateTask(taskId: TaskId, context: RunContext) {
  const { tasks } = context;

  if (tasks.has(taskId)) {
    return tasks.get(taskId);
  }

  const [_pkg, task] = getPackageTaskFromId(taskId);

  let taskPromise: Promise<void>;

  switch (task) {
    case ComputeHashTask:
      taskPromise = generateFnTask(taskId, computeHash, context)!;
      break;

    case CacheFetchTask:
      taskPromise = generateFnTask(taskId, fetchBackfill, context)!;
      break;

    case CachePutTask:
      taskPromise = generateFnTask(taskId, putBackfill, context)!;
      break;

    default:
      taskPromise = generateNpmTask(taskId, context)!;
      break;
  }

  tasks.set(taskId, taskPromise);

  return tasks.get(taskId);
}
