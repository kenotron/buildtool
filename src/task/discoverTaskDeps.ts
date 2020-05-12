import {
  getScopedPackages,
  getTransitiveDependencies,
  PackageInfos,
  getDependentMap,
} from "workspace-tools";
import { getTaskId, getPackageTaskFromId } from "./taskId";
import { RunContext } from "../types/RunContext";
import { TaskId } from "../types/Task";
import { generateTask } from "./generateTask";
import path from "path";
import {
  ComputeHashTask,
  CachePutTask,
  CacheFetchTask,
} from "../cache/cacheTasks";
import { cosmiconfigSync } from "cosmiconfig";

const ConfigModuleName = "lage";

function filterPackages(context: RunContext) {
  const { allPackages, scope: scopes, deps: withDeps } = context;

  let scopedPackages =
    scopes && scopes.length > 0
      ? getScopedPackages(scopes, allPackages)
      : Object.keys(allPackages);

  if (withDeps) {
    scopedPackages = scopedPackages.concat(
      getTransitiveDependencies(scopedPackages, allPackages)
    );
  }

  return scopedPackages;
}

function getPipeline(pkg: string, context: RunContext) {
  const { allPackages, defaultPipeline } = context;

  const info = allPackages[pkg];

  const results = cosmiconfigSync(ConfigModuleName).search(
    path.dirname(info.packageJsonPath)
  );

  let pipeline = defaultPipeline;

  if (results && results.config) {
    pipeline = results.config.pipeline;
  }

  return pipeline;
}

/**
 * identify and create a realized task dependency map (discovering)
 */
export function discoverTaskDeps(context: RunContext) {
  const { allPackages } = context;

  const filteredPackages = filterPackages(context);
  console.log(`Packages in scope: ${filteredPackages.join(",")}`);

  // initialize a queue for a breadth first approach
  const traversalQueue = filteredPackages;
  const visited = new Set<string>();
  const dependentMap = getDependentMap(allPackages);

  while (traversalQueue.length > 0) {
    const pkg = traversalQueue.shift()!;

    if (!visited.has(pkg)) {
      visited.add(pkg);

      // get pipeline
      const pipeline = getPipeline(pkg, context);

      // establish task graph; push dependents in the traversal queue
      for (const [task, taskDeps] of Object.entries(pipeline)) {
        const taskId = getTaskId(pkg, task);

        if (isValidTaskId(taskId, allPackages)) {
          if (taskDeps.length > 0) {
            for (const taskDep of taskDeps) {
              // add task dep from all the package deps within repo
              const dependentPkgs = dependentMap.get(pkg);

              if (taskDep.startsWith("^") && dependentPkgs !== undefined) {
                // add task dep from all the package deps within repo
                const dependentPkgs = dependentMap.get(pkg);
                const taskName = taskDep.slice(1);

                for (const depPkg of dependentPkgs!) {
                  createDep(taskId, getTaskId(depPkg, taskName), context);
                }

                // now push the dependents in the traversal queue
                traversalQueue.push(pkg);
              } else {
                // add task dep from same package
                createDep(taskId, getTaskId(pkg, taskDep), context);
              }
            }
          } else {
            createDep(taskId, "", context);
          }
        }
      }
    }
  }
}

function isValidTaskId(taskId: string, allPackages: PackageInfos) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  return (
    taskId === "" ||
    [ComputeHashTask, CachePutTask, CacheFetchTask].includes(task) ||
    Object.keys(allPackages[pkg].scripts || {}).includes(task)
  );
}

function createDep(taskId: TaskId, depTaskId: TaskId, context: RunContext) {
  const { tasks, taskDepsGraph, allPackages } = context;

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
