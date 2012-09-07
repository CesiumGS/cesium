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
        'dojo/on',
        'dojo/_base/window',
        'dojo/_base/xhr',
        'Sandcastle/LinkButton',
        'dijit/registry',
        'dojo/domReady!'],
    function (
            parser,
            dom,
            domConstruct,
            on,
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

            // Sort by date descending.  This will eventually be a user option.
            gallery_demos.sort(function(a, b) {
                return b.date - a.date;
            });

            var onThumbnailClick = function (e) {
                window.location = this.parentNode.getElementsByTagName('a')[0].href;
            };

            for (i = 0; i < len; ++i) {
                var label = gallery_demos[i].name;
                var imgSrc = 'templates/Gallery_tile.jpg';
                if (typeof gallery_demos[i].img !== 'undefined') {
                    imgSrc = 'gallery/' + window.encodeURIComponent(gallery_demos[i].img);
                }
                label += '<br /><img src="' + imgSrc +
                    '" alt="" width="225" height="150" id="thumb_' + i + '" />' +
                    '<span id="buttons_' + i + '" class="insetButtons"></span>';

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

                var codeButton = document.createElement('a');
                codeButton.tabIndex = i * 3 + 2;
                codeButton.className = 'linkButton';
                codeButton.href = 'Sandcastle.html?src=' + window.encodeURIComponent(gallery_demos[i].name) + '.html';
                insetElement.appendChild(codeButton);

                new LinkButton({
                    'label': '<span class="dijitReset dijitInline dijitIcon dijitIconEdit"></span> Code'
                }).placeAt(codeButton);

                on(dom.byId('thumb_' + i), 'click', onThumbnailClick);

                var runButton = document.createElement('a');
                runButton.tabIndex = i * 3 + 3;
                runButton.className = 'linkButton';
                runButton.href = 'gallery/' + gallery_demos[i].name + '.html';
                insetElement.appendChild(runButton);

                new LinkButton({
                    'label': '<span class="dijitReset dijitInline dijitIcon dijitIconFunction"></span> Run'
                }).placeAt(runButton);
            }
        }
    });
