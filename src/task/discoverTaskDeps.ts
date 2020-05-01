import { getInternalDepsWithTask } from "../monorepo/internalDeps";
import { getTaskId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { TaskId } from "../types/Task";
import { generateTask } from "./generateTask";

/**
 * identify and create a realized task dependency map (discovering)
 */
export function discoverTaskDeps(context: RunContext) {
  const { allPackages, defaultPipeline, taskDepsGraph, tasks } = context;

  for (const [pkg, info] of Object.entries(allPackages)) {
    const pipeline = info.pipeline || defaultPipeline;

    for (const [task, taskDeps] of Object.entries(pipeline)) {
      if (info.scripts[task]) {
        const taskId = getTaskId(pkg, task);
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
              createDep(taskId, getTaskId(depPkg, taskName), context);
            }
          } else if (info.scripts[taskDep]) {
            // add task dep from same package
            createDep(taskId, getTaskId(pkg, taskDep), context);
          }
        }
      }
    }
  }
}

function createDep(taskId: TaskId, depTaskId: TaskId, context: RunContext) {
  const { tasks, taskDepsGraph } = context;

  taskDepsGraph.push([depTaskId, taskId]);
  if (!tasks.get(depTaskId)) {
    tasks.set(depTaskId, () => generateTask(depTaskId, context));
  }

  if (!tasks.get(taskId)) {
    tasks.set(taskId, () => generateTask(taskId, context));
  }
}
