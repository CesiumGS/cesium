/*global require,CodeMirror,JSHINT,gallery_demos*/
require({
        baseUrl: '../../Source',
        packages: [{
            name: 'dojo',
            location: '../ThirdParty/dojo-release-1.7.2-src/dojo'
        }, {
            name: 'dijit',
            location: '../ThirdParty/dojo-release-1.7.2-src/dijit'
        }, {
            name: 'dojox',
            location: '../ThirdParty/dojo-release-1.7.2-src/dojox'
        }, {
            name: 'Sandcastle',
            location: '../Apps/Sandcastle'
        }]
    }, [
        'Widgets/Dojo/CesiumWidget',
        'Widgets/Dojo/CesiumViewerWidget',
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
        'dijit/Menu',
        'dijit/MenuBar',
        'dijit/PopupMenuBarItem',
        'dijit/MenuItem',
        'dijit/layout/BorderContainer',
        'dijit/layout/TabContainer',
        'dijit/Toolbar',
        'dijit/ToolbarSeparator',
        'dojox/mobile/ScrollableView',
        'Sandcastle/LinkButton',
        'dojo/domReady!'],
    function (
            CesiumWidget,
            CesiumViewerWidget,
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
            ContentPane
    ) {
        "use strict";
        parser.parse();
        window.CesiumWidget = CesiumWidget; // for autocomplete.
        window.CesiumViewerWidget = CesiumViewerWidget; // for autocomplete.
        fx.fadeOut({ node: 'loading', onEnd: function () {
            domConstruct.destroy('loading');
        }}).play();

        var logOutput = document.getElementById('logOutput');
        function appendConsole(className, message) {
            var ele = document.createElement('span');
            ele.className = className;
            ele.textContent = message + "\n";
            logOutput.appendChild(ele);
            logOutput.parentNode.scrollTop = logOutput.clientHeight + 8 - logOutput.parentNode.clientHeight;
        }

        // NOTE: BlobBuilder will eventually be deprecated and replaced with a direct constructor on Blob itself.
        // https://developer.mozilla.org/en/DOM/Blob
        var BlobBuilder = BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder;
        var getURL = window.URL || window.webkitURL || window;
        if (typeof BlobBuilder === 'undefined') {
            registry.byId('buttonSaveAs').set('disabled', true);
        }

        var jsEditor;
        var htmlEditor;
        var suggestButton = registry.byId('buttonSuggest');
        var docTimer;
        var docTabs = {};
        var galleryTooltipTimer;
        var activeGalleryTooltipDemo;
        var cesiumContainer = registry.byId('cesiumContainer');
        var docNode = dom.byId('docPopup');
        var docMessage = dom.byId('docPopupMessage');
        var local = { 'docTypes': [],  'headers': "<html><head></head><body>"};
        var demoTooltips = {};
        var errorLines = [];
        var highlightLines = [];
        var hintGlobals = [
            'require',
            'document',
            'window',
            'console',
            'Sandcastle'
        ];
        var hintOptions = {
            predef: hintGlobals,
            // These are copied from the Eclipse jsHint plugin options on the Cesium project itself.
            // They should be kept in sync with that list of options.
            bitwise : false,
            curly : true,
            eqeqeq : true,
            forin : true,
            immed : false,
            latedef : true,
            newcap : true,
            noarg : true,
            noempty : false,
            nonew : true,
            plusplus : false,
            regexp : false,
            undef : true,
            strict : true,
            trailing : false,
            asi : false,
            boss : false,
            debug : false,
            eqnull : false,
            es5 : false,
            esnext : false,
            evil : false,
            expr : false,
            funcscope : false,
            globalstrict : false,
            iterator : false,
            lastsemic : false,
            laxbreak : false,
            laxcomma : false,
            loopfunc : false,
            multistr : false,
            onecase : false,
            proto : false,
            regexdash : false,
            scripturl : false,
            smarttabs : false,
            shadow : false,
            sub : false,
            supernew : false,
            validthis : false,
            browser : true
        };
        var hintTimer;

        xhr.get({
            url: '../../Build/Documentation/types.txt',
            handleAs: 'json',
            error: function(error) {
                // Quiet for now, because the console will be cleared soon after this.
                // We'll let the user know about this error further down.
            }
        }).then(function (value) {
            local.docTypes = value;
        });

        xhr.get({
            url: 'templates/bucket.html',
            handleAs: 'text'
        }).then(function (value) {
            var pos = value.indexOf('<body');
            pos = value.indexOf('>', pos);
            local.headers = value.substring(0, pos + 1) + '\n';
        });

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
                    title: title,
                    focused: true,
                    content: '<iframe class="fullFrame" src="' + link + '"></iframe>',
                    closable: true,
                    onClose: function () {
                        docTabs[this.title] = undefined;
                        // Return true to close the tab.
                        return true;
                    }
                }).placeAt(cesiumContainer);
                // After the iframe loads, re-scroll to selected field.
                docTabs[title].domNode.childNodes[0].onload = function () {
                    this.onload = function () {};
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

        function showDocPopup () {
            var selectedText = jsEditor.getSelection();

            var onDocClick = function () {
                openDocTab(this.textContent, this.href);
                return false;
            };

            docTimer = undefined;
            if (selectedText && selectedText in local.docTypes && typeof local.docTypes[selectedText].push === 'function') {
                var member, ele, i, len = local.docTypes[selectedText].length;
                docMessage.innerHTML = '';
                for (i = 0; i < len; ++i) {
                    member = local.docTypes[selectedText][i];
                    ele = document.createElement('a');
                    ele.target = "_blank";
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
            docNode.style.left = "-999px";
            if (typeof docTimer !== 'undefined') {
                window.clearTimeout(docTimer);
            }
            docTimer = window.setTimeout(showDocPopup, 500);
        }

        var bucketFrame = document.getElementById('bucketFrame');
        var bucketPane = registry.byId('bucketPane');

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
            if (typeof activeGalleryTooltipDemo !== 'undefined') {
                popup.open({
                    popup: demoTooltips[activeGalleryTooltipDemo.name],
                    around: dom.byId(activeGalleryTooltipDemo.name)
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
            var line, hint, hints, i, len;
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
            if (!JSHINT(jsEditor.getValue(), hintOptions)) {
                hints = JSHINT.errors;
                len = hints.length;
                for (i = 0; i < len; ++i) {
                    hint = hints[i];
                    if ((hint !== null) && (typeof hint.reason !== 'undefined') && (hint.line > 0)) {
                        line = jsEditor.setMarker(hint.line - 1, makeLineLabel(hint.reason), "hintMarker");
                        jsEditor.setLineClass(line, "hintLine");
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

        function scrollToLine(lineNumber) {
            if (typeof lineNumber !== 'undefined') {
                jsEditor.setCursor(lineNumber);
                jsEditor.setSelection({line: lineNumber - 2, ch:0}, {line: lineNumber - 2, ch: 0});
                jsEditor.focus();
                jsEditor.setSelection({line: lineNumber - 1, ch: 0}, {line: lineNumber - 1, ch: 0});
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
                line = jsEditor.setMarker(lineNum - 1, makeLineLabel('highlighted by demo'), "highlightMarker");
                jsEditor.setLineClass(line, "highlightLine");
                highlightLines.push(line);
                scrollToLine(lineNum);
            }
        }

        var tabs = registry.byId('bottomPanel');

        function showGallery() {
            tabs.selectChild(registry.byId('galleryContainer'));
        }

        function hideGallery() {
            closeGalleryTooltip();
            tabs.selectChild(registry.byId('logContainer'));
        }

        CodeMirror.commands.runCesium = function(cm) {
            clearErrorsAddHints();
            clearRun();
            cesiumContainer.selectChild(bucketPane);
            bucketFrame.contentWindow.location.reload();
        };

        CodeMirror.commands.autocomplete = function(cm) {
            CodeMirror.simpleHint(cm, CodeMirror.cesiumHint);
        };

        jsEditor = CodeMirror.fromTextArea(document.getElementById("code"), {
            mode: "javascript",
            lineNumbers: true,
            matchBrackets: true,
            indentUnit: 4,
            onCursorActivity: onCursorActivity,
            onChange: scheduleHint,
            extraKeys: {
                "Ctrl-Space": "autocomplete",
                "F8": "runCesium",
                "Tab": "indentMore",
                "Shift-Tab": "indentLess"
            }
        });

        htmlEditor = CodeMirror.fromTextArea(document.getElementById("htmlBody"), {
            mode: "text/html",
            lineNumbers: true,
            matchBrackets: true,
            indentUnit: 4,
            extraKeys: {
                "F8": "runCesium",
                "Tab": "indentMore",
                "Shift-Tab": "indentLess"
            }
        });

        function loadFromGallery(demo) {
            var pos = demo.code.indexOf('<body');
            pos = demo.code.indexOf('>', pos);
            var body = demo.code.substring(pos + 2);
            pos = body.indexOf('<script id="cesium_sandcastle_script">');
            var pos2 = body.lastIndexOf('</script>');
            if ((pos <= 0) || (pos2 <= pos)) {
                var ele = document.createElement('span');
                ele.className = 'consoleError';
            ele.textContent = 'Error reading source file: ' + demo.name + '\n';
                appendConsole(ele);
            } else {
                var script = body.substring(pos + 38, pos2 - 1);
                while (script.charAt(0) < 32) {
                    script = script.substring(1);
                }
                jsEditor.setValue(script);
                htmlEditor.setValue(body.substring(0, pos - 1));
                CodeMirror.commands.runCesium(jsEditor);
            }
        }

        window.addEventListener('popstate', function (e) {
            if (e.state && e.state.name && e.state.code) {
                loadFromGallery(e.state);
                document.title = e.state.name + ' - Cesium Sandcastle';
            }
        }, false);

        window.addEventListener('message', function (e) {
            var line;
            // The iframe (bucket.html) sends this message on load.
            // This triggers the code to be injected into the iframe.
            if (e.data === 'reload') {
                logOutput.innerHTML = "";
                // This happens after a Run (F9) reloads bucket.html, to inject the editor code
                // into the iframe, causing the demo to run there.
                var bucketDoc = bucketFrame.contentDocument;
                var bodyEle = bucketDoc.createElement('div');
                bodyEle.innerHTML = htmlEditor.getValue();
                bucketDoc.body.appendChild(bodyEle);
                var jsEle = bucketDoc.createElement('script');
                jsEle.type = 'text/javascript';
                jsEle.textContent = jsEditor.getValue();
                bucketDoc.body.appendChild(jsEle);
                if (local.docTypes.length === 0) {
                    appendConsole('consoleError', "Documentation not available.  Please run the 'release' build script to generate Cesium documentation.");
                }
            } else if (typeof e.data.log !== 'undefined') {
                // Console log messages from the iframe display in Sandcastle.
                appendConsole('consoleLog', e.data.log);
            } else if (typeof e.data.error !== 'undefined') {
                // Console error messages from the iframe display in Sandcastle
                appendConsole('consoleError', e.data.error);
                if (typeof e.data.lineNumber !== 'undefined') {
                    line = jsEditor.setMarker(e.data.lineNumber - 1, makeLineLabel(e.data.rawErrorMsg), "errorMarker");
                    jsEditor.setLineClass(line, "errorLine");
                    errorLines.push(line);
                    scrollToLine(e.data.lineNumber);
                }
            } else if (typeof e.data.highlight !== 'undefined') {
                // Hovering objects in the embedded Cesium window.
                highlightLine(e.data.highlight);
            }
        }, true);

        registry.byId('jsContainer').on('show', function () {
            suggestButton.set('disabled', false);
            jsEditor.refresh();
        });

        registry.byId('htmlContainer').on('show', function () {
            suggestButton.set('disabled', true);
            htmlEditor.refresh();
        });

        registry.byId('search').on('change', function() {
            var searchTerm = this.get('value');
            var searchRegExp = new RegExp(searchTerm, 'i');
            for ( var i = 0; i < gallery_demos.length; i++) {
                var demo = gallery_demos[i];
                var demoName = demo.name;
                if (searchRegExp.test(demoName) || searchRegExp.test(demo.code)) {
                    document.getElementById(demoName).style.display = 'inline-block';
                } else {
                    document.getElementById(demoName).style.display = 'none';
                }
            }

            registry.byId('demosContainer').scrollTo({x:0, y:0});
            showGallery();

        });

        // Clicking the 'Run' button simply reloads the iframe.
        registry.byId('buttonRun').on('click', function () {
            CodeMirror.commands.runCesium(jsEditor);
        });

        registry.byId('buttonSuggest').on('click', function () {
            CodeMirror.commands.autocomplete(jsEditor);
        });

        registry.byId('dropDownSaveAs').on('show', function () {
            var html = local.headers + htmlEditor.getValue() +
                '\n<script id="cesium_sandcastle_script">\n' + jsEditor.getValue() +
                '\n</script>\n</body>\n</html>\n';

            var octetBB = new BlobBuilder();
            octetBB.append(html);
            var octetBlob = octetBB.getBlob("application/octet-stream");
            var octetBlobURL = getURL.createObjectURL(octetBlob);
            dom.byId('saveAsFile').href = octetBlobURL;
        });

        registry.byId('buttonNewWindow').on('click', function () {
            var html = local.headers + htmlEditor.getValue() +
                '\n<script id="cesium_sandcastle_script">\n' + jsEditor.getValue() +
                '\n</script>\n</body>\n</html>\n';
            var baseHref = window.location.href;
            var pos = baseHref.lastIndexOf('/');
            baseHref = baseHref.substring(0, pos) + '/gallery/';
            html = html.replace('<head>', '<head>\n    <base href="' + baseHref + '">');
            var htmlBB = new BlobBuilder();
            htmlBB.append(html);
            var htmlBlob = htmlBB.getBlob("text/html;charset=utf-8");
            var htmlBlobURL = getURL.createObjectURL(htmlBlob);
            window.open(htmlBlobURL, '_blank');
            window.focus();
        });

        registry.byId('buttonThumbnail').on('change', function (newValue) {
            if (newValue) {
                domClass.add('bucketFrame', 'makeThumbnail');
            } else {
                domClass.remove('bucketFrame', 'makeThumbnail');
            }
        });

        var queryObject = {};
        if (window.location.search) {
            queryObject = ioQuery.queryToObject(window.location.search.substring(1));
        } else {
            queryObject.src = 'Minimalist.html';
            queryObject.showGallery = 1;
        }

        function loadDemoFromFile(index) {
            var demo = gallery_demos[index];

            xhr.get({
                url: 'gallery/' + window.encodeURIComponent(demo.name) + '.html',
                handleAs: 'text',
                error: function(error) {
                    appendConsole('consoleError', error);
                }
            }).then(function (value) {
                // Store the file contents for later searching.
                demo.code = value;

                // Select the demo to load upon opening based on the query parameter.
                if (typeof queryObject.src !== 'undefined') {
                    if (demo.name === window.decodeURIComponent(queryObject.src.replace('.html', ''))) {
                        loadFromGallery(demo);
                        window.history.replaceState(demo, demo.name, '?src=' + demo.name + '.html');
                        document.title = demo.name + ' - Cesium Sandcastle';
                        queryObject.src = undefined;
                        if (queryObject.showGallery) {
                            showGallery();
                        } else {
                            hideGallery();
                        }
                    }
                }

                // Create a tooltip containing the demo's description.
                var start = value.indexOf('<meta name="description" content="');
                if (start !== -1) {
                    var end = value.indexOf('">', start);
                    demoTooltips[demo.name] = new TooltipDialog({
                        id: demo.name + 'TooltipDialog',
                        style: 'width: 200px; font-size: 12px;',
                        content: value.substring(start + 34, end)
                    });

                    on(dom.byId(demo.name), 'mouseover', function() {
                        scheduleGalleryTooltip(demo);
                    });

                    on(dom.byId(demo.name), 'mouseout', function() {
                        closeGalleryTooltip();
                    });
                }
            });
        }

        function addFileToGallery(index) {
            var demo = gallery_demos[i];
            var imgSrc = 'templates/Gallery_tile.jpg';
            if (typeof demo.img !== 'undefined') {
                imgSrc = 'gallery/' + window.encodeURIComponent(demo.img);
            }

            var demoName = demo.name;
            var tile = document.createElement('div');
            tile.className = 'demoTile';
            tile.id = demoName;
            tile.style.display = 'inline-block';
            tile.innerHTML = '<div class="demoTileTitle">' + demoName + '</div>' +
                             '<img src="' + imgSrc + '" class="demoTileThumbnail" alt="" width="225" height="150" onDragStart="return false;" />';
            demos.appendChild(tile);

            addLoadOnClickCallback(demoName, demo);
            loadDemoFromFile(i);
        }

        if (typeof gallery_demos === 'undefined') {
            dom.byId('demos').textContent = 'No demos found, please run the build script.';
        } else {
            var i;
            var len = gallery_demos.length;
            var demos = dom.byId('demos');

            // Sort by date descending.  This will eventually be a user option.
            gallery_demos.sort(function(a, b) {
                return b.date - a.date;
            });

            var addLoadOnClickCallback = function(divId, demo) {
                on(dom.byId(divId), 'click', function() {
                    hideGallery();
                    loadFromGallery(demo);
                    var demoSrc = demo.name + '.html';
                    if (demoSrc !== window.location.search.substring(1)) {
                        window.history.pushState(demo, demo.name, '?src=' + demoSrc);
                    }
                    document.title = demo.name + ' - Cesium Sandcastle';
                });
            };

            var queryInGalleryIndex = false;
            var queryName =  window.decodeURIComponent(queryObject.src.replace('.html', ''));
            for (i = 0; i < len; ++i) {
                addFileToGallery(i);
                if (gallery_demos[i].name === queryName) {
                    queryInGalleryIndex = true;
                }
            }

            if (!queryInGalleryIndex) {
                gallery_demos.push({
                    name: queryName
                });
                addFileToGallery(gallery_demos.length - 1);
            }
        }
    });
