import path = require("path");

import { getPackageInfos } from "./monorepo/getPackageInfos";
import PQueue from "p-queue";

import { PackageInfo, PackageInfos } from "./types/PackageInfo";
import { spawn } from "child_process";

import toposort from "toposort";

const cwd = process.cwd();

const allPackages = getPackageInfos(cwd);

type TaskId = string;
type TaskDeps = TaskId[];
type TaskDepsMap = Map<TaskId, TaskDeps>;
type Tasks = Map<TaskId, Promise<void>>;

const taskGraph: [string, string][] = [];

const tasksDepsMap: TaskDepsMap = new Map();
const tasks: Tasks = new Map();

for (const [pkg, info] of Object.entries(allPackages)) {
  if (info.pipeline) {
    for (const [task, taskDeps] of Object.entries(info.pipeline)) {
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
            taskGraph.push([getTaskId(depPkg, taskName), taskId]);
          }
        } else {
          // add task dep from same package
          tasksDepsMap.get(taskId)!.push(getTaskId(pkg, taskDep));
          taskGraph.push([getTaskId(pkg, taskDep), taskId]);
        }
      }
    }
  }
}

function generateTask(taskId: TaskId) {
  const taskDeps = tasksDepsMap.get(taskId)!;
  const task = () =>
    new Promise((resolve, reject) => {
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
            console.log(`${pkg}:${task}: ${line}`);
          });
      });

      cp.stderr.on("data", (data) => {
        data
          .toString()
          .split(/\n/)
          .forEach((line) => {
            console.log(`${pkg}:${task}: ${line}`);
          });
      });

      cp.on("exit", (code) => {
        console.log(`----- Done ${pkg}: ${task} -----`);
        if (code === 0) {
          return resolve();
        }

        reject();
      });
    });

  return taskDeps
    ? Promise.all(taskDeps.map((d) => tasks.get(d))).then(task)
    : task;
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

const command = "build";

// TODO: need to scope the tasks to the "command" and "packages" potentially

const sortedTaskIds = toposort(taskGraph);

console.log(sortedTaskIds);

const q = new PQueue({ concurrency: 15 });

for (const taskId of sortedTaskIds) {
  q.add(() => generateTask(taskId));
}

q.start();
