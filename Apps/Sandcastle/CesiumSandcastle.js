/*global require,Blob,CodeMirror,JSHINT*/
/*global gallery_demos*/// defined by gallery/gallery-index.js, created by build
/*global sandcastleJsHintOptions*/// defined by jsHintOptions.js, created by build
require({
    baseUrl : '../../Source',
    packages : [{
        name : 'dojo',
        location : '../ThirdParty/dojo-release-1.8.3-src/dojo'
    }, {
        name : 'dijit',
        location : '../ThirdParty/dojo-release-1.8.3-src/dijit'
    }, {
        name : 'dojox',
        location : '../ThirdParty/dojo-release-1.8.3-src/dojox'
    }, {
        name : 'Sandcastle',
        location : '../Apps/Sandcastle'
    }]
}, [
    'Sandcastle/LinkButton',
    'Widgets/Dojo/CesiumViewerWidget',
    'dojo/mouse',
    'dojo/on',
    'dojo/parser',
    'dojo/dom',
    'dojo/dom-class',
    'dojo/dom-construct',
    'dojo/io-query',
    'dojo/_base/fx',
    'dojo/_base/window',
    'dojo/_base/xhr',
    'dijit/registry',
    'dijit/popup',
    'dijit/TooltipDialog',
    'dijit/layout/ContentPane',
    'dijit/form/Button',
    'dijit/form/DropDownButton',
    'dijit/form/ToggleButton',
    'dijit/form/DropDownButton',
    'dijit/form/TextBox',
    'dijit/form/Textarea',
    'dijit/Menu',
    'dijit/MenuBar',
    'dijit/PopupMenuBarItem',
    'dijit/MenuItem',
    'dijit/layout/BorderContainer',
    'dijit/layout/TabContainer',
    'dijit/Toolbar',
    'dijit/ToolbarSeparator',
    'dojo/domReady!'
], function(
    LinkButton,
    CesiumViewerWidget,
    mouse,
    on,
    parser,
    dom,
    domClass,
    domConstruct,
    ioQuery,
    fx,
    win,
    xhr,
    registry,
    popup,
    TooltipDialog,
    ContentPane) {
    "use strict";

    parser.parse();

    window.CesiumViewerWidget = CesiumViewerWidget; // for autocomplete.
    fx.fadeOut({
        node : 'loading',
        onEnd : function() {
            domConstruct.destroy('loading');
        }
    }).play();

    var logOutput = document.getElementById('logOutput');
    function appendConsole(className, message) {
        var ele = document.createElement('span');
        ele.className = className;
        ele.textContent = message + '\n';
        logOutput.appendChild(ele);
        logOutput.parentNode.scrollTop = logOutput.clientHeight + 8 - logOutput.parentNode.clientHeight;
        hideGallery();
    }

    var getURL = window.URL || window.webkitURL || window;
    if (typeof Blob === 'undefined') {
        registry.byId('buttonSaveAs').set('disabled', true);
        registry.byId('buttonNewWindow').set('disabled', true);
    }

    function findCssStyle(selectorText) {
        for ( var iSheets = 0, lenSheets = document.styleSheets.length; iSheets < lenSheets; ++iSheets) {
            var rules = document.styleSheets[iSheets].cssRules;
            for ( var iRules = 0, lenRules = rules.length; iRules < lenRules; ++iRules) {
                if (rules[iRules].selectorText === selectorText) {
                    return rules[iRules];
                }
            }
        }
    }

    var jsEditor;
    var htmlEditor;
    var addExtraLine = false;
    var suggestButton = registry.byId('buttonSuggest');
    var docTimer;
    var docTabs = {};
    var docError = false;
    var galleryError = false;
    var galleryTooltipTimer;
    var activeGalleryTooltipDemo;
    var demoTileHeightRule = findCssStyle('.demoTileThumbnail');
    var cesiumContainer = registry.byId('cesiumContainer');
    var docNode = dom.byId('docPopup');
    var docMessage = dom.byId('docPopupMessage');
    var local = {
        'docTypes' : [],
        'headers' : '<html><head></head><body>',
        'bucketName' : '',
        'emptyBucket' : ''
    };
    var bucketTypes = {};
    var demoTooltips = {};
    var errorLines = [];
    var highlightLines = [];
    var searchTerm = '';
    var searchRegExp;
    var hintTimer;

    var galleryErrorMsg = document.createElement('span');
    galleryErrorMsg.className = 'galleryError';
    galleryErrorMsg.style.display = 'none';
    galleryErrorMsg.textContent = 'No demos match your search terms.';

    if (navigator.userAgent.indexOf('Firefox/') >= 0) {
        // FireFox line numbers are zero-based, not one-based.
        addExtraLine = true;
    }

    var bucketFrame = document.getElementById('bucketFrame');
    var bucketPane = registry.byId('bucketPane');
    var bucketWaiting = false;

    xhr.get({
        url : '../../Build/Documentation/types.txt',
        handleAs : 'json',
        error : function(error) {
            docError = true;
        }
    }).then(function(value) {
        local.docTypes = value;
    });

    var decoderSpan = document.createElement('span');
    function encodeHTML(text) {
        decoderSpan.textContent = text;
        text = decoderSpan.innerHTML;
        decoderSpan.innerHTML = '';
        return text;
    }
    function decodeHTML(text) {
        decoderSpan.innerHTML = text;
        text = decoderSpan.textContent;
        decoderSpan.innerHTML = '';
        return text;
    }

    function highlightRun() {
        domClass.add(registry.byId('buttonRun').domNode, 'highlightToolbarButton');
    }

    function clearRun() {
        domClass.remove(registry.byId('buttonRun').domNode, 'highlightToolbarButton');
    }

    function highlightSaveAs() {
        domClass.add(registry.byId('buttonSaveAs').domNode, 'highlightToolbarButton');
    }

    function clearSaveAs() {
        domClass.remove(registry.byId('buttonSaveAs').domNode, 'highlightToolbarButton');
    }

    function openDocTab(title, link) {
        if (typeof docTabs[title] === 'undefined') {
            docTabs[title] = new ContentPane({
                title : title,
                focused : true,
                content : '<iframe class="fullFrame" src="' + link + '"></iframe>',
                closable : true,
                onClose : function() {
                    docTabs[this.title] = undefined;
                    // Return true to close the tab.
                    return true;
                }
            }).placeAt(cesiumContainer);
            // After the iframe loads, re-scroll to selected field.
            docTabs[title].domNode.childNodes[0].onload = function() {
                this.onload = function() {
                };
                this.src = link;
            };
            cesiumContainer.selectChild(docTabs[title]);
        } else {
            // Tab already exists, but maybe not visible.  FireFox needs the tab to
            // be revealed before a re-scroll can happen.  Chrome works either way.
            cesiumContainer.selectChild(docTabs[title]);
            docTabs[title].domNode.childNodes[0].src = link;
        }
    }

    function showDocPopup() {
        var selectedText = jsEditor.getSelection();
        var lowerText = selectedText.toLowerCase();

        var onDocClick = function() {
            openDocTab(this.textContent, this.href);
            return false;
        };

        docTimer = undefined;
        if (docError && selectedText && selectedText.length < 50) {
            hideGallery();
        } else if (lowerText && lowerText in local.docTypes && typeof local.docTypes[lowerText].push === 'function') {
            docMessage.innerHTML = '';
            for ( var i = 0, len = local.docTypes[lowerText].length; i < len; ++i) {
                var member = local.docTypes[lowerText][i];
                var ele = document.createElement('a');
                ele.target = '_blank';
                ele.textContent = member.replace('.html', '').replace('module-', '').replace('#', '.');
                ele.href = '../../Build/Documentation/' + member;
                ele.onclick = onDocClick;
                docMessage.appendChild(ele);
            }
            jsEditor.addWidget(jsEditor.getCursor(true), docNode);
            docNode.style.top = (parseInt(docNode.style.top, 10) - 5) + 'px';
        }
    }

    function onCursorActivity() {
        docNode.style.left = '-999px';
        if (typeof docTimer !== 'undefined') {
            window.clearTimeout(docTimer);
        }
        docTimer = window.setTimeout(showDocPopup, 500);
    }

    var abbrDiv = document.createElement('div');
    var abbrEle = document.createElement('abbr');
    abbrEle.textContent = '%N%';
    abbrDiv.appendChild(abbrEle);

    function makeLineLabel(msg) {
        abbrEle.title = msg;
        return abbrDiv.innerHTML;
    }

    function closeGalleryTooltip() {
        if (typeof activeGalleryTooltipDemo !== 'undefined') {
            popup.close(demoTooltips[activeGalleryTooltipDemo.name]);
            activeGalleryTooltipDemo = undefined;
        }
    }

    function openGalleryTooltip() {
        galleryTooltipTimer = undefined;

        var selectedTabName = registry.byId('innerPanel').selectedChildWidget.title;
        var suffix = selectedTabName + 'Demos';
        if (selectedTabName === 'All') {
            suffix = '';
        } else if (selectedTabName === 'Search Results') {
            suffix = 'searchDemo';
        }

        if (typeof activeGalleryTooltipDemo !== 'undefined') {
            popup.open({
                popup : demoTooltips[activeGalleryTooltipDemo.name],
                around : dom.byId(activeGalleryTooltipDemo.name + suffix),
                orient : ['above', 'below']
            });
        }
    }

    function scheduleGalleryTooltip(demo) {
        if (demo !== activeGalleryTooltipDemo) {
            activeGalleryTooltipDemo = demo;
            if (typeof galleryTooltipTimer !== 'undefined') {
                window.clearTimeout(galleryTooltipTimer);
            }
            galleryTooltipTimer = window.setTimeout(openGalleryTooltip, 220);
        }
    }

    function clearErrorsAddHints() {
        var line;
        var i;
        var len;
        hintTimer = undefined;
        closeGalleryTooltip();
        while (errorLines.length > 0) {
            line = errorLines.pop();
            jsEditor.setLineClass(line, null);
            jsEditor.clearMarker(line);
        }
        while (highlightLines.length > 0) {
            line = highlightLines.pop();
            jsEditor.setLineClass(line, null);
            jsEditor.clearMarker(line);
        }
        var code = jsEditor.getValue();
        if (searchTerm !== '') {
            var codeLines = code.split('\n');
            for (i = 0, len = codeLines.length; i < len; ++i) {
                if (searchRegExp.test(codeLines[i])) {
                    line = jsEditor.setMarker(i, makeLineLabel('Search: ' + searchTerm), 'searchMarker');
                    jsEditor.setLineClass(line, 'searchLine');
                    errorLines.push(line);
                }
            }
        }
        if (!JSHINT(code, sandcastleJsHintOptions)) {
            var hints = JSHINT.errors;
            for (i = 0, len = hints.length; i < len; ++i) {
                var hint = hints[i];
                if ((hint !== null) && (typeof hint.reason !== 'undefined') && (hint.line > 0)) {
                    line = jsEditor.setMarker(hint.line - 1, makeLineLabel(hint.reason), 'hintMarker');
                    jsEditor.setLineClass(line, 'hintLine');
                    errorLines.push(line);
                }
            }
        }
    }

    function scheduleHint() {
        if (typeof hintTimer !== 'undefined') {
            window.clearTimeout(hintTimer);
        }
        hintTimer = setTimeout(clearErrorsAddHints, 550);
        highlightRun();
    }

    function scheduleHintNoChange() {
        if (typeof hintTimer !== 'undefined') {
            window.clearTimeout(hintTimer);
        }
        hintTimer = setTimeout(clearErrorsAddHints, 550);
    }

    function scrollToLine(lineNumber) {
        if (typeof lineNumber !== 'undefined') {
            jsEditor.setCursor(lineNumber);
            jsEditor.setSelection({
                line : lineNumber - 2,
                ch : 0
            }, {
                line : lineNumber - 2,
                ch : 0
            });
            jsEditor.focus();
            jsEditor.setSelection({
                line : lineNumber - 1,
                ch : 0
            }, {
                line : lineNumber - 1,
                ch : 0
            });
        }
    }

    function highlightLine(lineNum) {
        var line;
        while (highlightLines.length > 0) {
            line = highlightLines.pop();
            jsEditor.setLineClass(line, null);
            jsEditor.clearMarker(line);
        }
        if (lineNum > 0) {
            line = jsEditor.setMarker(lineNum - 1, makeLineLabel('highlighted by demo'), 'highlightMarker');
            jsEditor.setLineClass(line, 'highlightLine');
            highlightLines.push(line);
            scrollToLine(lineNum);
        }
    }

    var tabs = registry.byId('bottomPanel');

    function showGallery() {
        tabs.selectChild(registry.byId('innerPanel'));
    }

    function hideGallery() {
        closeGalleryTooltip();
        tabs.selectChild(registry.byId('logContainer'));
    }

    CodeMirror.commands.runCesium = function(cm) {
        clearErrorsAddHints();
        clearRun();
        cesiumContainer.selectChild(bucketPane);
        // Check for a race condition in some browsers where the iframe hasn't loaded yet.
        if (bucketFrame.contentWindow.location.href.indexOf('bucket.html') > 0) {
            bucketFrame.contentWindow.location.reload();
        }
    };

    CodeMirror.commands.autocomplete = function(cm) {
        CodeMirror.simpleHint(cm, CodeMirror.cesiumHint);
    };

    jsEditor = CodeMirror.fromTextArea(document.getElementById('code'), {
        mode : 'javascript',
        lineNumbers : true,
        matchBrackets : true,
        indentUnit : 4,
        onCursorActivity : onCursorActivity,
        onChange : scheduleHint,
        extraKeys : {
            'Ctrl-Space' : 'autocomplete',
            'F8' : 'runCesium',
            'Tab' : 'indentMore',
            'Shift-Tab' : 'indentLess'
        }
    });

    htmlEditor = CodeMirror.fromTextArea(document.getElementById('htmlBody'), {
        mode : 'text/html',
        lineNumbers : true,
        matchBrackets : true,
        indentUnit : 4,
        extraKeys : {
            'F8' : 'runCesium',
            'Tab' : 'indentMore',
            'Shift-Tab' : 'indentLess'
        }
    });

    registry.byId('codeContainer').watch("selectedChildWidget", function(name, oldPane, newPane) {
        if (newPane.id === 'jsContainer') {
            jsEditor.focus();
        } else if (newPane.id === 'htmlContainer') {
            htmlEditor.focus();
        }
    });

    function activateBucketScripts(bucketDoc) {
        var headNodes = bucketDoc.head.childNodes;
        var node;
        var nodes = [];
        for (var i = 0, len = headNodes.length; i < len; ++i) {
            node = headNodes[i];
            if (typeof node.tagName === 'string' &&
                    node.tagName === 'SCRIPT' &&
                    node.src.indexOf('Sandcastle-header.js') < 0) { // header is included in blank frame.
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
                appendConsole('consoleError', 'Error loading ' + this.src);
                appendConsole('consoleError', "Make sure Cesium is built, see the Contributor's Guide for details.");
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
                for ( var j = 0, numAttrs = node.attributes.length; j < numAttrs; ++j) {
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
                element.type = 'text/javascript';
                element.textContent = (addExtraLine ? '\n' : '') + jsEditor.getValue();
                bucketDoc.body.appendChild(element);
            }
        };
        loadScript();
    }

    function applyBucket() {
        if (local.emptyBucket && local.bucketName && typeof bucketTypes[local.bucketName] === 'string') {
            bucketWaiting = false;
            var bucketDoc = bucketFrame.contentDocument;
            if (local.headers.substring(0, local.emptyBucket.length) !== local.emptyBucket) {
                appendConsole('consoleError', 'Error, first part of ' + local.bucketName + ' must match first part of bucket.html exactly.');
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
                    } else if (attributeName === 'data-sandcastle-title') {
                        bucketPane.set('title', attributeValue);
                        document.getElementById('includes').textContent = attributeValue;
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

    xhr.get({
        url : 'templates/bucket.html',
        handleAs : 'text'
    }).then(function(value) {
        var pos = value.indexOf('</head>');
        local.emptyBucket = value.substring(0, pos);
        applyBucketIfWaiting();
    });

    function loadBucket(bucketName) {
        if (local.bucketName !== bucketName) {
            local.bucketName = bucketName;
            if (typeof bucketTypes[bucketName] !== 'undefined') {
                local.headers = bucketTypes[bucketName];
            } else {
                local.headers = '<html><head></head><body data-sandcastle-bucket-loaded="no">';
                xhr.get({
                    url : 'templates/' + bucketName,
                    handleAs : 'text'
                }).then(function(value) {
                    var pos = value.indexOf('<body');
                    pos = value.indexOf('>', pos);
                    bucketTypes[bucketName] = value.substring(0, pos + 1) + '\n';
                    if (local.bucketName === bucketName) {
                        local.headers = bucketTypes[bucketName];
                    }
                    applyBucketIfWaiting();
                });
            }
        }
    }

    function loadFromGallery(demo) {
        document.getElementById('saveAsFile').download = demo.name + '.html';
        registry.byId('description').set('value', decodeHTML(demo.description).replace(/\\n/g, '\n'));
        registry.byId('label').set('value', decodeHTML(demo.label).replace(/\\n/g, '\n'));
        var pos = demo.code.indexOf('<body');
        pos = demo.code.indexOf('>', pos);
        var body = demo.code.substring(pos + 2);
        pos = body.indexOf('<script id="cesium_sandcastle_script">');
        var pos2 = body.lastIndexOf('</script>');
        if ((pos <= 0) || (pos2 <= pos)) {
            appendConsole('consoleError', 'Error reading source file: ' + demo.name);
        } else {
            var script = body.substring(pos + 38, pos2);
            while (script.length > 0 && script.charCodeAt(0) < 32) {
                script = script.substring(1);
            }
            jsEditor.setValue(script);
            script = body.substring(0, pos);
            while (script.length > 0 && script.charCodeAt(0) < 32) {
                script = script.substring(1);
            }
            htmlEditor.setValue(script);
            if (typeof demo.bucket === 'string') {
                loadBucket(demo.bucket);
            }
            CodeMirror.commands.runCesium(jsEditor);
        }
    }

    window.addEventListener('popstate', function(e) {
        if (e.state && e.state.name && e.state.code) {
            loadFromGallery(e.state);
            document.title = e.state.name + ' - Cesium Sandcastle';
        }
    }, false);

    window.addEventListener('message', function(e) {
        var line;
        // The iframe (bucket.html) sends this message on load.
        // This triggers the code to be injected into the iframe.
        if (e.data === 'reload') {
            var bucketDoc = bucketFrame.contentDocument;
            if (!local.bucketName) {
                // Reload fired, bucket not specified yet.
                return;
            }
            if (bucketDoc.body.getAttribute('data-sandcastle-loaded') !== 'yes') {
                bucketDoc.body.setAttribute('data-sandcastle-loaded', 'yes');
                logOutput.innerHTML = '';
                // This happens after a Run (F8) reloads bucket.html, to inject the editor code
                // into the iframe, causing the demo to run there.
                applyBucket();
                if (docError) {
                    appendConsole('consoleError', "Documentation not available.  Please run the 'generateDocumentation' build script to generate Cesium documentation.");
                    showGallery();
                }
                if (galleryError) {
                    appendConsole('consoleError', 'Error loading gallery, please run the build script.');
                }
            }
        } else if (typeof e.data.log !== 'undefined') {
            // Console log messages from the iframe display in Sandcastle.
            appendConsole('consoleLog', e.data.log);
        } else if (typeof e.data.error !== 'undefined') {
            // Console error messages from the iframe display in Sandcastle
            appendConsole('consoleError', e.data.error);
            if (typeof e.data.lineNumber !== 'undefined') {
                line = jsEditor.setMarker(e.data.lineNumber - 1, makeLineLabel(e.data.rawErrorMsg), 'errorMarker');
                jsEditor.setLineClass(line, 'errorLine');
                errorLines.push(line);
                scrollToLine(e.data.lineNumber);
            }
        } else if (typeof e.data.highlight !== 'undefined') {
            // Hovering objects in the embedded Cesium window.
            highlightLine(e.data.highlight);
        }
    }, true);

    registry.byId('jsContainer').on('show', function() {
        suggestButton.set('disabled', false);
        jsEditor.refresh();
    });

    registry.byId('htmlContainer').on('show', function() {
        suggestButton.set('disabled', true);
        htmlEditor.refresh();
    });

    registry.byId('search').on('change', function() {
        searchTerm = this.get('value');
        searchRegExp = new RegExp(searchTerm, 'i');
        var numDemosShown = 0;
        if (searchTerm !== '') {
            showSearchContainer();
            var innerPanel = registry.byId('innerPanel');
            innerPanel.selectChild(registry.byId('searchContainer'));
            for ( var i = 0; i < gallery_demos.length; i++) {
                var demo = gallery_demos[i];
                var demoName = demo.name;
                if (searchRegExp.test(demoName) || searchRegExp.test(demo.code)) {
                    document.getElementById(demoName + 'searchDemo').style.display = 'inline-block';
                    ++numDemosShown;
                } else {
                    document.getElementById(demoName + 'searchDemo').style.display = 'none';
                }
            }
        } else {
            hideSearchContainer();
        }

        if (numDemosShown) {
            galleryErrorMsg.style.display = 'none';
        } else {
            galleryErrorMsg.style.display = 'inline-block';
        }

        showGallery();
        scheduleHintNoChange();
    });

    function hideSearchContainer() {
        if (dom.byId('searchContainer')) {
            var innerPanel = registry.byId('innerPanel');
            innerPanel.removeChild(searchContainer);
        }
    }

    function showSearchContainer() {
        if(!dom.byId('searchContainer')) {
            var innerPanel = registry.byId('innerPanel');
            innerPanel.addChild(searchContainer);
        }
    }

    // Clicking the 'Run' button simply reloads the iframe.
    registry.byId('buttonRun').on('click', function() {
        CodeMirror.commands.runCesium(jsEditor);
    });

    registry.byId('buttonSuggest').on('click', function() {
        CodeMirror.commands.autocomplete(jsEditor);
    });

    function getDemoHtml() {
        return local.headers +
               htmlEditor.getValue() +
               '<script id="cesium_sandcastle_script">\n' +
               jsEditor.getValue() +
               '</script>\n' +
               '</body>\n' +
               '</html>\n';
    }

    registry.byId('dropDownSaveAs').on('show', function() {

        var currentDemoName = ioQuery.queryToObject(window.location.search.substring(1)).src;
        currentDemoName = window.decodeURIComponent(currentDemoName.replace('.html', ''));
        var description = encodeHTML(registry.byId('description').get('value').replace(/\n/g, '\\n')).replace(/\"/g, '&quot;');
        var label = encodeHTML(registry.byId('label').get('value').replace(/\n/g, '\\n')).replace(/\"/g, '&quot;');

        var html = getDemoHtml();
        html = html.replace('<title>', '<meta name="description" content="' + description + '">\n    <title>');
        html = html.replace('<title>', '<meta name="cesium-sandcastle-labels" content="' + label + '">\n    <title>');

        var octetBlob = new Blob([html], {
            'type' : 'application/octet-stream',
            'endings' : 'native'
        });
        var octetBlobURL = getURL.createObjectURL(octetBlob);
        dom.byId('saveAsFile').href = octetBlobURL;
    });

    registry.byId('buttonNewWindow').on('click', function() {
        var baseHref = window.location.href;
        var pos = baseHref.lastIndexOf('/');
        baseHref = baseHref.substring(0, pos) + '/gallery/';

        var html = getDemoHtml();
        html = html.replace('<head>', '<head>\n    <base href="' + baseHref + '">');
        var htmlBlob = new Blob([html], {
            'type' : 'text/html;charset=utf-8',
            'endings' : 'native'
        });
        var htmlBlobURL = getURL.createObjectURL(htmlBlob);
        window.open(htmlBlobURL, '_blank');
        window.focus();
    });

    registry.byId('buttonThumbnail').on('change', function(newValue) {
        if (newValue) {
            domClass.add('bucketFrame', 'makeThumbnail');
        } else {
            domClass.remove('bucketFrame', 'makeThumbnail');
        }
    });

    var demosContainer = dom.byId('demosContainer');
    if (typeof document.onmousewheel !== 'undefined') {
        demosContainer.addEventListener('mousewheel', function(e) {
            if (typeof e.wheelDelta !== 'undefined' && e.wheelDelta) {
                demosContainer.scrollLeft -= e.wheelDelta * 70 / 120;
            }
        }, false);
    } else {
        demosContainer.addEventListener('DOMMouseScroll', function(e) {
            if (typeof e.detail !== 'undefined' && e.detail) {
                demosContainer.scrollLeft += e.detail * 70 / 3;
            }
        }, false);
    }

    var galleryContainer = registry.byId('innerPanel');
    galleryContainer.demoTileHeightRule = demoTileHeightRule;
    galleryContainer.originalResize = galleryContainer.resize;
    galleryContainer.resize = function(changeSize, resultSize) {
        var newSize = changeSize.h - 88;
        if (newSize < 20) {
            demoTileHeightRule.style.display = 'none';
        } else {
            demoTileHeightRule.style.display = 'inline';
            demoTileHeightRule.style.height = Math.min(newSize, 150) + 'px';
        }
        this.originalResize(changeSize, resultSize);
    };

    var queryObject = {};
    if (window.location.search) {
        queryObject = ioQuery.queryToObject(window.location.search.substring(1));
    } else {
        queryObject.src = 'Hello World.html';
    }

    function loadDemoFromFile(index) {
        var demo = gallery_demos[index];

        xhr.get({
            url : 'gallery/' + window.encodeURIComponent(demo.name) + '.html',
            handleAs : 'text',
            error : function(error) {
                appendConsole('consoleError', error);
                galleryError = true;
            }
        }).then(function(value) {
            // Store the file contents for later searching.
            demo.code = value;
            demo.bucket = 'bucket-dojo.html';
            var pos = value.indexOf('data-sandcastle-bucket="');
            var pos2;
            if (pos > 0) {
                pos += 24;
                pos2 = value.indexOf('"', pos);
                if (pos2 > pos) {
                    demo.bucket = value.substring(pos, pos2);
                }
            }

            demo.bucketTitle = 'Cesium + Dojo';
            pos = value.indexOf('data-sandcastle-title="');
            if (pos > 0) {
                pos += 23;
                pos2 = value.indexOf('"', pos);
                if (pos2 > pos) {
                    demo.bucketTitle = value.substring(pos, pos2);
                }
            }

            demo.description = '';
            pos = value.indexOf('<meta name="description" content="');
            if (pos > 0) {
                pos += 34;
                pos2 = value.indexOf('">', pos);
                if (pos2 > pos) {
                    demo.description = value.substring(pos, pos2);
                }
            }

            demo.label = '';
            pos = value.indexOf('<meta name="cesium-sandcastle-labels" content="');
            if (pos > 0) {
                pos += 47;
                pos2 = value.indexOf('">', pos);
                if (pos2 > pos) {
                    demo.label = value.substring(pos, pos2);
                }
            }

            // Select the demo to load upon opening based on the query parameter.
            if (typeof queryObject.src !== 'undefined') {
                if (demo.name === window.decodeURIComponent(queryObject.src.replace('.html', ''))) {
                    loadFromGallery(demo);
                    window.history.replaceState(demo, demo.name, '?src=' + demo.name + '.html');
                    document.title = demo.name + ' - Cesium Sandcastle';
                    queryObject.src = undefined;
                }
            }

            // Create a tooltip containing the demo's description.
            demoTooltips[demo.name] = new TooltipDialog({
                id : demo.name + 'TooltipDialog',
                style : 'width: 200px; font-size: 12px;',
                content : '<div class="demoTooltipType">' + demo.bucketTitle + '</div>' + demo.description.replace(/\\n/g, '<br/>')
            });

            addFileToTab(index);
        });
    }

    function addFileToGallery(index) {
        var searchDemos = dom.byId('searchDemos');
        var demos = dom.byId('demos');
        createGalleryButton(index, demos, '');
        createGalleryButton(index, searchDemos, 'searchDemo');
        loadDemoFromFile(index);
    }

    function addFileToTab(index) {
        var demo = gallery_demos[index];
        if (demo.label !== '') {
            var labels = demo.label.split(",");
            for (var j = 0; j < labels.length; j++) {
                labels[j] = labels[j].trim();
                if(!dom.byId(labels[j] + 'Demos')) {
                    new ContentPane({
                        content:'<div class="demosContainer"><div class="demos" id="' + labels[j] + 'Demos"></div></div>',
                        title: labels[j]
                        }).placeAt("innerPanel");
                }
                var tabName = labels[j] + 'Demos';
                var tab = dom.byId(tabName);
                createGalleryButton(index, tab, tabName);
            }
        }
    }

    function createGalleryButton(index, tab, tabName) {
        var demo = gallery_demos[index];
        var imgSrc = 'templates/Gallery_tile.jpg';
        if (typeof demo.img !== 'undefined') {
            imgSrc = 'gallery/' + window.encodeURIComponent(demo.img);
        }

        var demoLink = document.createElement('a');
        demoLink.id = demo.name + tabName;
        demoLink.className = 'linkButton';
        demoLink.href = 'gallery/' + demo.name + '.html';
        tab.appendChild(demoLink);

        demoLink.onclick = function(e) {
            if (mouse.isMiddle(e)) {
                window.open('gallery/' + demo.name + '.html');
            } else {
                loadFromGallery(demo);
                var demoSrc = demo.name + '.html';
                if (demoSrc !== window.location.search.substring(1)) {
                    window.history.pushState(demo, demo.name, '?src=' + demoSrc);
                }
                document.title = demo.name + ' - Cesium Sandcastle';
            }
            e.preventDefault();
        };

        new LinkButton({
            'label' : '<div class="demoTileTitle">' + demo.name + '</div>' +
                      '<img src="' + imgSrc + '" class="demoTileThumbnail" alt="" onDragStart="return false;" />'
        }).placeAt(demoLink);

        on(dom.byId(demoLink.id), 'mouseover', function() {
            scheduleGalleryTooltip(demo);
        });

        on(dom.byId(demoLink.id), 'mouseout', function() {
            closeGalleryTooltip();
        });
    }

    if (typeof gallery_demos === 'undefined') {
        galleryErrorMsg.textContent = 'No demos found, please run the build script.';
        galleryErrorMsg.style.display = 'inline-block';
    } else {
        var i;
        var len = gallery_demos.length;

        // Sort alphabetically.  This will eventually be a user option.
        gallery_demos.sort(function(a, b) {
            var aName = a.name.toUpperCase();
            var bName = b.name.toUpperCase();
            return (bName < aName) ? 1 : ((bName > aName) ? -1 : 0);
        });

        var queryInGalleryIndex = false;
        var queryName = window.decodeURIComponent(queryObject.src.replace('.html', ''));
        for (i = 0; i < len; ++i) {
            addFileToGallery(i);
            if (gallery_demos[i].name === queryName) {
                queryInGalleryIndex = true;
            }
        }

        if (!queryInGalleryIndex) {
            gallery_demos.push({
                name : queryName,
                description : ''
            });
            addFileToGallery(gallery_demos.length - 1);
        }
    }
    dom.byId('searchDemos').appendChild(galleryErrorMsg);
    var searchContainer = registry.byId('searchContainer');
    hideSearchContainer();
});
