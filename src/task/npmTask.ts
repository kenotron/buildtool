import { TaskId } from "../types/Task";
import { getPackageTaskFromId } from "./taskId";
import { spawn } from "child_process";
import path from "path";

import { RunContext } from "../types/RunContext";
import logger from "../logger";
import { taskWrapper } from "./taskWrapper";
import { abort } from "./abortSignal";

export function npmTask(taskId: TaskId, context: RunContext) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  const { allPackages, queue } = context;

  const prefix = `${pkg} ${task}`;

  return queue.add(() =>
    taskWrapper(
      taskId,
      () =>
        new Promise((resolve, reject) => {
          if (!allPackages[pkg].scripts[task]) {
            logger.info(taskId, `Empty script detected, skipping`);
            return resolve();
          }

          const npmArgs = [
            ...context.nodeArgs,
            path.join(
              path.dirname(process.execPath),
              "node_modules/npm/bin/npm-cli.js"
            ),
            "run",
            task,
            "--",
            ...context.args,
          ];

          logger.verbose(
            taskId,
            `Running ${[process.execPath, ...npmArgs].join(" ")}`
          );

          const cp = spawn(process.execPath, npmArgs, {
            cwd: path.dirname(allPackages[pkg].packageJsonPath),
            stdio: "pipe",
          });

          context.events.once("abort", terminate);

          cp.stdout.on("data", (data) => {
            if (!cp.killed) {
              data
                .toString()
                .split(/\n/)
                .forEach((line) => {
                  logger.verbose(taskId, line.trim());
                });
            }
          });

          cp.stderr.on("data", (data) => {
            if (!cp.killed) {
              data
                .toString()
                .split(/\n/)
                .forEach((line) => {
                  logger.verbose(taskId, line.trim());
                });
            }
          });

          cp.on("exit", (code) => {
            context.events.off("off", terminate);

            if (code === 0) {
              return resolve();
            }

            context.measures.failedTask = taskId;

            abort(context);
            reject();
          });

          function terminate() {
            queue.pause();
            queue.clear();
            cp.kill("SIGKILL");
          }
        }),
      context
    )
  );
}
