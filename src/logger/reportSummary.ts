import { RunContext } from "../types/RunContext";
import { getPackageTaskFromId } from "../task/taskId";
import log from "npmlog";

function hrtimeToSec(hrtime: [number, number]) {
  return (hrtime[0] + hrtime[1] / 1e9).toFixed(2);
}

function hr() {
  console.log("----------------------------------------------");
}

export async function reportSummary(context: RunContext) {
  const { command, measures, taskLogs } = context;

  hr();

  if (measures.failedTask) {
    const [pkg, task] = getPackageTaskFromId(measures.failedTask);
    log.error("", `ERROR DETECTED IN ${pkg} ${task}`);
    log.error("", taskLogs.get(measures.failedTask)!.join("\n"));

    hr();
  }

  log.info(
    "",
    measures.taskStats
      .map((stats) => {
        const [pkg, task] = getPackageTaskFromId(stats.taskId);
        return `[${pkg} - ${task}] took ${hrtimeToSec(stats.duration)}s`;
      })
      .join("\n")
  );

  hr();

  log.info(
    "",
    `The command "${command}" took a total of ${hrtimeToSec(
      measures.duration
    )}s to complete`
  );
}
