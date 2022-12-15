(function () {
  "use strict";

  window.embedInSandcastleTemplate = function (code, addExtraLine) {
    return `
window.startup = function (Cesium) {
    'use strict';
    (async ()=> {
    //Sandcastle_Begin
    ${addExtraLine ? "\n" : ""}${code}//Sandcastle_End
    })();
    Sandcastle.finishedLoading();
};

if (typeof Cesium !== 'undefined') {
  window.startupCalled = true;
  window.startup(Cesium);
};`;
  };
  window.decodeBase64Data = function (base64String, pako) {
    // data stored in the hash as:
    // Base64 encoded, raw DEFLATE compressed JSON array where index 0 is code, index 1 is html
    // restore padding
    while (base64String.length % 4 !== 0) {
      base64String += "=";
    }
    let jsonString = pako.inflate(atob(base64String), {
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
  };
})();
