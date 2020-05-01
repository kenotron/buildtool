import { TaskId } from "../types/Task";
import { PackageInfo } from "../types/PackageInfo";
import { getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { performance } from "perf_hooks";
import { cacheHits } from "../cache/backfill";

export async function taskWrapper(
  taskId: TaskId,
  fn: (info: PackageInfo, context: RunContext) => void | Promise<void>,
  context: RunContext
) {
  const { allPackages, profiler } = context;

  const [pkg, task] = getPackageTaskFromId(taskId);

  performance.mark(`start:${taskId}`);
  console.log(`----- Running ${pkg}: ${task} -----`);

  if (!cacheHits[pkg]) {
    await profiler.run(() => fn(allPackages[pkg], context), taskId);
  }

  console.log(`----- Done ${pkg}: ${task} -----`);
  performance.mark(`end:${taskId}`);
}
