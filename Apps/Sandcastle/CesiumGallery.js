/*global window,require,gallery_demos*/
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
        'dojo/parser',
        'dojo/dom',
        'dojo/dom-construct',
        'dojo/_base/window',
        'dojo/_base/xhr',
        'Sandcastle/LinkButton',
        'dijit/registry',
        'dojo/domReady!'],
    function (
            parser,
            dom,
            domConstruct,
            win,
            xhr,
            LinkButton,
            registry
    ) {
        "use strict";
        parser.parse();
        domConstruct.destroy('loading');

        if (typeof gallery_demos === 'undefined') {
            dom.byId('demos').textContent = 'No demos found, please run the build script.';
        } else {
            var i;
            var len = gallery_demos.length;
            var demos = dom.byId('demos');

            for (i = 0; i < len; ++i) {
                var label = gallery_demos[i].name;
                if (typeof gallery_demos[i].img !== 'undefined') {
                    label += '<br /><img src="gallery/' + window.encodeURIComponent(gallery_demos[i].img) +
                        '" alt="" width="225" height="150" />';
                }
                label += '<span id="buttons_' + i + '" class="insetButtons"></span>';

                var tile = document.createElement('span');
                tile.className = "dijit dijitReset dijitInline demoTile dijitButton";
                tile.tabIndex = i * 3 + 1;
                tile.innerHTML =
                    '<span class="dijitReset dijitInline dijitButtonNode">' +
                    '<span class="dijitReset dijitStretch dijitButtonContents">' +
                    '<span class="dijitReset dijitInline dijitButtonText">' +
                    label + '</span></span></span>';
                demos.appendChild(tile);

                var insetElement = dom.byId('buttons_' + i);

                var editButton = document.createElement('a');
                editButton.tabIndex = i * 3 + 2;
                editButton.className = 'linkButton';
                editButton.href = 'Sandcastle.html?src=' + window.encodeURIComponent(gallery_demos[i].name) + '.html';
                insetElement.appendChild(editButton);

                new LinkButton({
                    'label': '<span class="dijitReset dijitInline dijitIcon dijitIconEdit"></span> Edit'
                }).placeAt(editButton);

                var runButton = document.createElement('a');
                runButton.tabIndex = i * 3 + 3;
                runButton.className = 'linkButton';
                runButton.href = 'gallery/' + gallery_demos[i].name + '.html';
                insetElement.appendChild(runButton);

                new LinkButton({
                    'label': '<span class="dijitReset dijitInline dijitIcon dijitIconFunction"></span> Run',
                }).placeAt(runButton);
            }
        }
    });
