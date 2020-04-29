import { TaskId } from "../types/Task";
import { PackageInfo } from "../types/PackageInfo";
import { getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { performance } from "perf_hooks";

export async function generateTask(
  taskId: TaskId,
  fn: (info: PackageInfo) => void | Promise<void>,
  context: RunContext
) {
  const { allPackages, queue, profiler } = context;

  const [pkg, task] = getPackageTaskFromId(taskId);

  await queue.add(async () => {
    performance.mark(`start:${taskId}`);
    //console.log(`----- Running ${pkg}: ${task} -----`);

    await profiler.run(() => fn(allPackages[pkg]), taskId);

    //console.log(`----- Done ${pkg}: ${task} -----`);
    performance.mark(`end:${taskId}`);
  });
}
