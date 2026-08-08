import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const require = createRequire(import.meta.url);
const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const sourceRoot = path.join(projectRoot, "src").replaceAll("\\", "/");

require.extensions[".ts"] = (module, filename) => {
  let source = fs.readFileSync(filename, "utf8");
  source = source.replace(/(["'])@\/([^"']+)\1/g, "$1" + sourceRoot + "/$2$1");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(output.outputText, filename);
};

const testModule = require(path.join(projectRoot, "src/lib/multi-floor-acceptance.test.ts"));
if (testModule.runMultiFloorAcceptanceInvariants() !== true) {
  throw new Error("Multi-floor invariants did not complete");
}
console.log("multi-floor frontend invariants: passed");
