import log, { Logger } from "npmlog";

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
