import { RunContext } from "../types/RunContext";
import { PerformanceObserver, PerformanceEntry, performance } from "perf_hooks";
import { getPackageTaskFromId } from "../task/taskId";

let observer: PerformanceObserver;

export function initializePerformance(context: RunContext) {
  const { measures, profiler, command } = context;

  observer = new PerformanceObserver((list, observer) => {
    // Pull out all of the measurements.
    list
      .getEntriesByType("measure")
      .forEach((entry) => measures.push(entry as PerformanceEntry));
  });

  observer.observe({ entryTypes: ["measure"], buffered: true });
}

export function markStart(marker: string) {
  return performance.mark(`start:${marker}`);
}

export function markEnd(marker: string) {
  return performance.mark(`end:${marker}`);
}

export function measure(marker: string) {
  return performance.measure(marker, `start:${marker}`, `end:${marker}`);
}

export function reportSummary(context: RunContext) {
  const { measures } = context;
  console.log(
    measures
      .map((measure) => {
        const [pkg, task] = getPackageTaskFromId(measure.name);
        return `[${pkg} - ${task}] took ${measure.duration / 1000}s`;
      })
      .join("\n")
  );
}
