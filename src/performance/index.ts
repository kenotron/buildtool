import { RunContext } from "../types/RunContext";
import { getPackageTaskFromId } from "../task/taskId";

function hrtimeToSec(hrtime: [number, number]) {
  return (hrtime[0] + hrtime[1] / 1e9).toFixed(2);
}

function hr() {
  console.log("----------------------------------------------");
}

export async function reportSummary(context: RunContext) {
  const { command, measures } = context;

  hr();

  if (measures.failedTask) {
    const [pkg, task] = getPackageTaskFromId(measures.failedTask);
    console.error(`ERROR DETECTED IN ${pkg} ${task}`);
    hr();
  }

  console.log(
    measures.taskStats
      .map((stats) => {
        const [pkg, task] = getPackageTaskFromId(stats.taskId);
        return `[${pkg} - ${task}] took ${hrtimeToSec(stats.duration)}s`;
      })
      .join("\n")
  );

  hr();

  console.log(
    `The command "${command}" took a total of ${hrtimeToSec(
      measures.duration
    )}s to complete`
  );
}
