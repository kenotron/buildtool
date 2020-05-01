import { TaskDepsGraph, Tasks, TaskId } from "./Task";
import { PackageInfos } from "./PackageInfo";
import Profiler from "@lerna/profiler";
import { PerformanceEntry } from "perf_hooks";

export interface RunContext {
  taskDepsGraph: TaskDepsGraph;
  tasks: Tasks;
  allPackages: PackageInfos;
  command: string;
  concurrency: number;
  packageScope: string[];
  defaultPipeline: { [task: string]: string[] };
  measures: PerformanceEntry[];
  profiler: Profiler;
  taskLogs: Map<TaskId, string[]>;
}
