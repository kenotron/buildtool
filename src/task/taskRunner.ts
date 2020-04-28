import { RunContext } from "../types/RunContext";
import { getPackageTaskFromId, getTaskId } from "./taskId";
import { generateTask } from "./generateTask";
import { generateNpmTask } from "./generateNpmTask";
import { computeHash, fetchBackfill, putBackfill } from "../cache/backfill";
import { ComputeHashTask } from "../cache/cacheTasks";
import { PerformanceObserver, PerformanceEntry, performance } from "perf_hooks";
import { TaskId } from "../types/Task";

export async function runTasks(context: RunContext) {
  const { measures, queue, profiler, allPackages, command } = context;

  const obs = new PerformanceObserver((list, observer) => {
    // Pull out all of the measurements.
    list
      .getEntriesByType("measure")
      .forEach((entry) => measures.push(entry as PerformanceEntry));
  });

  obs.observe({ entryTypes: ["measure"], buffered: true });

  const leaves: TaskId[] = [];
  for (const [pkg, info] of Object.entries(allPackages)) {
    if (info.scripts && info.scripts[command]) {
      leaves.push(getTaskId(pkg, command));
    }
  }

  const start = Date.now();
  performance.mark("start");

  await Promise.all(leaves.map((taskId) => executeTask(taskId, context)));

  // Called once. `list` contains three items.
  queue.onIdle().then(() => {
    profiler.output();

    performance.mark("end");

    performance.measure("build:test", "start", "end");

    console.log(
      measures
        .map((measure) => {
          const [pkg, task] = getPackageTaskFromId(measure.name);
          return `=== ${pkg} - ${task}: ${measure.duration / 1000}s`;
        })
        .join("\n")
    );

    console.log(`${(Date.now() - start) / 1000}s`);
    process.exit(0);
  });
}

/**
 * Recursive step to set up promises for all the dependent runs
 * @param taskId
 * @param context
 */
function executeTask(taskId: string, context: RunContext) {
  const { taskDepsMap, tasks } = context;

  if (tasks.has(taskId)) {
    return tasks.get(taskId);
  }

  let taskPromise: Promise<any> = Promise.resolve();

  const deps = taskDepsMap.get(taskId);

  if (deps) {
    taskPromise = taskPromise.then(() =>
      Promise.all(deps.map((depTaskId) => executeTask(depTaskId, context)))
    );
  }

  taskPromise = taskPromise.then(() => createTask(taskId, context));

  tasks.set(taskId, taskPromise);

  return taskPromise;
}

/**
 * Create task wraps the queueing, returns the promise for completion of the task ultimately
 * @param taskId
 * @param context
 */
function createTask(taskId: string, context: RunContext) {
  const { queue, profiler } = context;
  const [pkg, task] = getPackageTaskFromId(taskId);

  switch (task) {
    case ComputeHashTask:
      return generateTask(taskId, computeHash, context);

    case "_fetch":
      return generateTask(taskId, fetchBackfill, context);

    case "_put":
      return generateTask(taskId, putBackfill, context);

    default:
      return generateNpmTask(taskId, context);
  }
}
