import Pako from "pako";

export function embedInSandcastleTemplate(code: string, addExtraLine: boolean) {
  console.log("embedSandcastle");
  return `window.startup = async function (Cesium, Sandcastle) {
  'use strict';
  //Sandcastle_Begin
  ${addExtraLine ? "\n" : ""}${code}
  //Sandcastle_End
  Sandcastle.finishedLoading();
  };
  if (typeof Cesium !== 'undefined' && typeof Sandcastle !== 'undefined') {
      window.startupCalled = true;
    window.startup(Cesium, Sandcastle).catch((error) => {
        "use strict";
      console.error(error);
    });
}
`;
}

type SandcastleSaveData = {
  code: string;
  html: string;
  baseHref?: string;
};

export function makeCompressedBase64String(data: SandcastleSaveData) {
  // data stored in the hash as:
  // Base64 encoded, raw DEFLATE compressed JSON array where index 0 is code, index 1 is html
  const { code, html, baseHref } = data;
  const encode = baseHref !== undefined ? [code, html, baseHref] : [code, html];
  let jsonString = JSON.stringify(encode);
  // we save a few bytes by omitting the leading [" and trailing "] since they are always the same
  jsonString = jsonString.slice(2, 2 + jsonString.length - 4);
  const pakoString = Pako.deflate(jsonString, {
    raw: true,
    level: 9,
  });
  let base64String = btoa(
    // TODO: not 100% sure why I have to do this conversion manually anymore but it works
    // https://stackoverflow.com/questions/12710001/how-to-convert-uint8-array-to-base64-encoded-string
    String.fromCharCode(...new Uint8Array(pakoString)),
  );
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
  let jsonString = Pako.inflate(dataArray, {
    raw: true,
    to: "string",
  });
  // we save a few bytes by omitting the leading [" and trailing "] since they are always the same
  jsonString = `["${jsonString}"]`;
  const json = JSON.parse(jsonString);
  // index 0 is code, index 1 is html
  const code = json[0];
  const html = json[1];
  const baseHref = json[2];
  return {
    code: code,
    html: html,
    baseHref: baseHref,
  };
}
