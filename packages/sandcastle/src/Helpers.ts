import Pako from "pako";

export function embedInSandcastleTemplate(code: string, addExtraLine: boolean) {
  let imports = "";

  if (!/^import\s+\*\s+as\s+Cesium\s+from\s+(['"])cesium\1;?$/m.test(code)) {
    imports += `import * as Cesium from "cesium";\n`;
  }
  if (!/^import\s+Sandcastle\s+from\s+(['"])Sandcastle\1;?$/m.test(code)) {
    imports += `import Sandcastle from "Sandcastle";\n`;
  }

  return `${addExtraLine ? "\n" : ""}${code}
// Imports are hoisted. Adding them here preserves line numbers with the editor
${imports}
// Call default actions that might have been set up
Sandcastle.finishedLoading();
// Set Cesium on the window for use in DevTools
window.Cesium = Cesium;
`;
}

type SandcastleSaveData = {
  code: string;
  html: string;
};

export function makeCompressedBase64String(data: SandcastleSaveData) {
  // data stored in the hash as:
  // Base64 encoded, raw DEFLATE compressed JSON array where index 0 is code, index 1 is html
  const { code, html } = data;
  const encode = [code, html];
  let jsonString = JSON.stringify(encode);

  // we save a few bytes by omitting the leading [" and trailing "] since they are always the same
  jsonString = jsonString.slice(2, 2 + jsonString.length - 4);
  const pakoData = Pako.deflate(jsonString, { raw: true, level: 9 });

  // https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
  let base64String = btoa(String.fromCharCode(...pakoData));
  base64String = base64String.replace(/=+$/, ""); // remove padding

  return base64String;
}

export function decodeBase64Data(base64String: string): SandcastleSaveData {
  // data stored in the hash as:
  // Base64 encoded, raw DEFLATE compressed JSON array where index 0 is code, index 1 is html
  // restore padding
  while (base64String.length % 4 !== 0) {
    base64String += "=";
  }
  // https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
  const dataArray = new Uint8Array(
    atob(base64String)
      .split("")
      .map(function (c) {
        return c.charCodeAt(0);
      }),
  );

  let jsonString = Pako.inflate(dataArray, { raw: true, to: "string" });

  // we save a few bytes by omitting the leading [" and trailing "] since they are always the same
  jsonString = `["${jsonString}"]`;
  const json = JSON.parse(jsonString);

  // index 0 is code, index 1 is html
  const code = json[0];
  const html = json[1];
  const baseHref = json[2];
  if (baseHref !== undefined) {
    // historically the third element allowed changing the <base> of the page when loaded
    // This is no longer supported but could show up in old links if they were saved.
    console.warn(
      "Sandcastle no longer supports setting the base through the sandcastle URL",
    );
  }
  return {
    code: code,
    html: html,
  };
}
