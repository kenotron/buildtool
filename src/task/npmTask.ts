import { TaskId } from "../types/Task";
import { getPackageTaskFromId } from "./taskId";
import { generateTask } from "./generateTask";
import { spawn } from "child_process";
import path from "path";

import { cacheHits } from "../cache/backfill";
import { RunContext } from "../types/RunContext";
import { performance } from "perf_hooks";
import { reportTaskLog } from "../reporter/ansiReporter";
import { taskWrapper } from "./taskWrapper";

export function npmTask(taskId: TaskId, context: RunContext) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  const { allPackages } = context;
  return taskWrapper(
    taskId,
    () =>
      new Promise((resolve, reject) => {
        if (cacheHits[pkg]) {
          console.log(`Cache Hit! Skipping: ${pkg} - ${task}`);
          return resolve();
        }

        if (!allPackages[pkg].scripts[task]) {
          console.log(`Empty script detected: ${pkg} - ${task}`);
          return resolve();
        }

        const cp = spawn("npm.cmd", ["run", task], {
          cwd: path.dirname(allPackages[pkg].packageJsonPath),
          stdio: "pipe",
        });

        cp.stdout.on("data", (data) => {
          data
            .toString()
            .split(/\n/)
            .forEach((line) => {
              reportTaskLog(taskId, line, context);
            });
        });

        cp.stderr.on("data", (data) => {
          data
            .toString()
            .split(/\n/)
            .forEach((line) => {
              reportTaskLog(taskId, line, context);
            });
        });

        cp.on("exit", (code) => {
          if (code === 0) {
            return resolve();
          }

          reject();
        });
      }),
    context
  );
}
