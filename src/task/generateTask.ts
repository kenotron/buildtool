import { TaskId } from "../types/Task";
import { PackageInfo } from "../types/PackageInfo";
import { getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";

export function generateTask(
  taskId: TaskId,
  fn: (info: PackageInfo) => void | Promise<void>,
  context: RunContext
) {
  const { allPackages, tasks, taskDepsMap } = context;
  const taskDeps = taskDepsMap.get(taskId)!;
  const prereqPromise: Promise<void | void[]> = taskDeps
    ? Promise.all(taskDeps.map((d) => tasks.get(d)!))
    : Promise.resolve();

  tasks.set(
    taskId,
    prereqPromise.then(
      (_: any) =>
        new Promise<void>((resolve, reject) => {
          performance.mark(`start:${taskId}`);
          const [pkg, task] = getPackageTaskFromId(taskId);

          console.log(`----- Running ${pkg}: ${task} -----`);

          const results = fn(allPackages[pkg]);

          if (results instanceof Promise) {
            results.then(
              () => {
                console.log(`----- Done ${pkg}: ${task} -----`);
                resolve();
              },
              (err) => {
                console.log(`----- FAILED ${pkg}: ${task} -----`);
                console.log(err);
                reject();
              }
            );
          } else {
            console.log(`----- Done ${pkg}: ${task} -----`);
            resolve();
          }
        }),
      (err) => {
        const [pkg, task] = getPackageTaskFromId(taskId);
        console.log(`----- FAILED ${pkg}: ${task} -----`);
      }
    )
  );

  return tasks.get(taskId);
}
