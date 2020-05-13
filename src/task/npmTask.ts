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
            logger.info(taskId, `Empty script detected: ${pkg} - ${task}`);
            return resolve();
          }

          logger.verbose(
            taskId,
            `Running ${[
              process.execPath,
              ...context.nodeArgs,
              path.join(
                path.dirname(process.execPath),
                "node_modules/npm/bin/npm-cli.js"
              ),
              "run",
              task,
              ...(context.args.length > 0 ? ["--", ...context.args] : []),
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

          context.events.once("abort", () => {
            queue.pause();
            // kill the process in progress, but be gentle and let the process themselves take care of SIGTERM
            cp.kill("SIGTERM");
          });

          cp.stdout.on("data", (data) => {
            if (!cp.killed) {
              data
                .toString()
                .split(/\n/)
                .forEach((line) => {
                  logger.verbose(taskId, line);
                });
            }
          });

          cp.stderr.on("data", (data) => {
            if (!cp.killed) {
              data
                .toString()
                .split(/\n/)
                .forEach((line) => {
                  logger.verbose(taskId, line);
                });
            }
          });

          cp.on("exit", (code) => {
            if (code === 0) {
              return resolve();
            }

            context.measures.failedTask = taskId;
            abort(context);
            reject();
          });
        }),
      context
    )
  );
}
