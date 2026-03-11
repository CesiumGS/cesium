import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createNewToken, getNextVersion } from "./ionTokenUpdater.js";
import { getNewKeyForItwin } from "./iTwinShareUpdater.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} name
 */
function variableDeclaration(name) {
  return `VariableDeclaration:has(VariableDeclarator[id.name=${name}]) Literal`;
}

/**
 * @param {string} name
 */
function propertySelector(name) {
  return `AssignmentExpression:has(MemberExpression[property.name=${name.split(".").at(-1)}]) Literal`;
}

/**
 * Function to generate a new value. This should return the new value or undefined
 * if the update should be skipped.
 *
 * If this function throws an error the value in code will replaced with a generic
 * error message to help indicate something went wrong
 *
 * @callback NewValueFunction
 * @param {string} [existingValue] The existing value from the file
 * @returns {string | Promise<string | undefined>}
 */

/**
 * Use https://astexplorer.net/ and the tester at https://estools.github.io/esquery/ to generate
 * valid selectors. The selctor should be to the exact Literal to replace not the whole assignment.
 *
 * There are some helpers above for common requirements like variable declarations or property assignments
 *
 * @typedef {object} Replacement
 * @property {string} filePath
 * @property {string} selector an esquery selector to the literal to change https://estools.github.io/esquery/
 * @property {string | NewValueFunction | undefined} newValue the new value to place in the literal. If undefined then skip this replacement
 */

/**
 * Generate a list of replacements for different files
 * @returns {Replacement[]}
 */
export function getReplacements() {
  /** @type {Replacement[]} */
  const replacements = [];

  // Ion token replacement
  replacements.push({
    filePath: join(__dirname, "../../../packages/engine/Source/Core/Ion.js"),
    selector: variableDeclaration("defaultAccessToken"),
    // automatible through https://cesium.com/learn/ion/rest-api/#operation/postTokens
    newValue: async () => {
      try {
        const newToken = await createNewToken(await getNextVersion());
        return newToken.token;
      } catch (error) {
        console.error(error);
        // Just skip updating if there was an error
        return undefined;
      }
    },
  });

  // ITwin key replacements
  const featureSeriviceItwin = "04ba725f-f3c0-4f30-8014-a4488cbd612d";
  const phillyItwin = "535a24a3-9b29-4e23-bb5d-9cedb524c743";
  replacements.push(
    {
      filePath: join(
        __dirname,
        "../../../packages/sandcastle/gallery/itwin-feature-service/main.js",
      ),
      selector: propertySelector("Cesium.ITwinPlatform.defaultShareKey"),
      // automatible with the Share key API https://developer.bentley.com/apis/access-control-v2/operations/get-itwin-share/
      // Need to get an auth token using the client id + secret first
      newValue: async () => {
        try {
          const newToken = await getNewKeyForItwin(featureSeriviceItwin);
          return newToken;
        } catch (error) {
          console.error(error);
          // Just skip updating if there was an error
          return undefined;
        }
      },
    },
    {
      filePath: join(
        __dirname,
        "../../../packages/sandcastle/gallery/imodel-mesh-export-service/main.js",
      ),
      selector: propertySelector("Cesium.ITwinPlatform.defaultShareKey"),
      newValue: async () => {
        try {
          const newToken = await getNewKeyForItwin(phillyItwin);
          return newToken;
        } catch (error) {
          console.error(error);
          // Just skip updating if there was an error
          return undefined;
        }
      },
    },
  );
  return replacements;
}
