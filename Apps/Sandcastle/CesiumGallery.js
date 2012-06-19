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
            var i, len = gallery_demos.length, demos = dom.byId('demos');

            for (i = 0; i < len; ++i) {
                var button = document.createElement('a');
                button.className = 'linkButton';
                button.href = 'Sandcastle.html?src=' + gallery_demos[i].name + '.html';
                demos.appendChild(button);

                var label = gallery_demos[i].name;
                if (typeof gallery_demos[i].img !== 'undefined') {
                    label += '<br /><img src="gallery/' + gallery_demos[i].img + '" alt="" width="225" height="150" />';
                }

                new LinkButton({
                    label: label
                }).placeAt(button);
            }
        }
    });
