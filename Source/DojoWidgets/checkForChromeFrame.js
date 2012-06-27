/*global define*/
define([
        'dojo/dom-construct',
        'dijit/Dialog'
       ], function(
         domConstruct,
         Dialog) {
    "use strict";
    /*global require,CFInstall*/

    function promptForInstall() {
        var dialog = new Dialog({
            title : 'WebGL Required'
        });

        domConstruct.create('div', {
            innerHTML : 'Cesium requires WebGL, an open standard for displaying 3D content in a<br/>' +
                        'web browser. To enable WebGL in Internet Explorer, we recommend installing<br/>' +
                        '<a href="http://code.google.com/chrome/chromeframe/" target="_blank">Google Chrome Frame</a>,' +
                        'a free, unobtrusive plug-in offered by Google.<br/>To learn more about WebGL,' +
                        'visit <a href="http://www.khronos.org/webgl/" target="_blank">http://www.khronos.org/webgl/</a><br/><br/>Would you like to install Chrome Frame now?<br/><br/>'
        }, dialog.containerNode);

        var div = domConstruct.create('div', {}, dialog.containerNode);

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
        }, div);

        domConstruct.create('p', {
            innerHTML : ''
        }, div);

        domConstruct.create('a', {
            href : '#',
            innerHTML : 'No, not at this time',
            onclick : function() {
                dialog.hide();
                domConstruct.destroy(dialog);
            }
        }, div);

        dialog.show();
    }

    return function() {
        require(['http://ajax.googleapis.com/ajax/libs/chrome-frame/1/CFInstall.min.js'], function() {
            CFInstall.check({
                mode : 'overlay',
                preventPrompt : true,
                onmissing : promptForInstall
            });
        });
    };
});