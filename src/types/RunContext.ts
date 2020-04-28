import { TaskDepsMap, Tasks, TaskId } from "./Task";
import { PackageInfos } from "./PackageInfo";

export interface RunContext {
  taskDepsMap: TaskDepsMap;
  completedTasks: Set<TaskId>;
  tasks: Tasks;
  allPackages: PackageInfos;
  command: string;
  concurrency: number;
  packageScope: string[];
  defaultPipeline: { [task: string]: string[] };
  measures: PerformanceMeasure[];
}
