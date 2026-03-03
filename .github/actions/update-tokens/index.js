import { readFileSync, writeFileSync } from "node:fs";
import { parse, print } from "recast";
import * as espree from "espree";
import * as prettier from "prettier";
import * as babelPlugin from "prettier/plugins/babel";
import * as estreePlugin from "prettier/plugins/estree";
import esquery from "esquery";
import { getReplacements } from "./replacements.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

/** @import {Replacement, NewValueFunction} from './replacements.js' */

const argv = await yargs(hideBin(process.argv))
  .options({
    update: {
      type: "boolean",
      description:
        "Use to force an update. By default this will behave as a dry run and replace with placeholders",
    },
  })
  .help(false)
  .version(false)
  .strict()
  .parse();

/**
 * Replace the value of a variable assignment's literal in an AST
 *
 * @param {object} ast Full AST for the file being processed
 * @param {string} selector an esquery selector to the literal to change
 * @param {string | NewValueFunction | undefined} newValue the new value to set
 */
async function replaceVariableValue(ast, selector, newValue) {
  if (!ast) {
    throw new Error("Missing ast");
  }
  if (!selector) {
    throw new Error("Missing selector");
  }
  if (!newValue) {
    throw new Error("Missing newValue");
  }

  const foundNodes = esquery.query(ast, selector);
  if (!foundNodes || foundNodes.length === 0) {
    throw new Error(`Unable to find node for selector: ${selector}`);
  }
  if (foundNodes.length > 1) {
    console.error("selected", foundNodes);
    throw new Error(
      `Found too many nodes for selector: ${selector}. See above for the nodes selected`,
    );
  }

  if (foundNodes[0].type !== "Literal") {
    console.error(foundNodes[0]);
    throw new Error(
      "Selected node that is not a Literal. See above for the node that was selected",
    );
  }

  if (!argv.update) {
    foundNodes[0].value = "fake-new-value";
    return;
  }

  const existingValue = foundNodes[0].value;
  const actualNewValue =
    typeof newValue === "function"
      ? await newValue(`${existingValue}`)
      : newValue;

  if (actualNewValue === undefined) {
    // Skip if there is no new value. This can be used in the new value function to indicate no update
    console.log("  Skipping - no new value provided");
    return;
  }

  foundNodes[0].value = actualNewValue;
}

/**
 * Format code with Prettier
 *
 * @param {string} code the code to format
 */
async function formatCode(code) {
  const formatted = await prettier.format(code, {
    parser: "babel",
    plugins: [babelPlugin, estreePlugin],
  });
  return formatted;
}

/**
 * Process a replacement for a file. Reads in the file and writes it back out to the same location
 *
 * @param {Replacement} replacement The replacement to process
 */
async function processReplacement(replacement) {
  const { filePath, selector, newValue } = replacement;
  console.log("Processing", filePath);
  const code = readFileSync(filePath, "utf-8");

  const ast = parse(code, {
    parser: {
      parse: (js, opts) => espree.parse(js, { ...opts, ecmaVersion: 2022 }),
      tokenize: (js, opts) =>
        espree.tokenize(js, { ...opts, ecmaVersion: 2022 }),
    },
  });

  await replaceVariableValue(ast, selector, newValue);

  const output = print(ast).code;

  writeFileSync(filePath, await formatCode(output));
}

// TODO: Automate through PR creation in CI

for (const replacement of getReplacements()) {
  await processReplacement(replacement);
}
