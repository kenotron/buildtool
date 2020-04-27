import os from "os";
import { getPackageInfos } from "./monorepo/getPackageInfos";
import { injectCacheTasks } from "./cache/injectCacheTasks";
import { RunContext } from "./types/RunContext";
import { discoverTaskDeps } from "./task/discoverTaskDeps";
import { getSortedTaskIds } from "./task/getSortedTaskIds";
import { runTasks } from "./task/taskRunner";

const context: RunContext = {
  allPackages: getPackageInfos(process.cwd()),
  command: "bulid",
  concurrency: os.cpus().length - 1,
  defaultPipeline: {
    clean: [],
    rebuild: ["clean", "build"],
    build: ["^build"],
    ut: ["build"],
  },
  taskDepsMap: new Map(),
  tasks: new Map(),
  packageScope: [],
  measures: [],
};

injectCacheTasks(context);
discoverTaskDeps(context);
const sortedTaskIds = getSortedTaskIds(context);

runTasks(sortedTaskIds, context);
