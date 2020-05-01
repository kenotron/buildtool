import * as backfill from "backfill/lib/api";
import { PackageInfo } from "../types/PackageInfo";
import path from "path";
import { RunContext } from "../types/RunContext";

const hashes: { [key: string]: string } = {};
const cacheHits: { [key: string]: boolean } = {};

export async function computeHash(info: PackageInfo, context: RunContext) {
  const cwd = path.dirname(info.packageJsonPath);
  const logger = backfill.makeLogger("info", process.stdout, process.stderr);
  const name = require(path.join(cwd, "package.json")).name;

  logger.setName(name);
  // logger.setMode("verbose", "info");

  // TODO: "hi" here needs to account for file contents of important config files & cmd & workspace root
  const hash = await backfill.computeHash(cwd, logger, context.command + "1");

  hashes[cwd] = hash;
}

export async function fetchBackfill(info: PackageInfo) {
  const cwd = path.dirname(info.packageJsonPath);
  const logger = backfill.makeLogger("info", process.stdout, process.stderr);
  const hash = hashes[cwd];
  const cacheHit = await backfill.fetch(cwd, hash, logger);
  cacheHits[info.name] = cacheHit;
}

export async function putBackfill(info: PackageInfo) {
  const cwd = path.dirname(info.packageJsonPath);

  if (cacheHits[info.name]) {
    return;
  }

  const logger = backfill.makeLogger("info", process.stdout, process.stderr);
  const hash = hashes[cwd];
  await backfill.put(cwd, hash, logger);
}

export { cacheHits };
