import { RunContext } from "../types/RunContext";
import PQueue from "p-queue";
import Profiler from "@lerna/profiler";
import { getPackageTaskFromId } from "./taskId";
import { generateTask } from "./generateTask";
import { generateNpmTask } from "./generateNpmTask";
import { computeHash, fetchBackfill, putBackfill } from "../cache/backfill";

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

  for (const taskId of sortedTaskIds) {
    const [pkg, task] = getPackageTaskFromId(taskId);

    switch (task) {
      case "_computeHash":
        q.add(() =>
          profiler.run(() => generateTask(taskId, computeHash, context))
        );
        break;

      case "_fetch":
        q.add(() =>
          profiler.run(() => generateTask(taskId, fetchBackfill, context))
        );
        break;

      case "_put":
        q.add(() =>
          profiler.run(() => generateTask(taskId, putBackfill, context))
        );
        break;

      default:
        q.add(() =>
          profiler.run(() => generateNpmTask(taskId, context), taskId)
        );
        break;
    }
  }

  const start = Date.now();
  performance.mark("start");

  // Called once. `list` contains three items.
  q.onIdle().then(() => {
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
