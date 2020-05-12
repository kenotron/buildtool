import { TaskId } from "../types/Task";
import { PackageInfo } from "../types/PackageInfo";
import { getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { performance } from "perf_hooks";
import { fetchBackfill, putBackfill, cacheHits } from "../cache/backfill";
import { markStart, markEnd } from "../performance";

export async function taskWrapper(
  taskId: TaskId,
  fn: (info: PackageInfo, context: RunContext) => void | Promise<void>,
  context: RunContext
) {
  const { allPackages, profiler, taskStats } = context;

  const [pkg, _] = getPackageTaskFromId(taskId);

  markStart(taskId);

  if (!cacheHits[taskId]) {
    await profiler.run(() => fn(allPackages[pkg], context), taskId);
    taskStats.set(pkg, {});
  }

  markEnd(taskId);
}
