import { getPackageInfos, findGitRoot } from "workspace-tools";
import { RunContext } from "./types/RunContext";
import { discoverTaskDeps } from "./task/discoverTaskDeps";
import { runTasks } from "./task/taskRunner";
import Profiler from "@lerna/profiler";
import os from "os";
import PQueue from "p-queue/dist";
import { cosmiconfigSync } from "cosmiconfig";
import yargsParser from "yargs-parser";

const parsedArgs = yargsParser(process.argv);

const root = findGitRoot(process.cwd());
if (!root) {
  throw new Error("This must be called inside a git-controlled repo");
}
const ConfigModuleName = "lage";
const configResults = cosmiconfigSync(ConfigModuleName).search(
  root || process.cwd()
);

const concurrency = os.cpus().length - 1;
const context: RunContext = {
  allPackages: getPackageInfos(root),
  command: parsedArgs._[0],
  concurrency,
  defaultPipeline: configResults?.config.pipeline || {
    build: ["^build"],
    clean: [],
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
  cache: false,
};

discoverTaskDeps(context);
runTasks(context);
