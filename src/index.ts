import os from "os";
import { getPackageInfos } from "./monorepo/getPackageInfos";
// import { injectCacheTaskDepsMap, getCacheTaskIds } from "./cache/cacheTasks";
import { RunContext } from "./types/RunContext";
import { discoverTaskDeps } from "./task/discoverTaskDeps";
import { runTasks } from "./task/taskRunner";
import PQueue from "p-queue";
import Profiler from "@lerna/profiler";

const concurrency = os.cpus().length - 1;

const context: RunContext = {
  allPackages: getPackageInfos(process.cwd()),
  command: "build",
  concurrency,
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
  queue: new PQueue({ concurrency }),
  profiler: new Profiler({
    concurrency,
    outputDirectory: process.cwd(),
  }),
};

// injectCacheTaskDepsMap(context);
discoverTaskDeps(context);

runTasks(context);
