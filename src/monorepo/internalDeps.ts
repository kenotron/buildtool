import { PackageInfo, PackageInfos } from "../types/PackageInfo";

export function getInternalDepsWithTask(
  info: PackageInfo,
  task: string,
  allPackagesInfos: PackageInfos
) {
  const deps = Object.keys({ ...info.dependencies, ...info.devDependencies });
  return Object.keys(allPackagesInfos).filter(
    (pkg) => deps.includes(pkg) && allPackagesInfos[pkg].scripts[task]
  );
}

export function getInternalDeps(
  info: PackageInfo,
  allPackagesInfos: PackageInfos
) {
  const deps = Object.keys({ ...info.dependencies, ...info.devDependencies });
  return Object.keys(allPackagesInfos).filter((pkg) => deps.includes(pkg));
}
