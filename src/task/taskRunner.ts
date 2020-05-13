import { RunContext } from "../types/RunContext";
import { getPackageTaskFromId, getTaskId } from "./taskId";

import { cacheHits } from "../cache/backfill";
import pGraph from "p-graph";
import { generateCacheTasks, CachePutTask } from "../cache/cacheTasks";
import { reportSummary } from "../performance";

export async function runTasks(context: RunContext) {
  const { command, profiler } = context;

  context.measures.start = process.hrtime();

  console.log(`Executing command "${command}"`);

  generateCacheTasks(context);
  try {
    await pGraph(context.tasks, context.taskDepsGraph).run();
  } catch {
    // passthru
  }

  profiler.output();

  context.measures.duration = process.hrtime(context.measures.start);

  await reportSummary(context);
}
