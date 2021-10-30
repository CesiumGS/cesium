/*global JSHINT */
/*global decodeBase64Data, embedInSandcastleTemplate */
/*global gallery_demos, has_new_gallery_demos, hello_world_index, VERSION*/ // defined in gallery/gallery-index.js, created by build
/*global sandcastleJsHintOptions*/ // defined by jsHintOptions.js, created by build
require({
  baseUrl: "../../Source",
  packages: [
    {
      name: "dojo",
      location: "../ThirdParty/dojo-release-1.10.4/dojo",
    },
    {
      name: "dijit",
      location: "../ThirdParty/dojo-release-1.10.4/dijit",
    },
    {
      name: "Sandcastle",
      location: "../Apps/Sandcastle",
    },
    {
      name: "CodeMirror",
      location: "../ThirdParty/codemirror-5.52.0",
    },
    {
      name: "ThirdParty",
      location: "../Apps/Sandcastle/ThirdParty",
    },
  ],
}, [
  "CodeMirror/lib/codemirror",
  "dijit/Dialog",
  "dijit/form/Button",
  "dijit/form/Form",
  "dijit/form/Textarea",
  "dijit/layout/ContentPane",
  "dijit/popup",
  "dijit/registry",
  "dijit/TooltipDialog",
  "dojo/_base/fx",
  "dojo/_base/xhr",
  "dojo/dom",
  "dojo/dom-class",
  "dojo/dom-construct",
  "dojo/io-query",
  "dojo/mouse",
  "dojo/on",
  "dojo/parser",
  "dojo/promise/all",
  "dojo/query",
  "dojo/when",
  "dojo/request/script",
  "Sandcastle/LinkButton",
  "ThirdParty/clipboard.min",
  "ThirdParty/pako.min",
  "CodeMirror/addon/hint/show-hint",
  "CodeMirror/addon/hint/javascript-hint",
  "CodeMirror/mode/javascript/javascript",
  "CodeMirror/mode/css/css",
  "CodeMirror/mode/xml/xml",
  "CodeMirror/mode/htmlmixed/htmlmixed",
  "dijit/form/DropDownButton",
  "dijit/form/ToggleButton",
  "dijit/form/DropDownButton",
  "dijit/form/TextBox",
  "dijit/Menu",
  "dijit/MenuBar",
  "dijit/PopupMenuBarItem",
  "dijit/MenuItem",
  "dijit/layout/BorderContainer",
  "dijit/layout/TabContainer",
  "dijit/Toolbar",
  "dijit/ToolbarSeparator",
  "dojo/domReady!",
], function (
  CodeMirror,
  Dialog,
  Button,
  Form,
  TextArea,
  ContentPane,
  popup,
  registry,
  TooltipDialog,
  fx,
  xhr,
  dom,
  domClass,
  domConstruct,
  ioQuery,
  mouse,
  on,
  parser,
  all,
  query,
  when,
  dojoscript,
  LinkButton,
  ClipboardJS,
  pako
) {
  "use strict";
  // attach clipboard handling to our Copy button
  var clipboardjs = new ClipboardJS(".copyButton");

  function defined(value) {
    return value !== undefined && value !== null;
  }

  parser.parse();

  fx.fadeOut({
    node: "loading",
    onEnd: function () {
      domConstruct.destroy("loading");
    },
  }).play();

  var numberOfNewConsoleMessages = 0;

  var logOutput = document.getElementById("logOutput");
  function appendConsole(className, message, showConsole) {
    var ele = document.createElement("span");
    ele.className = className;
    ele.textContent = message + "\n";
    logOutput.appendChild(ele);
    logOutput.parentNode.scrollTop =
      logOutput.clientHeight + 8 - logOutput.parentNode.clientHeight;
    if (showConsole) {
      hideGallery();
    } else {
      ++numberOfNewConsoleMessages;
      registry
        .byId("logContainer")
        .set("title", "Console (" + numberOfNewConsoleMessages + ")");
    }
  }

  var URL = window.URL || window.webkitURL;

  function findCssStyle(selectorText) {
    for (
      var iSheets = 0, lenSheets = document.styleSheets.length;
      iSheets < lenSheets;
      ++iSheets
    ) {
      var rules = document.styleSheets[iSheets].cssRules;
      for (
        var iRules = 0, lenRules = rules.length;
        iRules < lenRules;
        ++iRules
      ) {
        if (rules[iRules].selectorText === selectorText) {
          return rules[iRules];
        }
      }
    }
  }

  var jsEditor;
  var htmlEditor;
  var suggestButton = registry.byId("buttonSuggest");
  var docTimer;
  var docTabs = {};
  var subtabs = {};
  var docError = false;
  var galleryError = false;
  var deferredLoadError = false;
  var galleryTooltipTimer;
  var activeGalleryTooltipDemo;
  var demoTileHeightRule = findCssStyle(".demoTileThumbnail");
  var cesiumContainer = registry.byId("cesiumContainer");
  var docNode = dom.byId("docPopup");
  var docMessage = dom.byId("docPopupMessage");
  var local = {
    docTypes: [],
    headers: "<html><head></head><body>",
    bucketName: "",
    emptyBucket: "",
  };
  var bucketTypes = {};
  var demoTooltips = {};
  var errorLines = [];
  var highlightLines = [];
  var searchTerm = "";
  var searchRegExp;
  var hintTimer;
  var defaultDemo = "Hello World";
  var defaultLabel = "Showcases";
  var currentTab = defaultLabel;
  var newDemo;
  var demoHtml = "";
  var demoCode = "";

  var defaultHtml =
    '<style>\n@import url(../templates/bucket.css);\n</style>\n<div id="cesiumContainer" class="fullSize"></div>\n<div id="loadingOverlay"><h1>Loading...</h1></div>\n<div id="toolbar"></div>';

  var galleryErrorMsg = document.createElement("span");
  galleryErrorMsg.className = "galleryError";
  galleryErrorMsg.style.display = "none";
  galleryErrorMsg.textContent = "No demos match your search terms.";

  var bucketFrame = document.getElementById("bucketFrame");
  var bucketPane = registry.byId("bucketPane");
  var bucketWaiting = false;

  xhr
    .get({
      url: "../../Build/Documentation/types.txt",
      handleAs: "json",
      error: function (error) {
        docError = true;
      },
    })
    .then(function (value) {
      local.docTypes = value;
    });

  var decoderSpan = document.createElement("span");
  function encodeHTML(text) {
    decoderSpan.textContent = text;
    text = decoderSpan.innerHTML;
    decoderSpan.innerHTML = "";
    return text;
  }
  function decodeHTML(text) {
    decoderSpan.innerHTML = text;
    text = decoderSpan.textContent;
    decoderSpan.innerHTML = "";
    return text;
  }

  function highlightRun() {
    domClass.add(registry.byId("buttonRun").domNode, "highlightToolbarButton");
  }

  function clearRun() {
    domClass.remove(
      registry.byId("buttonRun").domNode,
      "highlightToolbarButton"
    );
  }

  function openDocTab(title, link) {
    if (!defined(docTabs[title])) {
      docTabs[title] = new ContentPane({
        title: title,
        focused: true,
        content: '<iframe class="fullFrame" src="' + link + '"></iframe>',
        closable: true,
        onClose: function () {
          docTabs[this.title] = undefined;
          // Return true to close the tab.
          return true;
        },
      }).placeAt(cesiumContainer);
      // After the iframe loads, re-scroll to selected field.
      docTabs[title].domNode.childNodes[0].onload = function () {
        this.onload = function () {};
        this.src = link;
      };
      cesiumContainer.selectChild(docTabs[title]);
    } else {
      // Tab already exists, but maybe not visible.  Firefox needs the tab to
      // be revealed before a re-scroll can happen.  Chrome works either way.
      cesiumContainer.selectChild(docTabs[title]);
      docTabs[title].domNode.childNodes[0].src = link;
    }
  }

  function showDocPopup() {
    var selectedText = jsEditor.getSelection();
    var lowerText = selectedText.toLowerCase();

    var onDocClick = function () {
      openDocTab(this.textContent, this.href);
      return false;
    };

    docTimer = undefined;
    if (docError && selectedText && selectedText.length < 50) {
      hideGallery();
    } else if (
      lowerText &&
      lowerText in local.docTypes &&
      typeof local.docTypes[lowerText].push === "function"
    ) {
      docMessage.innerHTML = "";
      for (var i = 0, len = local.docTypes[lowerText].length; i < len; ++i) {
        var member = local.docTypes[lowerText][i];
        var ele = document.createElement("a");
        ele.target = "_blank";
        ele.textContent = member
          .replace(".html", "")
          .replace("module-", "")
          .replace("#.", ".")
          .replace("#", ".");
        ele.href = "../../Build/Documentation/" + member;
        ele.onclick = onDocClick;
        docMessage.appendChild(ele);
      }
      jsEditor.addWidget(jsEditor.getCursor(true), docNode);
      docNode.style.top = parseInt(docNode.style.top, 10) - 5 + "px";
    }
  }

  function onCursorActivity() {
    docNode.style.left = "-999px";
    if (defined(docTimer)) {
      window.clearTimeout(docTimer);
    }
    docTimer = window.setTimeout(showDocPopup, 500);
  }

  function makeLineLabel(msg, className) {
    var element = document.createElement("abbr");
    element.className = className;
    switch (className) {
      case "hintMarker":
        element.innerHTML = "&#9650;";
        break;
      case "errorMarker":
        element.innerHTML = "&times;";
        break;
      default:
        element.innerHTML = "&#9654;";
    }
    element.title = msg;
    return element;
  }

  function closeGalleryTooltip() {
    if (defined(activeGalleryTooltipDemo)) {
      popup.close(demoTooltips[activeGalleryTooltipDemo.name]);
      activeGalleryTooltipDemo = undefined;
    }
  }

  function openGalleryTooltip() {
    galleryTooltipTimer = undefined;

    var selectedTabName = registry.byId("innerPanel").selectedChildWidget.title;
    var suffix = selectedTabName + "Demos";
    if (selectedTabName === "All") {
      suffix = "all";
    } else if (selectedTabName === "Search Results") {
      suffix = "searchDemo";
    }

    if (defined(activeGalleryTooltipDemo)) {
      popup.open({
        popup: demoTooltips[activeGalleryTooltipDemo.name],
        around: dom.byId(activeGalleryTooltipDemo.name + suffix),
        orient: ["above", "below"],
      });
    }
  }

  function scheduleGalleryTooltip(demo) {
    if (demo !== activeGalleryTooltipDemo) {
      activeGalleryTooltipDemo = demo;
      if (defined(galleryTooltipTimer)) {
        window.clearTimeout(galleryTooltipTimer);
      }
      galleryTooltipTimer = window.setTimeout(openGalleryTooltip, 220);
    }
  }

  function scriptLineToEditorLine(line) {
    // editor lines are zero-indexed, plus 3 lines of boilerplate
    return line - 4;
  }

  function clearErrorsAddHints() {
    var line;
    var i;
    var len;
    hintTimer = undefined;
    closeGalleryTooltip();
    jsEditor.clearGutter("hintGutter");
    jsEditor.clearGutter("highlightGutter");
    jsEditor.clearGutter("errorGutter");
    jsEditor.clearGutter("searchGutter");
    while (errorLines.length > 0) {
      line = errorLines.pop();
      jsEditor.removeLineClass(line, "text");
    }
    while (highlightLines.length > 0) {
      line = highlightLines.pop();
      jsEditor.removeLineClass(line, "text");
    }
    var code = jsEditor.getValue();
    if (searchTerm !== "") {
      var codeLines = code.split("\n");
      for (i = 0, len = codeLines.length; i < len; ++i) {
        if (searchRegExp.test(codeLines[i])) {
          line = jsEditor.setGutterMarker(
            i,
            "searchGutter",
            makeLineLabel("Search: " + searchTerm, "searchMarker")
          );
          jsEditor.addLineClass(line, "text", "searchLine");
          errorLines.push(line);
        }
      }
    }
    // make a copy of the options, JSHint modifies the object it's given
    var options = JSON.parse(JSON.stringify(sandcastleJsHintOptions));
    /*eslint-disable new-cap*/
    if (
      !JSHINT(embedInSandcastleTemplate(jsEditor.getValue(), false), options)
    ) {
      var hints = JSHINT.errors;
      for (i = 0, len = hints.length; i < len; ++i) {
        var hint = hints[i];
        if (hint !== null && defined(hint.reason) && hint.line > 0) {
          line = jsEditor.setGutterMarker(
            scriptLineToEditorLine(hint.line),
            "hintGutter",
            makeLineLabel(hint.reason, "hintMarker")
          );
          jsEditor.addLineClass(line, "text", "hintLine");
          errorLines.push(line);
        }
      }
    }
    /*eslint-enable new-cap*/
  }

  function scheduleHint() {
    if (defined(hintTimer)) {
      window.clearTimeout(hintTimer);
    }
    hintTimer = setTimeout(clearErrorsAddHints, 550);
    highlightRun();
  }

  function scheduleHintNoChange() {
    if (defined(hintTimer)) {
      window.clearTimeout(hintTimer);
    }
    hintTimer = setTimeout(clearErrorsAddHints, 550);
  }

  function scrollToLine(lineNumber) {
    if (defined(lineNumber)) {
      jsEditor.setCursor(lineNumber);
      // set selection twice in order to force the editor to scroll
      // to this location if the cursor is already there
      jsEditor.setSelection(
        {
          line: lineNumber - 1,
          ch: 0,
        },
        {
          line: lineNumber - 1,
          ch: 0,
        }
      );
      jsEditor.focus();
      jsEditor.setSelection(
        {
          line: lineNumber,
          ch: 0,
        },
        {
          line: lineNumber,
          ch: 0,
        }
      );
    }
  }

  function highlightLine(lineNum) {
    var line;
    jsEditor.clearGutter("highlightGutter");
    while (highlightLines.length > 0) {
      line = highlightLines.pop();
      jsEditor.removeLineClass(line, "text");
    }
    if (lineNum > 0) {
      lineNum = scriptLineToEditorLine(lineNum);
      line = jsEditor.setGutterMarker(
        lineNum,
        "highlightGutter",
        makeLineLabel("highlighted by demo", "highlightMarker")
      );
      jsEditor.addLineClass(line, "text", "highlightLine");
      highlightLines.push(line);
      scrollToLine(lineNum);
    }
  }

  var tabs = registry.byId("bottomPanel");

  function showGallery() {
    tabs.selectChild(registry.byId("innerPanel"));
  }

  function hideGallery() {
    closeGalleryTooltip();
    tabs.selectChild(registry.byId("logContainer"));
  }

  tabs.watch("selectedChildWidget", function (name, oldValue, newValue) {
    if (newValue === registry.byId("logContainer")) {
      numberOfNewConsoleMessages = 0;
      registry.byId("logContainer").set("title", "Console");
    }
  });

  function registerScroll(demoContainer) {
    if (document.onmousewheel !== undefined) {
      demoContainer.addEventListener(
        "mousewheel",
        function (e) {
          if (defined(e.wheelDelta) && e.wheelDelta) {
            demoContainer.scrollLeft -= (e.wheelDelta * 70) / 120;
          }
        },
        false
      );
    } else {
      demoContainer.addEventListener(
        "DOMMouseScroll",
        function (e) {
          if (defined(e.detail) && e.detail) {
            demoContainer.scrollLeft += (e.detail * 70) / 3;
          }
        },
        false
      );
    }
  }

  CodeMirror.commands.runCesium = function (cm) {
    clearErrorsAddHints();
    clearRun();
    cesiumContainer.selectChild(bucketPane);
    // Check for a race condition in some browsers where the iframe hasn't loaded yet.
    if (bucketFrame.contentWindow.location.href.indexOf("bucket.html") > 0) {
      bucketFrame.contentWindow.location.reload();
    }
  };

  jsEditor = CodeMirror.fromTextArea(document.getElementById("code"), {
    mode: "javascript",
    gutters: ["hintGutter", "errorGutter", "searchGutter", "highlightGutter"],
    lineNumbers: true,
    matchBrackets: true,
    indentUnit: 2,
    viewportMargin: 1300,
    extraKeys: {
      "Ctrl-Space": "autocomplete",
      F8: "runCesium",
      Tab: "indentMore",
      "Shift-Tab": "indentLess",
    },
  });

  jsEditor.on("cursorActivity", onCursorActivity);
  jsEditor.on("change", scheduleHint);

  htmlEditor = CodeMirror.fromTextArea(document.getElementById("htmlBody"), {
    mode: "text/html",
    lineNumbers: true,
    matchBrackets: true,
    indentUnit: 2,
    viewportMargin: 1300,
    extraKeys: {
      F8: "runCesium",
      Tab: "indentMore",
      "Shift-Tab": "indentLess",
    },
  });

  window.onbeforeunload = function (e) {
    var htmlText = htmlEditor.getValue().replace(/\s/g, "");
    var jsText = jsEditor.getValue().replace(/\s/g, "");
    if (demoHtml !== htmlText || demoCode !== jsText) {
      return "Be sure to save a copy of any important edits before leaving this page.";
    }
  };

  registry
    .byId("codeContainer")
    .watch("selectedChildWidget", function (name, oldPane, newPane) {
      if (newPane.id === "jsContainer") {
        jsEditor.focus();
      } else if (newPane.id === "htmlContainer") {
        htmlEditor.focus();
      }
    });

  var scriptCodeRegex = /\/\/Sandcastle_Begin\s*([\s\S]*)\/\/Sandcastle_End/;

  function activateBucketScripts(bucketDoc) {
    var headNodes = bucketDoc.head.childNodes;
    var node;
    var nodes = [];
    var i, len;
    for (i = 0, len = headNodes.length; i < len; ++i) {
      node = headNodes[i];
      // header is included in blank frame.
      if (
        node.tagName === "SCRIPT" &&
        node.src.indexOf("Sandcastle-header.js") < 0
      ) {
        nodes.push(node);
      }
    }

    for (i = 0, len = nodes.length; i < len; ++i) {
      bucketDoc.head.removeChild(nodes[i]);
    }

    // Apply user HTML to bucket.
    var htmlElement = bucketDoc.createElement("div");
    htmlElement.innerHTML = htmlEditor.getValue();
    bucketDoc.body.appendChild(htmlElement);

    var onScriptTagError = function () {
      if (bucketFrame.contentDocument === bucketDoc) {
        appendConsole("consoleError", "Error loading " + this.src, true);
        appendConsole(
          "consoleError",
          "Make sure Cesium is built, see the Contributor's Guide for details.",
          true
        );
      }
    };

    // Load each script after the previous one has loaded.
    var loadScript = function () {
      if (bucketFrame.contentDocument !== bucketDoc) {
        // A newer reload has happened, abort this.
        return;
      }
      if (nodes.length > 0) {
        while (nodes.length > 0) {
          node = nodes.shift();
          var scriptElement = bucketDoc.createElement("script");
          var hasSrc = false;
          for (
            var j = 0, numAttrs = node.attributes.length;
            j < numAttrs;
            ++j
          ) {
            var name = node.attributes[j].name;
            var val = node.attributes[j].value;
            scriptElement.setAttribute(name, val);
            if (name === "src" && val) {
              hasSrc = true;
            }
          }
          scriptElement.innerHTML = node.innerHTML;
          if (hasSrc) {
            scriptElement.onload = loadScript;
            scriptElement.onerror = onScriptTagError;
            bucketDoc.head.appendChild(scriptElement);
          } else {
            bucketDoc.head.appendChild(scriptElement);
            loadScript();
          }
        }
      } else {
        // Apply user JS to bucket
        var element = bucketDoc.createElement("script");

        // Firefox line numbers are zero-based, not one-based.
        var isFirefox = navigator.userAgent.indexOf("Firefox/") >= 0;

        element.textContent = embedInSandcastleTemplate(
          jsEditor.getValue(),
          isFirefox
        );
        bucketDoc.body.appendChild(element);
      }
    };

    loadScript();
  }

  function applyBucket() {
    if (
      local.emptyBucket &&
      local.bucketName &&
      typeof bucketTypes[local.bucketName] === "string"
    ) {
      bucketWaiting = false;
      var bucketDoc = bucketFrame.contentDocument;
      if (
        local.headers.substring(0, local.emptyBucket.length) !==
        local.emptyBucket
      ) {
        appendConsole(
          "consoleError",
          "Error, first part of " +
            local.bucketName +
            " must match first part of bucket.html exactly.",
          true
        );
      } else {
        var bodyAttributes = local.headers.match(/<body([^>]*?)>/)[1];
        var attributeRegex = /([-a-z_]+)\s*="([^"]*?)"/gi;
        //group 1 attribute name, group 2 attribute value.  Assumes double-quoted attributes.
        var attributeMatch;
        while (
          (attributeMatch = attributeRegex.exec(bodyAttributes)) !== null
        ) {
          var attributeName = attributeMatch[1];
          var attributeValue = attributeMatch[2];
          if (attributeName === "class") {
            bucketDoc.body.className = attributeValue;
          } else {
            bucketDoc.body.setAttribute(attributeName, attributeValue);
          }
        }

        var pos = local.headers.indexOf("</head>");
        var extraHeaders = local.headers.substring(
          local.emptyBucket.length,
          pos
        );
        bucketDoc.head.innerHTML += extraHeaders;
        activateBucketScripts(bucketDoc);
      }
    } else {
      bucketWaiting = true;
    }
  }

  function applyBucketIfWaiting() {
    if (bucketWaiting) {
      applyBucket();
    }
  }

  xhr
    .get({
      url: "templates/bucket.html",
      handleAs: "text",
    })
    .then(function (value) {
      var pos = value.indexOf("</head>");
      local.emptyBucket = value.substring(0, pos);
      applyBucketIfWaiting();
    });

  function loadBucket(bucketName) {
    if (local.bucketName !== bucketName) {
      local.bucketName = bucketName;
      if (defined(bucketTypes[bucketName])) {
        local.headers = bucketTypes[bucketName];
      } else {
        local.headers =
          '<html><head></head><body data-sandcastle-bucket-loaded="no">';
        xhr
          .get({
            url: "templates/" + bucketName,
            handleAs: "text",
          })
          .then(function (value) {
            var pos = value.indexOf("<body");
            pos = value.indexOf(">", pos);
            bucketTypes[bucketName] = value.substring(0, pos + 1);
            if (local.bucketName === bucketName) {
              local.headers = bucketTypes[bucketName];
            }
            applyBucketIfWaiting();
          });
      }
    }
  }

  var queryObject = {};
  if (window.location.search) {
    queryObject = ioQuery.queryToObject(window.location.search.substring(1));
  }
  if (!defined(queryObject.src)) {
    queryObject.src = defaultDemo + ".html";
  }
  if (!defined(queryObject.label)) {
    queryObject.label = defaultLabel;
  }

  function loadFromGallery(demo) {
    deferredLoadError = false;
    document.getElementById("saveAsFile").download = demo.name + ".html";
    registry
      .byId("description")
      .set("value", decodeHTML(demo.description).replace(/\\n/g, "\n"));
    registry
      .byId("label")
      .set("value", decodeHTML(demo.label).replace(/\\n/g, "\n"));

    return requestDemo(demo.name).then(function (value) {
      demo.code = value;

      if (typeof demo.bucket === "string") {
        loadBucket(demo.bucket);
      }

      function applyLoadedDemo(code, html) {
        jsEditor.setValue(code);
        jsEditor.clearHistory();
        htmlEditor.setValue(html);
        htmlEditor.clearHistory();
        demoCode = code.replace(/\s/g, "");
        demoHtml = html.replace(/\s/g, "");
        CodeMirror.commands.runCesium(jsEditor);
        clearRun();
      }

      var json, code, html;
      if (defined(queryObject.gist)) {
        dojoscript
          .get("https://api.github.com/gists/" + queryObject.gist, {
            jsonp: "callback",
          })
          .then(function (data) {
            var files = data.data.files;
            var code = files["Cesium-Sandcastle.js"].content;
            var htmlFile = files["Cesium-Sandcastle.html"];
            var html = defined(htmlFile) ? htmlFile.content : defaultHtml; // Use the default html for old gists
            applyLoadedDemo(code, html);
          })
          .otherwise(function (error) {
            appendConsole(
              "consoleError",
              "Unable to GET gist from GitHub API. This could be due to too many requests from your IP. Try again in an hour or copy and paste the code from the gist: https://gist.github.com/" +
                queryObject.gist,
              true
            );
            console.log(error);
          });
      } else if (defined(queryObject.code)) {
        //The code query parameter is a Base64 encoded JSON string with `code` and `html` properties.
        json = JSON.parse(window.atob(queryObject.code));
        code = json.code;
        html = json.html;

        applyLoadedDemo(code, html);
      } else if (window.location.hash.indexOf("#c=") === 0) {
        var base64String = window.location.hash.substr(3);
        var data = decodeBase64Data(base64String, pako);
        code = data.code;
        html = data.html;

        applyLoadedDemo(code, html);
      } else {
        var parser = new DOMParser();
        var doc = parser.parseFromString(demo.code, "text/html");

        var script = doc.querySelector('script[id="cesium_sandcastle_script"]');
        if (!script) {
          appendConsole(
            "consoleError",
            "Error reading source file: " + demo.name,
            true
          );
          return;
        }

        var scriptMatch = scriptCodeRegex.exec(script.textContent);
        if (!scriptMatch) {
          appendConsole(
            "consoleError",
            "Error reading source file: " + demo.name,
            true
          );
          return;
        }

        var scriptCode = scriptMatch[1];
        scriptCode = scriptCode.replace(/^ {8}/gm, ""); //Account for Prettier spacing

        var htmlText = "";
        var childIndex = 0;
        var childNode = doc.body.childNodes[childIndex];
        while (
          childIndex < doc.body.childNodes.length &&
          childNode !== script
        ) {
          htmlText +=
            childNode.nodeType === 1
              ? childNode.outerHTML
              : childNode.nodeValue;
          childNode = doc.body.childNodes[++childIndex];
        }
        htmlText = htmlText.replace(/^\s+/, "");

        applyLoadedDemo(scriptCode, htmlText);
      }
    });
  }

  window.addEventListener(
    "popstate",
    function (e) {
      if (e.state && e.state.name && e.state.code) {
        loadFromGallery(e.state);
        document.title = e.state.name + " - Cesium Sandcastle";
      }
    },
    false
  );

  window.addEventListener(
    "message",
    function (e) {
      var line;
      // The iframe (bucket.html) sends this message on load.
      // This triggers the code to be injected into the iframe.
      if (e.data === "reload") {
        var bucketDoc = bucketFrame.contentDocument;
        if (!local.bucketName) {
          // Reload fired, bucket not specified yet.
          return;
        }
        if (bucketDoc.body.getAttribute("data-sandcastle-loaded") !== "yes") {
          bucketDoc.body.setAttribute("data-sandcastle-loaded", "yes");
          logOutput.innerHTML = "";
          numberOfNewConsoleMessages = 0;
          registry.byId("logContainer").set("title", "Console");
          // This happens after a Run (F8) reloads bucket.html, to inject the editor code
          // into the iframe, causing the demo to run there.
          applyBucket();
          if (docError) {
            appendConsole(
              "consoleError",
              'Documentation not available.  Please run the "generateDocumentation" build script to generate Cesium documentation.',
              true
            );
            showGallery();
          }
          if (galleryError) {
            appendConsole(
              "consoleError",
              "Error loading gallery, please run the build script.",
              true
            );
          }
          if (deferredLoadError) {
            appendConsole(
              "consoleLog",
              "Unable to load demo named " +
                queryObject.src.replace(".html", "") +
                ". Redirecting to HelloWorld.\n",
              true
            );
          }
        }
      } else if (defined(e.data.log)) {
        // Console log messages from the iframe display in Sandcastle.
        appendConsole("consoleLog", e.data.log, false);
      } else if (defined(e.data.error)) {
        // Console error messages from the iframe display in Sandcastle
        var errorMsg = e.data.error;
        var lineNumber = e.data.lineNumber;
        if (defined(lineNumber)) {
          errorMsg += " (on line ";

          if (e.data.url) {
            errorMsg += lineNumber + " of " + e.data.url + ")";
          } else {
            lineNumber = scriptLineToEditorLine(lineNumber);
            errorMsg += lineNumber + 1 + ")";
            line = jsEditor.setGutterMarker(
              lineNumber,
              "errorGutter",
              makeLineLabel(e.data.error, "errorMarker")
            );
            jsEditor.addLineClass(line, "text", "errorLine");
            errorLines.push(line);
            scrollToLine(lineNumber);
          }
        }
        appendConsole("consoleError", errorMsg, true);
      } else if (defined(e.data.warn)) {
        // Console warning messages from the iframe display in Sandcastle.
        appendConsole("consoleWarn", e.data.warn, true);
      } else if (defined(e.data.highlight)) {
        // Hovering objects in the embedded Cesium window.
        highlightLine(e.data.highlight);
      }
    },
    true
  );

  registry.byId("jsContainer").on("show", function () {
    suggestButton.set("disabled", false);
    jsEditor.refresh();
  });

  registry.byId("htmlContainer").on("show", function () {
    suggestButton.set("disabled", true);
    htmlEditor.refresh();
  });

  registry.byId("search").on("change", function () {
    searchTerm = this.get("value");
    searchRegExp = new RegExp(searchTerm, "i");
    var numDemosShown = 0;
    if (searchTerm !== "") {
      showSearchContainer();
      var innerPanel = registry.byId("innerPanel");
      innerPanel.selectChild(registry.byId("searchContainer"));
      for (var i = 0; i < gallery_demos.length; i++) {
        var demo = gallery_demos[i];
        var demoName = demo.name;
        if (searchRegExp.test(demoName) || searchRegExp.test(demo.code)) {
          document.getElementById(demoName + "searchDemo").style.display =
            "inline-block";
          ++numDemosShown;
        } else {
          document.getElementById(demoName + "searchDemo").style.display =
            "none";
        }
      }
    } else {
      hideSearchContainer();
    }

    if (numDemosShown) {
      galleryErrorMsg.style.display = "none";
    } else {
      galleryErrorMsg.style.display = "inline-block";
    }

    showGallery();
    scheduleHintNoChange();
  });

  var searchContainer;

  function hideSearchContainer() {
    if (dom.byId("searchContainer")) {
      var innerPanel = registry.byId("innerPanel");
      innerPanel.removeChild(searchContainer);
    }
  }

  function showSearchContainer() {
    if (!dom.byId("searchContainer")) {
      var innerPanel = registry.byId("innerPanel");
      innerPanel.addChild(searchContainer);
    }
  }

  function getBaseUrl() {
    // omits query string and hash
    return location.protocol + "//" + location.host + location.pathname;
  }

  function makeCompressedBase64String(data) {
    // data stored in the hash as:
    // Base64 encoded, raw DEFLATE compressed JSON array where index 0 is code, index 1 is html
    var jsonString = JSON.stringify(data);
    // we save a few bytes by omitting the leading [" and trailing "] since they are always the same
    jsonString = jsonString.substr(2, jsonString.length - 4);
    var base64String = btoa(
      pako.deflate(jsonString, { raw: true, to: "string", level: 9 })
    );
    base64String = base64String.replace(/\=+$/, ""); // remove padding

    return base64String;
  }

  registry.byId("buttonShareDrop").on("click", function () {
    var code = jsEditor.getValue();
    var html = htmlEditor.getValue();

    var base64String = makeCompressedBase64String([code, html]);

    var shareUrlBox = document.getElementById("shareUrl");
    shareUrlBox.value = getBaseUrl() + "#c=" + base64String;
    shareUrlBox.select();
  });

  registry.byId("buttonImport").on("click", function () {
    var gistId = document.getElementById("gistId").value;
    var gistParameter = "&gist=";
    var gistIndex = gistId.indexOf(gistParameter);
    if (gistIndex !== -1) {
      gistId = gistId.substring(gistIndex + gistParameter.length);
    }
    window.location.href = getBaseUrl() + "?gist=" + gistId;
  });

  function getPushStateUrl(demo) {
    var obj = {};
    if (demo.name !== defaultDemo) {
      obj.src = demo.name + ".html";
    }
    if (currentTab !== defaultLabel) {
      obj.label = currentTab;
    }
    var query = ioQuery.objectToQuery(obj);
    return query === "" ? query : "?" + query;
  }

  registry.byId("buttonNew").on("click", function () {
    var htmlText = htmlEditor.getValue().replace(/\s/g, "");
    var jsText = jsEditor.getValue().replace(/\s/g, "");
    var confirmChange = true;
    if (demoHtml !== htmlText || demoCode !== jsText) {
      confirmChange = window.confirm(
        "You have unsaved changes. Are you sure you want to navigate away from this demo?"
      );
    }
    if (confirmChange) {
      window.history.pushState(newDemo, newDemo.name, getPushStateUrl(newDemo));
      loadFromGallery(newDemo).then(function () {
        document.title = newDemo.name + " - Cesium Sandcastle";
      });
    }
  });
  // Clicking the 'Run' button simply reloads the iframe.
  registry.byId("buttonRun").on("click", function () {
    CodeMirror.commands.runCesium(jsEditor);
  });

  registry.byId("buttonSuggest").on("click", function () {
    CodeMirror.commands.autocomplete(jsEditor);
  });

  function getDemoHtml() {
    return (
      local.headers +
      "\n" +
      htmlEditor.getValue() +
      '<script id="cesium_sandcastle_script">\n' +
      embedInSandcastleTemplate(jsEditor.getValue(), false) +
      "</script>\n" +
      "</body>\n" +
      "</html>\n"
    );
  }

  registry.byId("dropDownSaveAs").on("show", function () {
    var currentDemoName = queryObject.src;
    currentDemoName = currentDemoName.replace(".html", "");
    var description = encodeHTML(
      registry.byId("description").get("value").replace(/\n/g, "\\n")
    ).replace(/\"/g, "&quot;");
    var label = encodeHTML(
      registry.byId("label").get("value").replace(/\n/g, "\\n")
    ).replace(/\"/g, "&quot;");

    var html = getDemoHtml();
    html = html.replace(
      "<title>",
      '<meta name="description" content="' + description + '">\n    <title>'
    );
    html = html.replace(
      "<title>",
      '<meta name="cesium-sandcastle-labels" content="' +
        label +
        '">\n    <title>'
    );

    var octetBlob = new Blob([html], {
      type: "application/octet-stream",
      endings: "native",
    });
    var octetBlobURL = URL.createObjectURL(octetBlob);
    dom.byId("saveAsFile").href = octetBlobURL;
  });

  registry.byId("buttonNewWindow").on("click", function () {
    //Handle case where demo is in a sub-directory by modifying
    //the demo's HTML to add a base href.
    var baseHref = getBaseUrl();
    var pos = baseHref.lastIndexOf("/");
    baseHref = baseHref.substring(0, pos) + "/gallery/";

    var code = jsEditor.getValue();
    var html = htmlEditor.getValue();
    var data = makeCompressedBase64String([code, html, baseHref]);

    var url = getBaseUrl();
    url = url.replace("index.html", "") + "standalone.html" + "#c=" + data;

    window.open(url, "_blank");
    window.focus();
  });

  registry.byId("buttonThumbnail").on("change", function (newValue) {
    if (newValue) {
      domClass.add("bucketFrame", "makeThumbnail");
    } else {
      domClass.remove("bucketFrame", "makeThumbnail");
    }
  });

  var demoContainers = query(".demosContainer");
  demoContainers.forEach(function (demoContainer) {
    registerScroll(demoContainer);
  });

  var galleryContainer = registry.byId("innerPanel");
  galleryContainer.demoTileHeightRule = demoTileHeightRule;
  galleryContainer.originalResize = galleryContainer.resize;
  galleryContainer.resize = function (changeSize, resultSize) {
    var newSize = changeSize.h - 88;
    if (newSize < 20) {
      demoTileHeightRule.style.display = "none";
    } else {
      demoTileHeightRule.style.display = "inline";
      demoTileHeightRule.style.height = Math.min(newSize, 150) + "px";
    }
    this.originalResize(changeSize, resultSize);
  };

  function requestDemo(name) {
    return xhr.get({
      url: "gallery/" + name + ".html",
      handleAs: "text",
      error: function (error) {
        loadFromGallery(gallery_demos[hello_world_index]).then(function () {
          deferredLoadError = true;
        });
      },
    });
  }

  var newInLabel = "New in " + VERSION;
  function loadDemoFromFile(demo) {
    return requestDemo(demo.name).then(function (value) {
      // Store the file contents for later searching.
      demo.code = value;

      var parser = new DOMParser();
      var doc = parser.parseFromString(value, "text/html");

      var bucket = doc.body.getAttribute("data-sandcastle-bucket");
      demo.bucket = bucket ? bucket : "bucket-requirejs.html";

      var descriptionMeta = doc.querySelector('meta[name="description"]');
      var description =
        descriptionMeta && descriptionMeta.getAttribute("content");
      demo.description = description ? description : "";

      var labelsMeta = doc.querySelector(
        'meta[name="cesium-sandcastle-labels"]'
      );
      var labels = labelsMeta && labelsMeta.getAttribute("content");
      if (demo.isNew) {
        demo.label = labels ? labels + "," + newInLabel : newInLabel;
      } else {
        demo.label = labels ? labels : "";
      }

      // Select the demo to load upon opening based on the query parameter.
      if (defined(queryObject.src)) {
        if (demo.name === queryObject.src.replace(".html", "")) {
          loadFromGallery(demo).then(function () {
            window.history.replaceState(demo, demo.name, getPushStateUrl(demo));
            if (defined(queryObject.gist)) {
              document.title = "Gist Import - Cesium Sandcastle";
            } else {
              document.title = demo.name + " - Cesium Sandcastle";
            }
          });
        }
      }

      // Create a tooltip containing the demo's description.
      demoTooltips[demo.name] = new TooltipDialog({
        id: demo.name + "TooltipDialog",
        style: "width: 200px; font-size: 12px;",
        content: demo.description.replace(/\\n/g, "<br/>"),
      });

      addFileToTab(demo);
      return demo;
    });
  }

  var loading = true;
  function setSubtab(tabName) {
    currentTab = defined(tabName) && !loading ? tabName : queryObject.label;
    queryObject.label = tabName;
    loading = false;
  }

  function insertSortedById(parentTab, galleryButton) {
    var child;
    for (
      child = parentTab.lastChild;
      child !== null;
      child = child.previousSibling
    ) {
      if (galleryButton.id >= child.id) {
        parentTab.insertBefore(galleryButton, child.nextSibling);
        return;
      }
    }
    parentTab.appendChild(galleryButton);
  }

  function addFileToGallery(demo) {
    var searchDemos = dom.byId("searchDemos");
    insertSortedById(searchDemos, createGalleryButton(demo, "searchDemo"));
    return loadDemoFromFile(demo);
  }

  function onShowCallback() {
    return function () {
      setSubtab(this.title);
    };
  }

  function addFileToTab(demo) {
    if (demo.label !== "") {
      var labels = demo.label.split(",");
      for (var j = 0; j < labels.length; j++) {
        var label = labels[j];
        label = label.trim();
        if (!dom.byId(label + "Demos")) {
          var cp = new ContentPane({
            content:
              '<div id="' +
              label +
              'Container" class="demosContainer"><div class="demos" id="' +
              label +
              'Demos"></div></div>',
            title: label,
            onShow: onShowCallback(),
          }).placeAt("innerPanel");
          subtabs[label] = cp;
          registerScroll(dom.byId(label + "Container"));
        }
        var tabName = label + "Demos";
        var tab = dom.byId(tabName);
        insertSortedById(tab, createGalleryButton(demo, tabName));
      }
    }
  }

  function createGalleryButton(demo, tabName) {
    var imgSrc = "templates/Gallery_tile.jpg";
    if (defined(demo.img)) {
      imgSrc = "gallery/" + demo.img;
    }

    var demoLink = document.createElement("a");
    demoLink.id = demo.name + tabName;
    demoLink.className = "linkButton";
    demoLink.href = "gallery/" + encodeURIComponent(demo.name) + ".html";

    if (demo.name === "Hello World") {
      newDemo = demo;
    }
    demoLink.onclick = function (e) {
      if (mouse.isMiddle(e)) {
        window.open("gallery/" + demo.name + ".html");
      } else {
        var htmlText = htmlEditor.getValue().replace(/\s/g, "");
        var jsText = jsEditor.getValue().replace(/\s/g, "");
        var confirmChange = true;
        if (demoHtml !== htmlText || demoCode !== jsText) {
          confirmChange = window.confirm(
            "You have unsaved changes. Are you sure you want to navigate away from this demo?"
          );
        }
        if (confirmChange) {
          delete queryObject.gist;
          delete queryObject.code;

          window.history.pushState(demo, demo.name, getPushStateUrl(demo));
          loadFromGallery(demo).then(function () {
            document.title = demo.name + " - Cesium Sandcastle";
          });
        }
      }
      e.preventDefault();
    };

    new LinkButton({
      label:
        '<div class="demoTileTitle">' +
        demo.name +
        "</div>" +
        '<img src="' +
        imgSrc +
        '" class="demoTileThumbnail" alt="" onDragStart="return false;" />',
    }).placeAt(demoLink);

    on(demoLink, "mouseover", function () {
      scheduleGalleryTooltip(demo);
    });

    on(demoLink, "mouseout", function () {
      closeGalleryTooltip();
    });

    return demoLink;
  }

  var promise;
  if (!defined(gallery_demos)) {
    galleryErrorMsg.textContent =
      "No demos found, please run the build script.";
    galleryErrorMsg.style.display = "inline-block";
  } else {
    var label = "Showcases";
    var cp = new ContentPane({
      content:
        '<div id="showcasesContainer" class="demosContainer"><div class="demos" id="ShowcasesDemos"></div></div>',
      title: "Showcases",
      onShow: function () {
        setSubtab(this.title);
      },
    }).placeAt("innerPanel");
    subtabs[label] = cp;
    registerScroll(dom.byId("showcasesContainer"));

    if (has_new_gallery_demos) {
      var name = "New in " + VERSION;
      subtabs[name] = new ContentPane({
        content:
          '<div id="' +
          name +
          'Container" class="demosContainer"><div class="demos" id="' +
          name +
          'Demos"></div></div>',
        title: name,
        onShow: function () {
          setSubtab(this.title);
        },
      }).placeAt("innerPanel");
      registerScroll(dom.byId(name + "Container"));
    }

    var i;
    var len = gallery_demos.length;

    var queryInGalleryIndex = false;
    var queryName = queryObject.src.replace(".html", "");
    var promises = [];
    for (i = 0; i < len; ++i) {
      promises.push(addFileToGallery(gallery_demos[i]));
    }

    promise = all(promises).then(function (results) {
      var resultsLength = results.length;
      for (i = 0; i < resultsLength; ++i) {
        if (results[i].name === queryName) {
          queryInGalleryIndex = true;
        }
      }

      label = "All";
      cp = new ContentPane({
        content:
          '<div id="allContainer" class="demosContainer"><div class="demos" id="allDemos"></div></div>',
        title: label,
        onShow: function () {
          setSubtab(this.title);
        },
      }).placeAt("innerPanel");
      subtabs[label] = cp;
      registerScroll(dom.byId("allContainer"));

      var demos = dom.byId("allDemos");
      for (i = 0; i < len; ++i) {
        var demo = gallery_demos[i];
        if (!/Development/i.test(demo.label)) {
          insertSortedById(demos, createGalleryButton(demo, "all"));
        }
      }

      if (!queryInGalleryIndex) {
        var emptyDemo = {
          name: queryName,
          description: "",
        };
        gallery_demos.push(emptyDemo);
        return addFileToGallery(emptyDemo);
      }
    });
  }

  when(promise).then(function () {
    dom.byId("searchDemos").appendChild(galleryErrorMsg);
    searchContainer = registry.byId("searchContainer");

    hideSearchContainer();
    if (defined(subtabs[currentTab])) {
      registry.byId("innerPanel").selectChild(subtabs[currentTab]);
    }
  });
});
