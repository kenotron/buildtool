import { TaskId } from "../types/Task";
import { getPackageTaskFromId } from "./taskId";
import { generateTask } from "./generateTask";
import { spawn } from "child_process";
import path from "path";

import { cacheHits } from "../cache/backfill";
import { RunContext } from "../types/RunContext";
import { performance } from "perf_hooks";
import { generateFnTask } from "./generateFnTask";

export function generateNpmTask(taskId: TaskId, context: RunContext) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  const { allPackages } = context;

  return new Promise<void>((resolve, reject) => {
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
      if (code === 0) {
        return resolve();
      }

      reject();
    });
  });
}
