import log from "npmlog";
import { getPackageTaskFromId } from "../task/taskId";
import { RunContext } from "../types/RunContext";

let _context: RunContext;

export function initialize(context: RunContext) {
  _context = context;
}

function getPrefix(taskId: string) {
  const [pkg, task] = getPackageTaskFromId(taskId);
  return `${pkg} ${task}`;
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
  return log.info(getPrefix(taskId), message, ...args);
}

export function warn(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.warns(getPrefix(taskId), message, ...args);
}

export function error(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.error(getPrefix(taskId), message, ...args);
}

export function verbose(taskId: string, message: string, ...args: any) {
  addToTaskLog(taskId, message);
  return log.verbose(getPrefix(taskId), message, ...args);
}

export default { info, warn, error, verbose };
