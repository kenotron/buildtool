import { RunContext } from "../types/RunContext";
import { getPackageTaskFromId } from "../task/taskId";
import log from "npmlog";
import chalk from "chalk";
import { formatDuration } from "./formatDuration";

function hr() {
  console.log("----------------------------------------------");
}

export async function reportSummary(context: RunContext) {
  const { command, measures, taskLogs } = context;

  const statusColorFn = {
    success: chalk.greenBright,
    failed: chalk.redBright,
    skipped: chalk.gray,
  };

  hr();

  if (measures.failedTask) {
    const [pkg, task] = getPackageTaskFromId(measures.failedTask);
    log.error("", `ERROR DETECTED IN ${pkg} ${task}`);
    log.error("", taskLogs.get(measures.failedTask)!.join("\n"));

    hr();
  }

  if (measures.taskStats.length > 0) {
    for (const stats of measures.taskStats) {
      const colorFn = statusColorFn[stats.status];
      log.info(
        stats.taskId,
        colorFn(`${stats.status}, took ${formatDuration(stats.duration)}`)
      );
    }
  } else {
    log.warn("", "Nothing has been run. Check the scope or the command name");
  }

  hr();

  log.info(
    "",
    `The command "${command}" took a total of ${formatDuration(
      measures.duration
    )} to complete`
  );
}
