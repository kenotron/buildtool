import { getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";

import {
  ComputeHashTask,
  CacheFetchTask,
  CachePutTask,
} from "../cache/cacheTasks";
import { computeHash, fetchBackfill, putBackfill } from "../cache/backfill";
import { npmTask } from "./npmTask";
import { taskWrapper } from "./taskWrapper";

/**
 * Create task wraps the queueing, returns the promise for completion of the task ultimately
 * @param taskId
 * @param context
 */
export function generateTask(taskId: string, context: RunContext) {
  const { queue } = context;
  const [_, task] = getPackageTaskFromId(taskId);

  switch (task) {
    case ComputeHashTask:
      return taskWrapper(taskId, computeHash, context);

    case CacheFetchTask:
      return taskWrapper(taskId, fetchBackfill, context);

    case CachePutTask:
      return taskWrapper(taskId, putBackfill, context);

    default:
      return queue.add(npmTask(taskId, context));
  }
}
