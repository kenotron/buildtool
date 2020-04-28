import { RunContext } from "../types/RunContext";
import PQueue from "p-queue";
import Profiler from "@lerna/profiler";
import { getPackageTaskFromId } from "./taskId";
import { generateTask } from "./generateTask";
import { generateNpmTask } from "./generateNpmTask";
import { computeHash, fetchBackfill, putBackfill } from "../cache/backfill";
import { performance, PerformanceObserver } from "perf_hooks";
import { getAvailableTasks } from "./getAvailableTasks";

function queueAvailableTasks(q: PQueue, context: RunContext) {
  const tasks = getAvailableTasks(context);

  if (!tasks) {
    return;
  }

  for (const taskId of tasks) {
    q.add(() => {
      return generateTask(taskId, context)!.then(() => {
        context.completedTasks.add(taskId);
        queueAvailableTasks(q, context);
      });
    });
  }
}

export function runTasks(sortedTaskIds: string[], context: RunContext) {
  const { concurrency, measures } = context;

  const q = new PQueue({ concurrency });

  const profiler = new Profiler({
    concurrency,
    outputDirectory: process.cwd(),
  });

  const obs = new PerformanceObserver((list, observer) => {
    // Pull out all of the measurements.
    list
      .getEntriesByType("measure")
      .forEach((entry) => measures.push(entry as PerformanceMeasure));
  });

  obs.observe({ entryTypes: ["measure"], buffered: true });

  const start = Date.now();
  performance.mark("start");

  queueAvailableTasks(q, context);

  // for (const taskId of sortedTaskIds) {
  //   const [pkg, task] = getPackageTaskFromId(taskId);
  //   q.add(() => profiler.run(() => generateTask(taskId, context)));
  // }

  // // Called once. `list` contains three items.
  // q.onIdle().then(() => {
  //   profiler.output();

  //   performance.mark("end");

  //   performance.measure("build:test", "start", "end");

  //   console.log(
  //     measures
  //       .map((measure) => {
  //         const [pkg, task] = getPackageTaskFromId(measure.name);
  //         return `=== ${pkg} - ${task}: ${measure.duration / 1000}s`;
  //       })
  //       .join("\n")
  //   );

  //   console.log(`${(Date.now() - start) / 1000}s`);
  //   process.exit(0);
  // });
}
