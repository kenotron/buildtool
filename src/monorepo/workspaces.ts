import { findGitRoot } from "../paths";
import { listAllTrackedFiles } from "../git";
import fs from "fs";
import path from "path";
import minimatch from "minimatch";
import readYaml from "read-yaml";
import jju from "jju";

/**
 * Finds the git root, then either process yarn, pnpm workspaces minimatches vs what is checked into git repo
 * @param cwd
 */
export function getAllPackageJsonFiles(cwd: string) {
  const gitRoot = findGitRoot(cwd)!;

  // Rush handling
  if (fs.existsSync(path.join(gitRoot, "rush.json"))) {
    const rushConfig = jju.parse(
      fs.readFileSync(path.join(gitRoot, "rush.json"), "utf-8")
    );
    return rushConfig.projects.map((project) =>
      path.join(project.projectFolder, "package.json")
    );
  }

  // get all tracked package.json's except the root one (assuming it is a workspace package.json)
  let packageJsonFiles = listAllTrackedFiles(["**/package.json"], gitRoot);

  if (!fs.existsSync(path.join(gitRoot, "package.json"))) {
    throw new Error(
      "This tool is meant to be run in a workspace at the git root"
    );
  }

  let packagePatterns: string[] = [];

  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(gitRoot, "package.json"), "utf-8")
    );

    if (packageJson.workspaces) {
      const workspaces = packageJson.workspaces;

      // read package.json workspace settings

      if (Array.isArray(workspaces)) {
        packagePatterns = workspaces;
      } else if (workspaces.packages) {
        packagePatterns = workspaces.packages;
      }
    }
  } catch {
    throw new Error("The package.json at the root is not formatted correctly");
  }

  // read pnpm-workspace.yaml if found
  if (fs.existsSync(path.join(gitRoot, "pnpm-workspace.yaml"))) {
    try {
      const workspaces = readYaml.sync(
        path.join(gitRoot, "pnpm-workspace.yaml")
      );

      if (workspaces && workspaces.packages) {
        packagePatterns = workspaces.packages;
      }
    } catch {
      throw new Error("The pnpm-workspace.yaml is not formatted correctly");
    }
  }

  if (packagePatterns.length > 0) {
    // filter out the packageJsonFiles
    packageJsonFiles = packageJsonFiles.filter((packageJsonFile) => {
      let matched = false;

      for (const pattern of packagePatterns) {
        if (minimatch(path.dirname(packageJsonFile), pattern)) {
          matched = true;
          break;
        }
      }

      return matched;
    });
  }

  return packageJsonFiles;
}
