import { TaskId } from "../types/Task";
import { PackageInfo } from "../types/PackageInfo";
import { getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { performance } from "perf_hooks";

export function generateFnTask(
  taskId: TaskId,
  fn: (info: PackageInfo) => void | Promise<void>,
  context: RunContext
) {
  const { allPackages, tasks, taskDepsMap } = context;

  if (tasks.has(taskId)) {
    return tasks.get(taskId);
  }

  const taskDeps = taskDepsMap.get(taskId)!;

  if (taskDeps) {
    console.log(taskDeps.map((d) => tasks.get(d)!));
  }

  return new Promise<void>((resolve, reject) => {
    performance.mark(`start:${taskId}`);
    const [pkg, task] = getPackageTaskFromId(taskId);

    console.log(`----- Running ${pkg}: ${task} -----`);

    const results = fn(allPackages[pkg]);

    if (results instanceof Promise) {
      results.then(
        () => {
          console.log(`----- Done ${pkg}: ${task} -----`);
          performance.mark(`end:${taskId}`);
          performance.measure(`${taskId}`, `start:${taskId}`, `end:${taskId}`);
          resolve();
        },
        (err) => {
          console.log(`----- FAILED ${pkg}: ${task} -----`);
          console.log(err);
          performance.mark(`end:${taskId}`);
          performance.measure(`${taskId}`, `start:${taskId}`, `end:${taskId}`);
          reject();
        }
      );
    } else {
      console.log(`----- Done ${pkg}: ${task} -----`);
      performance.mark(`end:${taskId}`);
      performance.measure(`${taskId}`, `start:${taskId}`, `end:${taskId}`);
      resolve();
    }
  });
}
