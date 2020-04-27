import path = require("path");

import { getPackageInfos } from "./monorepo/getPackageInfos";
import PQueue from "p-queue";

import { PackageInfo, PackageInfos } from "./types/PackageInfo";
import { spawn } from "child_process";
import { PerformanceObserver, performance } from "perf_hooks";
import toposort from "toposort";
import Profiler from "@lerna/profiler";
import os from "os";
import { computeHash, fetchBackfill, putBackfill, cacheHits } from "./backfill";

const cwd = process.cwd();

// let's pretend this command is what we're doing
const command = "clean";
const concurrency = (os.cpus().length - 1) * 3;

const allPackages = getPackageInfos(cwd);
const perfEntries: PerformanceMeasure[] = [];

interface TaskStats {
  duration: number;
}

type TaskId = string;
type TaskDeps = TaskId[];
type TaskDepsMap = Map<TaskId, TaskDeps>;
type Tasks = Map<TaskId, Promise<void>>;

const taskGraph: [string, string][] = [];

const tasksDepsMap: TaskDepsMap = new Map();
const tasks: Tasks = new Map();

delete allPackages["office-online-ui"];

const defaultPipeline = {
  clean: [],
  rebuild: ["clean", "build"],
  build: ["^build"],
  ut: ["build"],
};

// TODO: figure out how to do inproc stuff like computehash, fetch and put without having to resort to hardcoded stuff
// implied: {computeHash: [^computeHash], fetch: [computeHash], put: [all tasks in tasks]}
// Phase 0: auto inject computehash & fetch tasks
for (const [pkg, info] of Object.entries(allPackages)) {
  const dependentPkgs = getInternalDeps(info, allPackages);

  // add _computeHash
  const computeHashTaskId = getTaskId(pkg, "_computeHash");
  if (!tasksDepsMap.has(computeHashTaskId)) {
    tasksDepsMap.set(computeHashTaskId, []);
    tasksDepsMap.set(getTaskId(pkg, command), [computeHashTaskId]);
  }

  for (const depPkg of dependentPkgs) {
    tasksDepsMap
      .get(computeHashTaskId)
      ?.push(getTaskId(depPkg, "_computeHash"));
  }

  // add _fetch
  const fetchTaskId = getTaskId(pkg, "_fetch");
  tasksDepsMap.set(fetchTaskId, [computeHashTaskId]);
}

// Phase 1: identify and create a realized task dependency map (discovering)
for (const [pkg, info] of Object.entries(allPackages)) {
  const pipeline = info.pipeline || defaultPipeline;

  for (const [task, taskDeps] of Object.entries(pipeline)) {
    if (info.scripts[task]) {
      const taskId = getTaskId(pkg, task);

      if (!tasksDepsMap.has(taskId)) {
        tasksDepsMap.set(taskId, []);
      }

      for (const taskDep of taskDeps) {
        if (taskDep.startsWith("^")) {
          // add task dep from all the package deps within repo
          const dependentPkgs = getInternalDepsWithTask(
            info,
            task,
            allPackages
          );
          const taskName = taskDep.slice(1);

          for (const depPkg of dependentPkgs) {
            tasksDepsMap.get(taskId)!.push(getTaskId(depPkg, taskName));
          }
        } else if (info.scripts[taskDep]) {
          // add task dep from same package
          tasksDepsMap.get(taskId)!.push(getTaskId(pkg, taskDep));
        }
      }
    }
  }
}

// Phase 1.5: inject puts
for (const [pkg, info] of Object.entries(allPackages)) {
  const pipeline = info.pipeline || defaultPipeline;

  // add _fetch
  const putTaskId = getTaskId(pkg, "_put");
  tasksDepsMap.set(putTaskId, [getTaskId(pkg, command)]);
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

for (const [pkg, info] of Object.entries(allPackages)) {
  taskStack.push(getTaskId(pkg, "_computeHash"));
  // taskStack.push(getTaskId(pkg, "_fetch"));
  // taskStack.push(getTaskId(pkg, "_put"));
}

const visited = new Set<TaskId>();

while (taskStack.length > 0) {
  const taskId = taskStack.pop()!;
  visited.add(taskId);

  const deps = tasksDepsMap.get(taskId);

  if (deps && deps.length > 0) {
    for (const depTaskId of deps!) {
      if (!visited.has(depTaskId)) {
        taskGraph.push([depTaskId, taskId]);
        taskStack.push(depTaskId);
      }
    }
  } else {
    taskGraph.push(["", taskId]);
  }
}

function generateTask(
  taskId: TaskId,
  fn: (info: PackageInfo) => void | Promise<void>
) {
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

          const results = fn(allPackages[pkg]);

          if (results instanceof Promise) {
            results.then(
              () => {
                console.log(`----- Done ${pkg}: ${task} -----`);
                resolve();
              },
              (err) => {
                console.log(`----- FAILED ${pkg}: ${task} -----`);
                console.log(err);
                reject();
              }
            );
          } else {
            console.log(`----- Done ${pkg}: ${task} -----`);
            resolve();
          }
        }),
      (err) => {
        const [pkg, task] = getPackageTaskFromId(taskId);
        console.log(`----- FAILED ${pkg}: ${task} -----`);
      }
    )
  );

  return tasks.get(taskId);
}

function generateNpmTask(taskId: TaskId) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  return generateTask(
    taskId,
    () =>
      new Promise((resolve, reject) => {
        if (cacheHits[pkg]) {
          return resolve();
        }

        const cp = spawn("npm.cmd", ["run", task], {
          // env: { NO_UPDATE_NOTIFIER: "true" },
          cwd: path.dirname(allPackages[pkg].packageJsonPath),
          stdio: "pipe",
        });

        cp.stdout.on("data", (data) => {
          data
            .toString()
            .split(/\n/)
            .forEach((line) => {
              if (line.trim()) {
                process.stdout.write(`${pkg}:${task}: ${line.trim()}\n`);
              }
            });
        });

        cp.stderr.on("data", (data) => {
          data
            .toString()
            .split(/\n/)
            .forEach((line) => {
              if (line.trim()) {
                process.stderr.write(`${pkg}:${task}: ${line.trim()}\n`);
              }
            });
        });

        cp.on("exit", (code) => {
          performance.mark(`end:${taskId}`);

          performance.measure(`${taskId}`, `start:${taskId}`, `end:${taskId}`);

          console.log(`----- Done ${pkg}: ${task} -----`);

          if (code === 0) {
            return resolve();
          }

          reject();
        });
      })
  );
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

function getInternalDeps(info: PackageInfo, allPackagesInfos: PackageInfos) {
  const deps = Object.keys({ ...info.dependencies, ...info.devDependencies });
  return Object.keys(allPackagesInfos).filter((pkg) => deps.includes(pkg));
}

// Phase 2: accept command and stuff graph into p-queue runner

let sortedTaskIds = toposort(taskGraph).filter((id) => id);

const q = new PQueue({ concurrency });

const profiler = new Profiler({
  concurrency,
  outputDirectory: process.cwd(),
});

const obs = new PerformanceObserver((list, observer) => {
  // Pull out all of the measurements.
  list
    .getEntriesByType("measure")
    .forEach((entry) => perfEntries.push(entry as PerformanceMeasure));
});

obs.observe({ entryTypes: ["measure"], buffered: true });

for (const taskId of sortedTaskIds) {
  const [pkg, task] = getPackageTaskFromId(taskId);

  switch (task) {
    case "_computeHash":
      q.add(() => profiler.run(() => generateTask(taskId, computeHash)));
      break;

    case "_fetch":
      q.add(() => profiler.run(() => generateTask(taskId, fetchBackfill)));
      break;

    case "_put":
      q.add(() => profiler.run(() => generateTask(taskId, putBackfill)));
      break;

    default:
      q.add(() => profiler.run(() => generateNpmTask(taskId), taskId));
      break;
  }
}

const start = Date.now();
performance.mark("start");

// Called once. `list` contains three items.
q.onIdle().then(() => {
  profiler.output();

  performance.mark("end");

  performance.measure("build:test", "start", "end");

  console.log(
    perfEntries
      .map((measure) => {
        const [pkg, task] = getPackageTaskFromId(measure.name);
        return `=== ${pkg} - ${task}: ${measure.duration / 1000}s`;
      })
      .join("\n")
  );

  console.log(`${(Date.now() - start) / 1000}s`);
  process.exit(0);
});
