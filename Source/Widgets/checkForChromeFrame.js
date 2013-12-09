/*global define*/
define([
        '../Core/FeatureDetection',
        './getElement',
        '../ThirdParty/when'
    ], function(
        FeatureDetection,
        getElement,
        when) {
    "use strict";

    function prompt(container) {
        container = getElement(container);

        var overlay = document.createElement('div');
        overlay.className = 'cesium-chromeFrameOverlay';

        var content = document.createElement('div');
        overlay.appendChild(content);

        content.innerHTML = 'Cesium requires WebGL, an open standard for displaying 3D content \
in a web browser. To enable WebGL in Internet Explorer, we recommend installing \
<a href="https://developers.google.com/chrome/chrome-frame/" target="_blank">Google Chrome Frame</a>, \
a free, unobtrusive plug-in offered by Google. To learn more about WebGL, visit \
<a href="http://www.khronos.org/webgl/" target="_blank">http://www.khronos.org/webgl/</a>.\
<p>Would you like to install Chrome Frame now?</p>';

        var p = document.createElement('p');
        content.appendChild(p);

        var yes = document.createElement('a');
        yes.href = '#';
        yes.innerHTML = 'Yes, install Google Chrome Frame';
        yes.onclick = function() {
            window.CFInstall.check({
                mode : 'overlay',
                destination : document.URL
            });
            container.removeChild(overlay);
        };
        p.appendChild(yes);

        p = document.createElement('p');
        content.appendChild(p);

        var no = document.createElement('a');
        no.href = '#';
        no.innerHTML = 'No, not at this time';
        no.onclick = function() {
            container.removeChild(overlay);
        };
        p.appendChild(no);

        container.appendChild(overlay);
    }

    /**
     * Automatically prompt to install Chrome Frame in Internet Explorer.
     *
     * @param {Element|String} container The DOM element or ID that will contain the prompt overlay.
     *
     * @returns {Promise} A promise that resolves once the check has been performed.  Resolves
     *                    to true if Chrome Frame is not installed, and the prompt overlay is displayed.
     *                    Resolves to false if Chrome Frame is already installed or not needed.
     */
    var checkForChromeFrame = function(container) {
        var deferred = when.defer();

        if (FeatureDetection.isInternetExplorer()) {
            var script = document.createElement('script');
            script.type = 'text/javascript';
            script.src = '//ajax.googleapis.com/ajax/libs/chrome-frame/1/CFInstall.min.js';

            var head = document.getElementsByTagName('head')[0];
            head.appendChild(script);

            var intervalID = setInterval(function() {
                if (window.CFInstall) {
                    clearInterval(intervalID);

                    var isMissing = false;
                    window.CFInstall.check({
                        mode : 'overlay',
                        preventPrompt : true,
                        onmissing : function() {
                            isMissing = true;
                        }
                    });

                    if (isMissing) {
                        prompt(container);
                    }
                    deferred.resolve(isMissing);
                }
            }, 50);
        } else {
            deferred.resolve(false);
        }

        return deferred.promise;
    };

    return checkForChromeFrame;
});