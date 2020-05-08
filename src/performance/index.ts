import { RunContext } from "../types/RunContext";
import { PerformanceObserver, PerformanceEntry, performance } from "perf_hooks";
import { getPackageTaskFromId } from "../task/taskId";

let observer: PerformanceObserver;
let reportSummaryPromise: Promise<PerformanceEntry[]>;

export function initializePerformance(context: RunContext) {
  const { measures } = context;

  reportSummaryPromise = new Promise((resolve, reject) => {
    observer = new PerformanceObserver((list, observer) => {
      // Pull out all of the measurements.
      list.getEntriesByType("measure").forEach((entry) => {
        measures.push(entry as PerformanceEntry);

        if (entry.name === "measure:all") {
          resolve(measures);
        }
      });
    });

    observer.observe({ entryTypes: ["measure"], buffered: true });
  });
}

export function markStart(marker: string) {
  return performance.mark(`start:${marker}`);
}

export function markEnd(marker: string) {
  return performance.mark(`end:${marker}`);
}

export function measure(marker: string) {
  return performance.measure(
    `measure:${marker}`,
    `start:${marker}`,
    `end:${marker}`
  );
}

export async function reportSummary(context: RunContext) {
  const { command } = context;
  const measures = await reportSummaryPromise;
  console.log(
    measures
      .map((measure) => {
        const tag = measure.name.replace(/^measure:/, "");

        if (tag === "all") {
          return `The command "${command}" took ${(
            measure.duration / 1000
          ).toFixed(2)}s`;
        } else {
          const [pkg, task] = getPackageTaskFromId(tag);
          return `[${pkg}${task ? ` - ${task}` : ""}] took ${(
            measure.duration / 1000
          ).toFixed(2)}s`;
        }
      })
      .join("\n")
  );
}
