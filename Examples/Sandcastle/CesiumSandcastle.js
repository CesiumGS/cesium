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
            parser,
            domClass,
            domConstruct,
            fx,
            win,
            xhr,
            registry
    ) {
        parser.parse();
        fx.fadeOut({ node: 'loading', onEnd: function () {
            domConstruct.destroy('loading');
        }}).play();

        var types = [];
        xhr.get({
            url: '../../Build/Documentation/types.txt',
            handleAs: 'json'
        }).then(function (value) {
            types = value;
            console.log(types);
        });

        var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
            lineNumbers: true,
            matchBrackets: true
          });
        // TODO: remove debugging
        window.editor = editor;

        //var canvas = document.getElementById("glCanvas");

        //var pane3D = registry.byId('resultPane');
        //pane3D.originalResize = pane3D.resize;
        //pane3D.resize = function(changeSize, resultSize) {
        //    console.log('3d - resize');
        //    pane3D.originalResize(changeSize, resultSize);
        //};

        var bucketFrame = document.getElementById('bucketFrame'),
            logOutput = document.getElementById('logOutput');

        // The iframe (bucket.html) sends this message on load.
        // This triggers the code to be injected into the iframe.
        window.addEventListener('message', function (e) {
            if (e.data === 'reload') {
                logOutput.innerHTML = "";
                var bucketDoc = bucketFrame.contentDocument;
                var sc = bucketDoc.createElement('script');
                sc.type = 'text/javascript';
                sc.textContent = editor.getValue();
                bucketDoc.body.appendChild(sc);
            } else if (typeof e.data.log !== 'undefined') {
                logOutput.textContent += e.data.log + "\n";
            }
        }, true);

        // Clicking the 'Run' button simply reloads the iframe.
        registry.byId('buttonRun').on('click', function () {
            bucketFrame.contentWindow.location.reload();
        });
    });
