import { getInternalDepsWithTask } from "../monorepo/internalDeps";
import { getTaskId } from "./taskId";
import { RunContext } from "../types/RunContext";

/**
 * identify and create a realized task dependency map (discovering)
 */
export function discoverTaskDeps(context: RunContext) {
  const { allPackages, defaultPipeline, taskDepsMap } = context;

  for (const [pkg, info] of Object.entries(allPackages)) {
    const pipeline = info.pipeline || defaultPipeline;

    for (const [task, taskDeps] of Object.entries(pipeline)) {
      if (info.scripts[task]) {
        const taskId = getTaskId(pkg, task);

        if (!taskDepsMap.has(taskId)) {
          taskDepsMap.set(taskId, []);
        }

        for (const taskDep of taskDeps) {
          if (taskDep.startsWith("^")) {
            // add task dep from all the package deps within repo
            const dependentPkgs = getInternalDepsWithTask(
              info,
              task,
              allPackages
            );
            const taskName = taskDep.slice(1);

            for (const depPkg of dependentPkgs) {
              taskDepsMap.get(taskId)!.push(getTaskId(depPkg, taskName));
            }
          } else if (info.scripts[taskDep]) {
            // add task dep from same package
            taskDepsMap.get(taskId)!.push(getTaskId(pkg, taskDep));
          }
        }
      }
    }
  }
}
