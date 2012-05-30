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
        }]
    }, [
        'Dojo/CesiumWidget',
        'dojo/parser',
        'dojo/dom-class',
        'dojo/dom-construct',
        'dojo/_base/fx',
        'dojo/_base/window',
        'dojo/_base/xhr',
        'dijit/registry',
        'dijit/form/Button',
        'dijit/form/DropDownButton',
        'dijit/form/ToggleButton',
        'dijit/form/DropDownButton',
        'dijit/form/TextBox',
        'dijit/TooltipDialog',
        'dijit/Menu',
        'dijit/MenuBar',
        'dijit/PopupMenuBarItem',
        'dijit/MenuItem',
        'dijit/layout/BorderContainer',
        'dijit/layout/ContentPane',
        'dijit/layout/TabContainer',
        'dijit/Toolbar',
        'dijit/ToolbarSeparator',
        'dojo/domReady!'],
    function (
            CesiumWidget,
            parser,
            domClass,
            domConstruct,
            fx,
            win,
            xhr,
            registry
    ) {
        parser.parse();
        window.CesiumWidget = CesiumWidget;
        fx.fadeOut({ node: 'loading', onEnd: function () {
            domConstruct.destroy('loading');
        }}).play();

        var editor, docTimer, that = this, cesiumContainer = registry.byId('cesiumContainer');
        var docNode = dojo.byId('docPopup'), docMessage = dojo.byId('docPopupMessage'), docTabs = {};
        that.types = [];
        xhr.get({
            url: '../../Build/Documentation/types.txt',
            handleAs: 'json'
        }).then(function (value) {
            that.types = value;
        });

        function openDocTab(title, link) {
            if (typeof docTabs[title] === 'undefined') {
                docTabs[title] = new dijit.layout.ContentPane({
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
            var selectedText = editor.getSelection();
            if (selectedText && selectedText in that.types && typeof that.types[selectedText].push === 'function') {
                var member, ele, i, len = that.types[selectedText].length;
                docMessage.innerHTML = '';
                for (i = 0; i < len; ++i) {
                    member = that.types[selectedText][i];
                    ele = document.createElement('a');
                    ele.target = "_blank";
                    ele.textContent = member.replace('.html', '').replace('module-', '').replace('#', '.');
                    ele.href = '../../Build/Documentation/' + member;
                    ele.onclick = function () {
                        openDocTab(this.textContent, this.href);
                        return false;
                    };
                    docMessage.appendChild(ele);
                }
                editor.addWidget(editor.getCursor(true), docNode);
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

        var bucketFrame = document.getElementById('bucketFrame'),
            logOutput = document.getElementById('logOutput'),
            bucketPane = registry.byId('bucketPane');

        CodeMirror.commands.runCesium = function() {
            CodeMirror.cesiumWindow = undefined;
            cesiumContainer.selectChild(bucketPane);
            bucketFrame.contentWindow.location.reload();
        };

        CodeMirror.commands.autocomplete = function(cm) {
            CodeMirror.simpleHint(cm, CodeMirror.cesiumHint);
        };

        editor = CodeMirror.fromTextArea(document.getElementById("code"), {
            lineNumbers: true,
            matchBrackets: true,
            indentUnit: 4,
            extraKeys: {"Ctrl-Space": "autocomplete", "F9": "runCesium"},
            onCursorActivity: onCursorActivity
        });

        // The iframe (bucket.html) sends this message on load.
        // This triggers the code to be injected into the iframe.
        window.addEventListener('message', function (e) {
            if (e.data === 'reload') {
                logOutput.innerHTML = "";
                CodeMirror.cesiumWindow = bucketFrame.contentWindow;
                var bucketDoc = bucketFrame.contentDocument;
                var sc = bucketDoc.createElement('script');
                sc.type = 'text/javascript';
                sc.textContent = editor.getValue();
                bucketDoc.body.appendChild(sc);
            } else if (typeof e.data.log !== 'undefined') {
                var ele = document.createElement('span');
                ele.textContent = e.data.log + "\n";
                logOutput.appendChild(ele);
            } else if (typeof e.data.error !== 'undefined') {
                var ele = document.createElement('span');
                ele.className = 'consoleError';
                ele.textContent = e.data.error + "\n";
                logOutput.appendChild(ele);
            }
        }, true);

        // Clicking the 'Run' button simply reloads the iframe.
        registry.byId('buttonRun').on('click', function () {
            CodeMirror.commands.runCesium();
        });
    });
