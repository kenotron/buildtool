import { RunContext } from "../types/RunContext";
import { getInternalDeps } from "../monorepo/internalDeps";
import { getTaskId } from "../task/taskId";
import { TaskDepsGraph, Tasks } from "../types/Task";
import { taskWrapper } from "../task/taskWrapper";
import { computeHash, fetchBackfill, putBackfill } from "./backfill";

export const ComputeHashTask = "??computeHash";
export const CacheFetchTask = "??fetch";
export const CachePutTask = "??put";

export function generatePreCommandTasks(context: RunContext) {
  const { allPackages } = context;
  const taskDepsGraph: TaskDepsGraph = [];
  const tasks: Tasks = new Map();

  for (const [pkg, info] of Object.entries(allPackages)) {
    const dependentPkgs = getInternalDeps(info, allPackages);

    // compute hash task follows topological dependency order
    const computeHashTaskId = getTaskId(pkg, ComputeHashTask);
    for (const depPkg of dependentPkgs) {
      taskDepsGraph.push([
        getTaskId(depPkg, ComputeHashTask),
        computeHashTaskId,
      ]);
    }

    // fetch simply follows the compute hash task
    const fetchTaskId = getTaskId(pkg, CacheFetchTask);
    taskDepsGraph.push([computeHashTaskId, fetchTaskId]);

    tasks.set(computeHashTaskId, () =>
      taskWrapper(computeHashTaskId, computeHash, context)
    );

    tasks.set(fetchTaskId, () =>
      taskWrapper(fetchTaskId, fetchBackfill, context)
    );
  }

  return {
    taskDepsGraph,
    tasks,
  };
}

export function generatePostCommandTasks(context: RunContext) {
  const { allPackages } = context;
  const taskDepsGraph: TaskDepsGraph = [];
  const tasks: Tasks = new Map();

  for (const [pkg, info] of Object.entries(allPackages)) {
    // fetch simply follows the compute hash task
    const putTaskId = getTaskId(pkg, CachePutTask);
    taskDepsGraph.push(["putcache", putTaskId]);

    tasks.set(putTaskId, () => taskWrapper(putTaskId, putBackfill, context));
  }

  tasks.set("putcache", () => Promise.resolve());

  return {
    taskDepsGraph,
    tasks,
  };
}
