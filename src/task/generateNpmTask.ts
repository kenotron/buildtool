import { TaskId } from "../types/Task";
import { getPackageTaskFromId } from "./taskId";
import { generateTask } from "./generateTask";
import { spawn } from "child_process";
import path from "path";

import { cacheHits } from "../cache/backfill";
import { RunContext } from "../types/RunContext";
import { performance } from "perf_hooks";
import { reportTaskLog } from "../reporter/ansiReporter";

export function generateNpmTask(taskId: TaskId, context: RunContext) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  const { allPackages } = context;
  return generateTask(
    taskId,
    () =>
      new Promise((resolve, reject) => {
        if (cacheHits[pkg]) {
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
              // if (line.trim()) {
              //   process.stdout.write(`${pkg}:${task}: ${line.trim()}\n`);
              // }
              reportTaskLog(taskId, line, context);
            });
        });

        cp.stderr.on("data", (data) => {
          data
            .toString()
            .split(/\n/)
            .forEach((line) => {
              // if (line.trim()) {
              //   process.stderr.write(`${pkg}:${task}: ${line.trim()}\n`);
              // }

              reportTaskLog(taskId, line, context);
            });
        });

        cp.on("exit", (code) => {
          performance.mark(`end:${taskId}`);

          performance.measure(`${taskId}`, `start:${taskId}`, `end:${taskId}`);

          if (code === 0) {
            return resolve();
          }

          reject();
        });
      }),
    context
  );
}
