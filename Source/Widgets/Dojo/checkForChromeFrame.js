/*global define*/
define([
        'dojo/dom-construct',
        'dojo/io/script',
        'dijit/Dialog'
       ], function(
         domConstruct,
         script,
         Dialog) {
    "use strict";
    /*global CFInstall*/

    function promptForInstall() {
        var dialog = new Dialog({
            title : 'WebGL Required'
        });

        var div = domConstruct.create('div', {
            style : {
                width : 600
            },
            innerHTML : 'Cesium requires WebGL, an open standard for displaying 3D content in a ' +
                        'web browser. To enable WebGL in Internet Explorer, we recommend installing ' +
                        '<a href="https://developers.google.com/chrome/chrome-frame/" target="_blank">Google Chrome Frame</a>, ' +
                        'a free, unobtrusive plug-in offered by Google. To learn more about WebGL, visit ' +
                        '<a href="http://www.khronos.org/webgl/" target="_blank">http://www.khronos.org/webgl/</a>.' +
                        '<p>Would you like to install Chrome Frame now?</p>'
        }, dialog.containerNode);

        var p = domConstruct.create('p', {}, div);

        domConstruct.create('a', {
            href : '#',
            innerHTML : 'Yes, install Google Chrome Frame',
            onclick : function() {
                CFInstall.check({
                    mode : 'overlay',
                    destination : document.URL
                });
                dialog.hide();
                domConstruct.destroy(dialog);
            }
        }, p);

        p = domConstruct.create('p', {}, div);

        domConstruct.create('a', {
            href : '#',
            innerHTML : 'No, not at this time',
            onclick : function() {
                dialog.hide();
                domConstruct.destroy(dialog);
            }
        }, p);

        dialog.show();
    }

    return function() {
        script.get({
            url : 'http://ajax.googleapis.com/ajax/libs/chrome-frame/1/CFInstall.min.js',
            checkString : 'CFInstall'
        }).then(function() {
            CFInstall.check({
                mode : 'overlay',
                preventPrompt : true,
                onmissing : promptForInstall
            });
        });
    };
});