import { RunContext } from "../types/RunContext";
import { getPackageTaskFromId, getTaskId } from "./taskId";

import { cacheHits } from "../cache/backfill";
import pGraph from "p-graph";
import { generateCacheTasks, CachePutTask } from "../cache/cacheTasks";
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

  console.log(`Executing command "${command}"`);

  generateCacheTasks(context);

  // console.dir({
  //   tasks: context.tasks,
  //   taskDepsGraph: context.taskDepsGraph,
  // });

  await pGraph(context.tasks, context.taskDepsGraph).run();

  profiler.output();

  markEnd("all");
  measure("all");

  await reportSummary(context);
}
