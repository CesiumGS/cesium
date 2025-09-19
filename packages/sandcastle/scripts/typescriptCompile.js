import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import ts from "typescript";

/**
 * @param {(ts.Diagnostic | undefined)[]} diagnostics
 */
function reportDiagnostics(diagnostics) {
  diagnostics.forEach((diagnostic) => {
    if (!diagnostic) {
      return;
    }
    let message = "Error";
    if (diagnostic.file && diagnostic.start) {
      const where = diagnostic.file.getLineAndCharacterOfPosition(
        diagnostic.start,
      );
      message += ` ${diagnostic.file.fileName} ${where.line}, ${where.character}${1}`;
    }
    message += `: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
    console.log(message);
  });
}

/**
 * @param {string} configPath Absolute path to the config file to build
 */
function readConfigFile(configPath) {
  // Read config file
  const configFileText = readFileSync(configPath).toString();

  // Parse JSON, after removing comments. Just fancier JSON.parse
  const result = ts.parseConfigFileTextToJson(configPath, configFileText);
  const configObject = result.config;
  if (!configObject) {
    reportDiagnostics([result.error]);
    process.exit(1);
  }

  // Extract config information
  const configParseResult = ts.parseJsonConfigFileContent(
    configObject,
    ts.sys,
    dirname(configPath),
  );
  if (configParseResult.errors.length > 0) {
    reportDiagnostics(configParseResult.errors);
    process.exit(1);
  }
  return configParseResult;
}

/**
 * Compile a typescript project from it's config file
 *
 * @param {string} configPath Absolute path to the config file to build
 * @returns {number} exit code from the TS build process
 */
export default function typescriptCompile(configPath) {
  // The Compiler API is fairly confusing, especially the config import and processing
  // See docs: https://github.com/microsoft/TypeScript/wiki/Using-the-Compiler-API
  // This code was pulled and adapted from this issue which shows the framework
  // https://github.com/Microsoft/TypeScript/issues/6387

  // Extract configuration from config file
  const config = readConfigFile(configPath);

  // Compile
  const program = ts.createProgram(config.fileNames, config.options);
  const emitResult = program.emit();

  // Report errors
  reportDiagnostics(
    ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics),
  );

  // Return code
  const exitCode = emitResult.emitSkipped ? 1 : 0;
  if (exitCode !== 0) {
    throw new Error("Failed to do typescript build for Sandcastle");
  }
  return exitCode;
}
