import { RunContext } from "../types/RunContext";
import { getInternalDeps } from "../monorepo/internalDeps";
import { getTaskId } from "../task/taskId";

export const ComputeHashTask = "??computeHash";
export const CacheFetchTask = "??fetch";
export const CachePutTask = "??put";

export function injectCacheTaskDepsMap(context: RunContext) {
  const { allPackages, taskDepsMap, command } = context;
  // TODO: figure out how to do inproc stuff like computehash, fetch and put without having to resort to hardcoded stuff
  // implied: {computeHash: [^computeHash], fetch: [computeHash], put: [all tasks in tasks]}
  for (const [pkg, info] of Object.entries(allPackages)) {
    const dependentPkgs = getInternalDeps(info, allPackages);

    // add _computeHash
    const computeHashTaskId = getTaskId(pkg, ComputeHashTask);

    for (const depPkg of dependentPkgs) {
      taskDepsMap
        .get(computeHashTaskId)
        ?.push(getTaskId(depPkg, ComputeHashTask));
    }

    // add _fetch
    const fetchTaskId = getTaskId(pkg, CacheFetchTask);
    taskDepsMap.set(fetchTaskId, [computeHashTaskId]);

    if (info.scripts && info.scripts[command]) {
      // add _put
      const putTaskId = getTaskId(pkg, CachePutTask);
      taskDepsMap.set(putTaskId, [getTaskId(pkg, command)]);
    }
  }
}

export function getCacheTaskIds(context: RunContext) {
  const { allPackages } = context;
  const cacheTasks: string[] = [];
  for (const pkg of Object.keys(allPackages)) {
    cacheTasks.push(getTaskId(pkg, ComputeHashTask));
    cacheTasks.push(getTaskId(pkg, CacheFetchTask));
    cacheTasks.push(getTaskId(pkg, CachePutTask));
  }
  return cacheTasks;
}
