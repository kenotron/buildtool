import { RunContext } from "../types/RunContext";
import { getInternalDeps } from "../monorepo/internalDeps";
import { getTaskId } from "../task/taskId";

export function injectCacheTasks(context: RunContext) {
  const { allPackages, taskDepsMap, command } = context;
  // TODO: figure out how to do inproc stuff like computehash, fetch and put without having to resort to hardcoded stuff
  // implied: {computeHash: [^computeHash], fetch: [computeHash], put: [all tasks in tasks]}
  // Phase 0: auto inject computehash & fetch tasks
  for (const [pkg, info] of Object.entries(allPackages)) {
    const dependentPkgs = getInternalDeps(info, allPackages);

    // add _computeHash
    const computeHashTaskId = getTaskId(pkg, "_computeHash");

    for (const depPkg of dependentPkgs) {
      taskDepsMap
        .get(computeHashTaskId)
        ?.push(getTaskId(depPkg, "_computeHash"));
    }

    // add _fetch
    const fetchTaskId = getTaskId(pkg, "_fetch");
    taskDepsMap.set(fetchTaskId, [computeHashTaskId]);

    if (info.scripts && info.scripts[command]) {
      // add _put
      const putTaskId = getTaskId(pkg, "_put");
      taskDepsMap.set(putTaskId, [getTaskId(pkg, command)]);
    }
  }
}
