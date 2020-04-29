import { TaskDepsMap, Tasks, TaskId } from "./Task";
import { PackageInfos } from "./PackageInfo";
import PQueue from "p-queue";
import Profiler from "@lerna/profiler";
import { PerformanceEntry } from "perf_hooks";

export interface RunContext {
  taskDepsMap: TaskDepsMap;
  tasks: Tasks;
  allPackages: PackageInfos;
  command: string;
  concurrency: number;
  packageScope: string[];
  defaultPipeline: { [task: string]: string[] };
  measures: PerformanceEntry[];
  queue: PQueue;
  profiler: Profiler;
  taskLogs: Map<TaskId, string[]>;
}
