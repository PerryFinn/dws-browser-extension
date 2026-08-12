import { pathToFileURL } from "node:url";
import { resolve } from "pathe";

export const isMainModule = (moduleUrl: string, entryPath = process.argv[1]): boolean => {
  return entryPath !== undefined && moduleUrl === pathToFileURL(resolve(entryPath)).href;
};
