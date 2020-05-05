import { RunContext } from "../types/RunContext";
import { getPackageTaskFromId } from "./taskId";
import { PerformanceObserver, PerformanceEntry, performance } from "perf_hooks";

import { cacheHits } from "../cache/backfill";
import pGraph from "p-graph";
import PQueue from "p-queue";

export async function runTasks(context: RunContext) {
  const { measures, profiler, command } = context;

  const obs = new PerformanceObserver((list, observer) => {
    // Pull out all of the measurements.
    list
      .getEntriesByType("measure")
      .forEach((entry) => measures.push(entry as PerformanceEntry));
  });

  obs.observe({ entryTypes: ["measure"], buffered: true });

  const start = Date.now();
  performance.mark("start");

  console.log(`Executing ${context.command}`);

  await pGraph(context.tasks, context.taskDepsGraph).run((graph) => {
    const taskIds = [...graph.keys()].filter((k) => {
      const [pkg, task] = getPackageTaskFromId(k);
      return task === command && !cacheHits[pkg];
    });

    return taskIds;
  });

  console.log("Finished ");

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
}
