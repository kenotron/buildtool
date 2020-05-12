import { getPackageInfos, findGitRoot } from "workspace-tools";
import { RunContext } from "./types/RunContext";
import { discoverTaskDeps } from "./task/discoverTaskDeps";
import { runTasks } from "./task/taskRunner";
import Profiler from "@lerna/profiler";
import os from "os";
import PQueue from "p-queue/dist";
import { cosmiconfigSync } from "cosmiconfig";
import yargsParser from "yargs-parser";

const parsedArgs = yargsParser(process.argv.slice(2));

const root = findGitRoot(process.cwd());
if (!root) {
  throw new Error("This must be called inside a git-controlled repo");
}
const ConfigModuleName = "lage";
const configResults = cosmiconfigSync(ConfigModuleName).search(
  root || process.cwd()
);

const concurrency = os.cpus().length - 1;
const command = parsedArgs._[0];
const context: RunContext = {
  allPackages: getPackageInfos(root),
  command,
  concurrency,
  defaultPipeline: configResults?.config.pipeline || {
    build: ["^build"],
    clean: [],
  },
  taskDepsGraph: [],
  tasks: new Map(),
  deps: parsedArgs.deps || configResults?.config.deps || false,
  scope: parsedArgs.scope || configResults?.config.scope || [],
  measures: [],
  profiler: new Profiler({
    concurrency,
    outputDirectory: process.cwd(),
  }),
  taskLogs: new Map(),
  queue: new PQueue({ concurrency }),
  taskStats: new Map(),
  cache: false,
  failFast: true,
  nodeArgs: parsedArgs.nodeArgs ? arrifyArgs(parsedArgs.nodeArgs) : [],
  args: getPassThroughArgs(parsedArgs),
};

discoverTaskDeps(context);

runTasks(context);

function arrifyArgs(args: { [key: string]: string | string[] }) {
  const argsArray: string[] = [];
  for (const [key, val] of Object.entries(args)) {
    if (Array.isArray(val)) {
      for (const item of val) {
        pushValue(key, item);
      }
    } else {
      pushValue(key, val);
    }
  }

  return argsArray;

  function pushValue(key: string, value: string) {
    let keyArg = "";

    if (key.length > 1) {
      keyArg = `-${key}`;
    } else {
      keyArg = `--${key}`;
    }

    if (typeof value === "boolean") {
      argsArray.push(key);
    } else {
      argsArray.push(key, value);
    }
  }
}

function getPassThroughArgs(args: { [key: string]: string | string[] }) {
  let result: string[] = [];
  result = result.concat(args._.slice(1));

  let {
    nodeArgs: _nodeArgValues,
    scope: _scopeArg,
    deps: _depsArg,
    _: _positionals,
    ...filtered
  } = args;
  result = result.concat(arrifyArgs(filtered));

  return result;
}
