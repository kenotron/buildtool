import log from "npmlog";
import { getPackageTaskFromId } from "../task/taskId";
import { RunContext } from "../types/RunContext";
import chalk from "chalk";

let _context: RunContext;

export function initialize(context: RunContext) {
  _context = context;
}

export function getTaskLogPrefix(taskId: string) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  return `${pkg} ${chalk.green(task)}`;
}

function addToTaskLog(taskId: string, message: string) {
  const { taskLogs } = _context;
  if (!taskLogs.has(taskId)) {
    taskLogs.set(taskId, []);
  }

  taskLogs.get(taskId)?.push(message);
}

export function info(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.info(getTaskLogPrefix(taskId), chalk.cyan(message), ...args);
}

export function warn(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.warns(getTaskLogPrefix(taskId), chalk.yellow(message), ...args);
}

export function error(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.error(getTaskLogPrefix(taskId), chalk.red(message), ...args);
}

export function verbose(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.verbose(
    getTaskLogPrefix(taskId),
    chalk.underline(message),
    ...args
  );
}

export default { info, warn, error, verbose };
