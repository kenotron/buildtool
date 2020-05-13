import { TaskId } from "../types/Task";
import { PackageInfo } from "workspace-tools";
import { getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { cacheHits } from "../cache/backfill";
import { info } from "../logger";
import { isCacheTask } from "../cache/cacheTasks";
import { formatDuration } from "../logger/formatDuration";

export async function taskWrapper(
  taskId: TaskId,
  fn: (info: PackageInfo, context: RunContext) => void | Promise<void>,
  context: RunContext
) {
  const { allPackages, profiler, measures, queue } = context;

  const [pkg, task] = getPackageTaskFromId(taskId);

  if (!cacheHits[pkg]) {
    if (!isCacheTask(task)) {
      info(taskId, "started");
    }

    const start = process.hrtime();

    await profiler.run(() => fn(allPackages[pkg], context), taskId);

    if (!isCacheTask(task)) {
      const duration = process.hrtime(start);

      measures.taskStats.push({
        taskId,
        start,
        duration,
      });

      info(taskId, `ended - took ${formatDuration(duration)}`);
    }
  } else if (!isCacheTask(task)) {
    info(taskId, "skipped");
  }
}
