import { getPackageInfos } from "./monorepo/getPackageInfos";
import { RunContext } from "./types/RunContext";
import { discoverTaskDeps } from "./task/discoverTaskDeps";
import { runTasks } from "./task/taskRunner";
import Profiler from "@lerna/profiler";
import os from "os";
import PQueue from "p-queue/dist";

const concurrency = os.cpus().length - 1;

const context: RunContext = {
  allPackages: getPackageInfos(process.cwd()),
  command: "ut",
  concurrency,
  defaultPipeline: {
    clean: [],
    rebuild: ["clean", "build"],
    build: ["^build"],
    ut: ["build"],
  },
  taskDepsGraph: [],
  tasks: new Map(),
  packageScope: [],
  measures: [],
  profiler: new Profiler({
    concurrency,
    outputDirectory: process.cwd(),
  }),
  taskLogs: new Map(),
  queue: new PQueue({ concurrency }),
  taskStats: new Map(),
  cache: true,
};

discoverTaskDeps(context);

runTasks(context);
