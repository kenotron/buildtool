import ansiDiff from "ansi-diff";
import chalk from "chalk";
import { RunContext } from "../types/RunContext";

const diff = ansiDiff({
  // if you want to support word wrapping, provide the terminal width
  width: process.stdout.columns,
});

export function reportTaskLog(
  taskId: string,
  message: string,
  context: RunContext
) {
  if (!context.taskLogs.has(taskId)) {
    context.taskLogs.set(taskId, []);
  }
  context.taskLogs.get(taskId)?.push(message);

  if (message) {
    process.stdout.write(`${taskId}: ${message.trim()}\n`);
  }
  //renderTaskLogs(context);
}

export function renderTaskLogs(context: RunContext) {
  const logs = context.taskLogs;

  process.stdout.write(
    diff.update(
      `${[...logs.entries()]
        .map(([taskId, lines]) => {
          return `--- ${taskId} ---\n${lines
            .map((line) => `  ${line}`)
            .join("\n")}`;
        })
        .join("\n")}`
    )
  );
}
