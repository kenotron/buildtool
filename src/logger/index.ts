// import { RunContext } from "../types/RunContext";
// import { getPackageTaskFromId } from "../task/taskId";
import log, { Logger } from "npmlog";

// export function reportTaskLog(
//   taskId: string,
//   message: string,
//   context: RunContext
// ) {
//   if (!context.taskLogs.has(taskId)) {
//     context.taskLogs.set(taskId, []);
//   }
//   context.taskLogs.get(taskId)?.push(message);

//   if (message && context.verbose) {
//     const [pkg, task] = getPackageTaskFromId(taskId);
//     process.stdout.write(`[${pkg} ${task}] ${message.trim()}\n`);
//   }
// }

export function createLogger(taskId: string) {
  return log.newGroup(taskId) as Logger;
}

export function info(prefix: string, message: string, ...args: any) {
  return log.info(prefix, message, ...args);
}

export function warn(prefix: string, message: string, ...args: any) {
  return log.warns(prefix, message, ...args);
}

export function error(prefix: string, message: string, ...args: any) {
  return log.error(prefix, message, ...args);
}

export function silly(prefix: string, message: string, ...args: any) {
  return log.silly(prefix, message, ...args);
}
