import {
  getInternalDepsWithTask,
  getInternalDeps,
} from "../monorepo/internalDeps";
import { getTaskId, getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { TaskId } from "../types/Task";
import { generateTask } from "./generateTask";
import { PackageInfos } from "../types/PackageInfo";
import {
  ComputeHashTask,
  CachePutTask,
  CacheFetchTask,
} from "../cache/cacheTasks";

/**
 * identify and create a realized task dependency map (discovering)
 */
export function discoverTaskDeps(context: RunContext) {
  const { allPackages, defaultPipeline, taskDepsGraph, tasks } = context;

  for (const [pkg, info] of Object.entries(allPackages)) {
    const pipeline = info.pipeline || defaultPipeline;

    for (const [task, taskDeps] of Object.entries(pipeline)) {
      const taskId = getTaskId(pkg, task);
      if (isValidTaskId(taskId, allPackages)) {
        if (taskDeps.length > 0) {
          for (const taskDep of taskDeps) {
            if (taskDep.startsWith("^")) {
              // add task dep from all the package deps within repo
              const dependentPkgs = getInternalDeps(info, allPackages);
              const taskName = taskDep.slice(1);

              for (const depPkg of dependentPkgs) {
                createDep(taskId, getTaskId(depPkg, taskName), context);
              }
            } else {
              // add task dep from same package
              createDep(taskId, getTaskId(pkg, taskDep), context);
            }
          }
        } else {
          taskDepsGraph.push(["", taskId]);
          tasks.set("", () => Promise.resolve());
        }
      }
    }
  }
}

function isValidTaskId(taskId: string, allPackages: PackageInfos) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  return (
    [ComputeHashTask, CachePutTask, CacheFetchTask].includes(task) ||
    Object.keys(allPackages[pkg].scripts || {}).includes(task)
  );
}

function createDep(taskId: TaskId, depTaskId: TaskId, context: RunContext) {
  const { tasks, taskDepsGraph, allPackages, command } = context;

  if (!isValidTaskId(depTaskId, allPackages)) {
    return;
  }

  taskDepsGraph.push([depTaskId, taskId]);
  if (!tasks.get(depTaskId)) {
    tasks.set(depTaskId, () => generateTask(depTaskId, context));
  }

  if (!tasks.get(taskId)) {
    tasks.set(taskId, () => generateTask(taskId, context));
  }
}
