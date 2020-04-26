import path = require("path");

import { getPackageInfos } from "./monorepo/getPackageInfos";
import PQueue from "p-queue";

import { PackageInfo, PackageInfos } from "./types/PackageInfo";
import { spawn } from "child_process";
import { PerformanceObserver, performance } from "perf_hooks";
import toposort from "toposort";
import Profiler from "@lerna/profiler";

const cwd = process.cwd();

// let's pretend this command is what we're doing
const command = "test";

const allPackages = getPackageInfos(cwd);

interface TaskStats {
  duration: number;
}

type TaskId = string;
type TaskDeps = TaskId[];
type TaskDepsMap = Map<TaskId, TaskDeps>;
type Tasks = Map<TaskId, Promise<void>>;
type TaskStatsMap = Map<TaskId, TaskStats>;

const taskGraph: [string, string][] = [];

const tasksDepsMap: TaskDepsMap = new Map();
const tasks: Tasks = new Map();

delete allPackages["office-online-ui"];

const defaultPipeline = {
  build: ["^build"],
  test: ["build"],
};

// Phase 1: identify and create a realized task dependency map (discovering)
for (const [pkg, info] of Object.entries(allPackages)) {
  const pipeline = info.pipeline || defaultPipeline;

  for (const [task, taskDeps] of Object.entries(pipeline)) {
    const taskId = getTaskId(pkg, task);

    if (!tasksDepsMap.has(taskId)) {
      tasksDepsMap.set(taskId, []);
    }

    for (const taskDep of taskDeps) {
      if (taskDep.startsWith("^")) {
        // add task dep from all the package deps within repo
        const dependentPkgs = getInternalDepsWithTask(info, task, allPackages);
        const taskName = taskDep.slice(1);

        for (const depPkg of dependentPkgs) {
          tasksDepsMap.get(taskId)!.push(getTaskId(depPkg, taskName));
        }
      } else {
        // add task dep from same package
        tasksDepsMap.get(taskId)!.push(getTaskId(pkg, taskDep));
      }
    }
  }
}

// Phase 2: using scoped entry points, generate the execution taskGraph (planning)

// start taskStack with entry points (future: add scoped packages as well)
const taskStack: TaskId[] = [];
for (const taskId of tasksDepsMap.keys()) {
  const [_, taskName] = getPackageTaskFromId(taskId);
  if (taskName === command) {
    taskStack.push(taskId);
  }
}

const visited = new Set<TaskId>();

while (taskStack.length > 0) {
  const taskId = taskStack.pop()!;
  visited.add(taskId);

  const deps = tasksDepsMap.get(taskId);
  if (deps) {
    for (const depTaskId of deps!) {
      if (!visited.has(depTaskId)) {
        taskGraph.push([depTaskId, taskId]);
        taskStack.push(depTaskId);
      }
    }
  }
}

function generateTask(taskId: TaskId) {
  const taskDeps = tasksDepsMap.get(taskId)!;

  const prereqPromise: Promise<void | void[]> = taskDeps
    ? Promise.all(taskDeps.map((d) => tasks.get(d)!))
    : Promise.resolve();

  tasks.set(
    taskId,
    prereqPromise.then(
      (_: any) =>
        new Promise<void>((resolve, reject) => {
          performance.mark(`start:${taskId}`);
          const [pkg, task] = getPackageTaskFromId(taskId);

          console.log(`----- Running ${pkg}: ${task} -----`);

          const cp = spawn("npm.cmd", ["run", task], {
            cwd: path.dirname(allPackages[pkg].packageJsonPath),
            stdio: "pipe",
          });

          cp.stdout.on("data", (data) => {
            data
              .toString()
              .split(/\n/)
              .forEach((line) => {
                process.stdout.write(`${pkg}:${task}: ${line.trim()}\n`);
              });
          });

          cp.stderr.on("data", (data) => {
            data
              .toString()
              .split(/\n/)
              .forEach((line) => {
                process.stderr.write(`${pkg}:${task}: ${line.trim()}\n`);
              });
          });

          cp.on("exit", (code) => {
            performance.mark(`end:${taskId}`);

            performance.measure(
              `measure duration: ${taskId}`,
              `start:${taskId}`,
              `end:${taskId}`
            );

            console.log(`----- Done ${pkg}: ${task} -----`);

            if (code === 0) {
              return resolve();
            }

            reject();
          });
        })
    )
  );

  return tasks.get(taskId);
}

function getTaskId(pkg: string, task: string) {
  return `${pkg}###${task}`;
}

function getPackageTaskFromId(id: string) {
  return id.split("###");
}

function getInternalDepsWithTask(
  info: PackageInfo,
  task: string,
  allPackagesInfos: PackageInfos
) {
  const deps = Object.keys({ ...info.dependencies, ...info.devDependencies });
  return Object.keys(allPackagesInfos).filter(
    (pkg) => deps.includes(pkg) && allPackagesInfos[pkg].scripts[task]
  );
}

// Phase 2: accept command and stuff graph into p-queue runner

let sortedTaskIds = toposort(taskGraph);

const q = new PQueue({ concurrency: 11 });

const profiler = new Profiler({
  concurrency: 11,
  outputDirectory: __dirname,
});

for (const taskId of sortedTaskIds) {
  q.add(() => profiler.run(() => generateTask(taskId), taskId));
}

const start = Date.now();
performance.mark("start");

const obs = new PerformanceObserver((list, observer) => {
  // Called once. `list` contains three items.
  q.onIdle().then(() => {
    profiler.output();

    console.log("output profiler");

    performance.mark("end");
    performance.measure("build:test", "start", "end");

    // Pull out all the measurements of marks
    console.log(list.getEntriesByType("mark"));

    // Pull out all of the measurements.
    console.log(list.getEntriesByType("measure"));

    console.log(Date.now() - start);
    process.exit(0);
  });
});
obs.observe({ entryTypes: ["mark", "measure"], buffered: true });
