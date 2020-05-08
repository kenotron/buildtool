import { RunContext } from "../types/RunContext";
import { getPackageTaskFromId, getTaskId } from "./taskId";

import { cacheHits } from "../cache/backfill";
import pGraph from "p-graph";
import { generateCacheTasks } from "../cache/cacheTasks";
import {
  initializePerformance,
  markStart,
  markEnd,
  measure,
  reportSummary,
} from "../performance";

export async function runTasks(context: RunContext) {
  const { command, profiler } = context;

  initializePerformance(context);
  markStart("all");

  console.log(`Executing command "${context.command}"`);

  generateCacheTasks(context);

  await pGraph(context.tasks, context.taskDepsGraph).run((graph) => {
    const taskIds = [...graph.keys()].filter((k) => {
      const [pkg, task] = getPackageTaskFromId(k);
      return (
        task === command &&
        !cacheHits[pkg] &&
        pkg === "@ms/office-online-build-tools"
      );
    });

    return taskIds;
  });

  profiler.output();

  markEnd("all");
  measure("all");

  await reportSummary(context);
}
