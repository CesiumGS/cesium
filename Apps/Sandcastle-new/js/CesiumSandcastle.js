/*global require,Blob,CodeMirror,JSHINT*/
/*global gallery_demos*/// defined by gallery/gallery-index.js, created by build
/*global sandcastleJsHintOptions*/// defined by jsHintOptions.js, created by build
require({
  baseUrl : '.',
  shim : {
    bootstrap : { "deps" :['jquery'] }
  },
  paths: {
    jquery: '//code.jquery.com/jquery-1.11.2.min',
    bootstrap: '../../ThirdParty/bootstrap-3.3.2/js/bootstrap.min',
    react: '//fb.me/react-with-addons-0.13.3',
    JSXTransformer: '//fb.me/JSXTransformer-0.13.3',
    text: 'js/text',
    jsx: 'js/jsx'
  },
  // jsx: {
    // fileExtension: '.jsx',
    // harmony: true,
    // stripTypes: true
  // },
  packages : [{
    name: 'bootstrap',
    location: '../../ThirdParty/bootstrap-3.3.2/js'
  }, {
    name : 'Source',
    location : '../../Source'
  }, {
    name : 'CodeMirror',
    location : '../../ThirdParty/codemirror-4.6'
  }]
},[
  'react',
  'jsx!js/SandcastleApp',
  'jquery',
  'Source/Cesium',
  'CodeMirror/lib/codemirror',
  'CodeMirror/addon/hint/show-hint',
  'CodeMirror/addon/hint/javascript-hint',
  'CodeMirror/mode/javascript/javascript',
  'CodeMirror/mode/css/css',
  'CodeMirror/mode/xml/xml',
  'CodeMirror/mode/htmlmixed/htmlmixed',
  'bootstrap'
  ], function(
  React,
  SandcastleApp,
  $,
  Cesium,
  CodeMirror) {
  "use strict";

  //In order for CodeMirror auto-complete to work, Cesium needs to be defined as a global.
  window.Cesium = Cesium;

  function defined(value) {
      return value !== undefined;
  }

  React.render(
    React.createElement(SandcastleApp, null),
    document.getElementById('appLayout')
  );

  var local = {
      'docTypes' : [],
      'headers' : '<html><head></head><body>',
      'bucketName' : '',
      'emptyBucket' : ''
  };
  var galleryErrorMsg = document.createElement('span');
  galleryErrorMsg.className = 'galleryError';
  galleryErrorMsg.style.display = 'none';
  galleryErrorMsg.textContent = 'No demos match your search terms.';
  var bucketWaiting = true;
  var bucketTypes = {};
  var bucketFrame = document.getElementById('bucketFrame');
  var jsEditor = $('#jsContainer .CodeMirror')[0].CodeMirror;
  var htmlEditor = $('#htmlContainer .CodeMirror')[0].CodeMirror;

  function getScriptFromEditor(addExtraLine) {
    return 'function startup(Cesium) {\n' +
           '    "use strict";\n' +
           '//Sandcastle_Begin\n' +
           (addExtraLine ? '\n' : '') +
           jsEditor.getValue() +
           '//Sandcastle_End\n' +
           '    Sandcastle.finishedLoading();\n' +
           '}\n' +
           'if (typeof Cesium !== "undefined") {\n' +
           '    startup(Cesium);\n' +
           '} else if (typeof require === "function") {\n' +
           '    require(["Cesium"], startup);\n' +
           '}\n';
  }


  function activateBucketScripts(bucketDoc) {
    var headNodes = bucketDoc.head.childNodes;
    var node;
    var nodes = [];
    for (var i = 0, len = headNodes.length; i < len; ++i) {
        node = headNodes[i];
        // header is included in blank frame.
        if (node.tagName === 'SCRIPT' && node.src.indexOf('Sandcastle-header.js') < 0) {
            nodes.push(node);
        }
    }

    for (i = 0, len = nodes.length; i < len; ++i) {
        bucketDoc.head.removeChild(nodes[i]);
    }

    // Apply user HTML to bucket.
    var htmlElement = bucketDoc.createElement('div');
    htmlElement.innerHTML = htmlEditor.getValue();
    bucketDoc.body.appendChild(htmlElement);

    var onScriptTagError = function() {
        if (bucketFrame.contentDocument === bucketDoc) {
            appendConsole('consoleError', 'Error loading ' + this.src, true);
            appendConsole('consoleError', "Make sure Cesium is built, see the Contributor's Guide for details.", true);
        }
    };

    // Load each script after the previous one has loaded.
    var loadScript = function() {
        if (bucketFrame.contentDocument !== bucketDoc) {
            // A newer reload has happened, abort this.
            return;
        }
        if (nodes.length > 0) {
            node = nodes.shift();
            var scriptElement = bucketDoc.createElement('script');
            var hasSrc = false;
            for (var j = 0, numAttrs = node.attributes.length; j < numAttrs; ++j) {
                var name = node.attributes[j].name;
                var val = node.attributes[j].value;
                scriptElement.setAttribute(name, val);
                if (name === 'src' && val) {
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
        } else {
            // Apply user JS to bucket
            var element = bucketDoc.createElement('script');

            // Firefox line numbers are zero-based, not one-based.
            var isFirefox = navigator.userAgent.indexOf('Firefox/') >= 0;

            element.textContent = getScriptFromEditor(isFirefox);
            bucketDoc.body.appendChild(element);
        }
    };
    loadScript();
  }

  function applyBucket() {
    if (local.emptyBucket && local.bucketName && typeof bucketTypes[local.bucketName] === 'string') {
        bucketWaiting = false;
        // console.log(bucketFrame);
        var bucketDoc = bucketFrame.contentDocument;
        if (local.headers.substring(0, local.emptyBucket.length) !== local.emptyBucket) {
            console.log('Error, first part of ' + local.bucketName + ' must match first part of bucket.html exactly.', true);
        } else {
            var bodyAttributes = local.headers.match(/<body([^>]*?)>/)[1];
            var attributeRegex = /([-a-z_]+)\s*="([^"]*?)"/ig;
            //group 1 attribute name, group 2 attribute value.  Assumes double-quoted attributes.
            var attributeMatch;
            while ((attributeMatch = attributeRegex.exec(bodyAttributes)) !== null) {
                var attributeName = attributeMatch[1];
                var attributeValue = attributeMatch[2];
                if (attributeName === 'class') {
                    bucketDoc.body.className = attributeValue;
                } else {
                    bucketDoc.body.setAttribute(attributeName, attributeValue);
                }
            }

            var pos = local.headers.indexOf('</head>');
            var extraHeaders = local.headers.substring(local.emptyBucket.length, pos);
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

  $.ajax({
      url : 'templates/bucket.html',
      dataType : 'text'
  }).done(function(value) {
      var pos = value.indexOf('</head>');
      local.emptyBucket = value.substring(0, pos);
      applyBucketIfWaiting();
  });


  var queryObject = {};
  if (window.location.search) {
      var query = window.location.search.substring(1).split('&');
      for(var i = 0; i < query.length; ++i){
          var tags = query[i].split('=');
          queryObject[tags[0]] = tags[1];
      }
  } else {
      queryObject.src = 'Hello World.html';
      queryObject.label = 'Showcases';
  }

  function loadBucket(bucketName) {
      if (local.bucketName !== bucketName) {
          local.bucketName = bucketName;
          if (defined(bucketTypes[bucketName])) {
              local.headers = bucketTypes[bucketName];
          } else {
              local.headers = '<html><head></head><body data-sandcastle-bucket-loaded="no">';
              $.ajax({
                  url : 'templates/' + bucketName,
                  dataType : 'text'
              }).done(function(value) {
                  var pos = value.indexOf('<body');
                  pos = value.indexOf('>', pos);
                  bucketTypes[bucketName] = value.substring(0, pos + 1);
                  if (local.bucketName === bucketName) {
                      local.headers = bucketTypes[bucketName];
                  }
                  applyBucketIfWaiting();
              });
          }
      }
  }

  var scriptCodeRegex = /\/\/Sandcastle_Begin\s*([\s\S]*)\/\/Sandcastle_End/;

  function loadFromGallery(demo) {
      // document.getElementById('saveAsFile').download = demo.name + '.html';
      // $('#description').text(decodeHTML(demo.description).replace(/\\n/g, '\n'));
      // $('#label').text(decodeHTML(demo.label).replace(/\\n/g, '\n'));

      //requestDemo is synchronous
      requestDemo(demo.name).then(function(value) {
          demo.code = value;
      });

      var parser = new DOMParser();
      var doc = parser.parseFromString(demo.code, 'text/html');

      var script = doc.querySelector('script[id="cesium_sandcastle_script"]');
      if (!script) {
          appendConsole('consoleError', 'Error reading source file: ' + demo.name, true);
          return;
      }

      var scriptMatch = scriptCodeRegex.exec(script.textContent);
      if (!scriptMatch) {
          appendConsole('consoleError', 'Error reading source file: ' + demo.name, true);
          return;
      }

      var scriptCode = scriptMatch[1];
      jsEditor.setValue(scriptCode);
      jsEditor.clearHistory();

      var htmlText = '';
      var childIndex = 0;
      var childNode = doc.body.childNodes[childIndex];
      while (childIndex < doc.body.childNodes.length && childNode !== script) {
          htmlText += childNode.nodeType === 1 ? childNode.outerHTML : childNode.nodeValue;
          childNode = doc.body.childNodes[++childIndex];
      }
      htmlText = htmlText.replace(/^\s+/, '');

      htmlEditor.setValue(htmlText);
      htmlEditor.clearHistory();

      if (typeof demo.bucket === 'string') {
          loadBucket(demo.bucket);
      }
      // CodeMirror.commands.runCesium(jsEditor);
  }

  function requestDemo(name) {
      return $.ajax({
          url : 'gallery/' + name + '.html',
          handleAs : 'text',
          sync : true,
          error : function(error) {
              appendConsole('consoleError', error, true);
              galleryError = true;
          }
      });
  }

  if (!defined(gallery_demos)) {
      galleryErrorMsg.textContent = 'No demos found, please run the build script.';
      galleryErrorMsg.style.display = 'inline-block';
  } else {
      var label = 'Showcases';

      var len = gallery_demos.length;

      var i;
      // Sort alphabetically.  This will eventually be a user option.
      gallery_demos.sort(function(a, b) {
          var aName = a.name.toUpperCase();
          var bName = b.name.toUpperCase();
          return bName < aName ? 1 : bName > aName ? -1 : 0;
      });

      var queryInGalleryIndex = false;
      var queryName = queryObject.src.replace('.html', '');
      for (i = 0; i < len; ++i) {
          loadDemoFromFile(i);
          if (gallery_demos[i].name === queryName) {
              queryInGalleryIndex = true;
          }
      }

      label = 'All';

      var demos = $('#'+label+'Demos');

      if (!queryInGalleryIndex) {
          gallery_demos.push({
              name : queryName,
              description : ''
          });
          // addFileToGallery(gallery_demos.length - 1);
      }
  }

  function loadDemoFromFile(index) {
      var demo = gallery_demos[index];

      requestDemo(demo.name).then(function(value) {
          // Store the file contents for later searching.
          demo.code = value;

          var parser = new DOMParser();
          var doc = parser.parseFromString(value, 'text/html');

          var bucket = doc.body.getAttribute('data-sandcastle-bucket');
          demo.bucket = bucket ? bucket : 'bucket-requirejs.html';

          var descriptionMeta = doc.querySelector('meta[name="description"]');
          var description = descriptionMeta && descriptionMeta.getAttribute('content');
          demo.description = description ? description : '';

          var labelsMeta = doc.querySelector('meta[name="cesium-sandcastle-labels"]');
          var labels = labelsMeta && labelsMeta.getAttribute('content');
          demo.label = labels ? labels : '';

          // Select the demo to load upon opening based on the query parameter.
          if (defined(queryObject.src)) {
              if (demo.name === "Hello World") {
                  loadFromGallery(demo);
                  window.history.replaceState(demo, demo.name, '?src=' + demo.name + '.html&label=' + queryObject.label);
                  document.title = demo.name + ' - Cesium Sandcastle';
              }
          }

          // addFileToTab(index);
      });
  }
});
