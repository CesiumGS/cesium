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
 * @callback NewValueFunction
 * @param {string} [existingValue] The existing value from the file. Useful for matching with existing remote keys
 * @returns {string | Promise<string | undefined>}
 */

// TODO: swap out for real itwins
// const featureSeriviceItwin = "04ba725f-f3c0-4f30-8014-a4488cbd612d";
// const phillyItwin = "535a24a3-9b29-4e23-bb5d-9cedb524c743";
const testItwin = "671839a6-f6a9-4eb6-8e91-801441e0e3f2";

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

/** @type {Replacement[]} */
export const replacements = [
  {
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
  },
  {
    filePath: join(
      __dirname,
      "../../../packages/engine/Source/Scene/ArcGisMapService.js",
    ),
    selector: variableDeclaration("defaultAccessToken"),
    // potentially automatible with https://developers.arcgis.com/arcgis-rest-js/authentication/tutorials/create-an-api-key/api/
    newValue: "fake-key",
  },
  {
    filePath: join(
      __dirname,
      "../../../packages/sandcastle/gallery/itwin-feature-service/main.js",
    ),
    selector: propertySelector("Cesium.ITwinPlatform.defaultShareKey"),
    // automatible with the Share key API https://developer.bentley.com/apis/access-control-v2/operations/get-itwin-share/
    // Need to get an auth token using the client id + secret first
    newValue: async (existingValue) => {
      try {
        // const newToken = await getNewKeyForItwin(featureSeriviceItwin, {
        const newToken = await getNewKeyForItwin(testItwin, {
          neverDeleteKey: existingValue,
        });
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
    newValue: async (existingValue) => {
      try {
        // const newToken = await getNewKeyForItwin(phillyItwin, {
        const newToken = await getNewKeyForItwin(testItwin, {
          neverDeleteKey: existingValue,
        });
        return newToken;
      } catch (error) {
        console.error(error);
        // Just skip updating if there was an error
        return undefined;
      }
    },
  },
];
