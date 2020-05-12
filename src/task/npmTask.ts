import { TaskId } from "../types/Task";
import { getPackageTaskFromId } from "./taskId";
import { spawn } from "child_process";
import path from "path";

import { cacheHits } from "../cache/backfill";
import { RunContext } from "../types/RunContext";
import { reportTaskLog } from "../reporter/ansiReporter";
import { taskWrapper } from "./taskWrapper";

function stopAllNpmTasks(context: RunContext) {
  const { queue } = context;
  queue.pause();
  queue.clear();
}

export function npmTask(taskId: TaskId, context: RunContext) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  const { allPackages, queue } = context;

  return queue.add(() =>
    taskWrapper(
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

          console.log(
            `Running ${[
              process.execPath,
              ...context.nodeArgs,
              path.join(
                path.dirname(process.execPath),
                "node_modules/npm/bin/npm-cli.js"
              ),
              "run",
              task,
              "--",
              ...context.args,
            ].join(" ")}`
          );

          const cp = spawn(
            process.execPath,
            [
              ...context.nodeArgs,
              path.join(
                path.dirname(process.execPath),
                "node_modules/npm/bin/npm-cli.js"
              ),
              "run",
              task,
              "--",
              ...context.args,
            ],
            {
              cwd: path.dirname(allPackages[pkg].packageJsonPath),
              stdio: "pipe",
            }
          );

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

            stopAllNpmTasks(context);
            console.log("Error detected");

            reject();
          });
        }),
      context
    )
  );
}
