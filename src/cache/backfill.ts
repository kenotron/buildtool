import * as backfill from "backfill/lib/api";
import { PackageInfo } from "../types/PackageInfo";
import path from "path";
import { RunContext } from "../types/RunContext";

const hashes: { [key: string]: string } = {};
const cacheHits: { [key: string]: boolean } = {};

export async function computeHash(info: PackageInfo, context: RunContext) {
  const cwd = path.dirname(info.packageJsonPath);
  const logger = backfill.makeLogger("warn", process.stdout, process.stderr);
  const name = require(path.join(cwd, "package.json")).name;

  logger.setName(name);

  // TODO: needs to account for file contents of important config files & cmd & workspace root
  const hash = await backfill.computeHash(cwd, logger, context.command + "3");

  hashes[cwd] = hash;
}

export async function fetchBackfill(info: PackageInfo) {
  const cwd = path.dirname(info.packageJsonPath);
  const logger = backfill.makeLogger("warn", process.stdout, process.stderr);
  const hash = hashes[cwd];
  const cacheHit = await backfill.fetch(cwd, hash, logger);
  cacheHits[info.name] = cacheHit;
}

export async function putBackfill(info: PackageInfo) {
  const cwd = path.dirname(info.packageJsonPath);

  if (cacheHits[info.name]) {
    return;
  }

  const logger = backfill.makeLogger("warn", process.stdout, process.stderr);
  const hash = hashes[cwd];

  try {
    await backfill.put(cwd, hash, logger);
  } catch (e) {
    // here we swallow put errors because backfill will throw just because the output directories didn't exist
  }
}

export { cacheHits };
