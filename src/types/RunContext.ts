import { TaskDepsGraph, Tasks, TaskId } from "./Task";
import { PackageInfos } from "./PackageInfo";
import Profiler from "@lerna/profiler";
import { PerformanceEntry } from "perf_hooks";
import PQueue from "p-queue";

interface TaskStats {}

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
  queue: PQueue;
  taskStats: Map<TaskId, TaskStats>;
  cache: boolean;
}
