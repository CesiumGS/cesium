(function() {
    "use strict";
    /*global dojo,dijit,dojox*/

    dojo.addOnLoad(function() {
        // Entry animations
        var fadeOut = dojo.fadeOut({
            node : 'toolbar',
            duration : 100
        });

        var preloaderFadeOut = dojo.fadeOut({
            node : 'preloader',
            onEnd : function() {
                dojo.style('preloader', 'display', 'none');
            },
            duration : 100
        });

        var fadeIn = dojo.fadeIn({
            node : 'toolbar',
            duration : 500
        });

        var wipeIn = dojo.fx.wipeIn({
            node : 'toolbar',
            duration : 500
        });

        dojo.fx.chain([fadeOut, preloaderFadeOut, dojo.fx.combine([fadeIn, wipeIn])]).play();

        // Tool tips
        dijit.Tooltip.defaultPosition = ['above'];
        /*jslint nonew : false*/
        new dijit.Tooltip({
            connectId : ['addOverlay'],
            label : 'Add or Edit an Overlay',
            showDelay : 750
        });

        new dijit.Tooltip({
            connectId : ['removeOverlay'],
            label : 'Remove Overlay(s)',
            showDelay : 750
        });

        new dijit.Tooltip({
            connectId : ['documentation'],
            label : 'Open documentation for selected text in new window',
            showDelay : 750
        });
    });

    var overlayDialog = new dojox.widget.Dialog({
        autofocus : false,
        closable : true,
        dimensions : [600, 400]
    }, 'overlayDialog');

    // Toolbar button controls
    var addOverlay = dojo.byId('addOverlay');
    addOverlay.onmouseover = function() {
        addOverlay.src = './icons/addOverlayMouseOver.png';
    };
    addOverlay.onmouseout = function() {
        addOverlay.src = './icons/addOverlay.png';
    };

    addOverlay.onclick = function() {
        overlayDialog.show();
    };

    var removeOverlayDialog = new dojox.widget.Dialog({
        autofocus : false,
        closable : true,
        dimensions : [250, 400]
    }, 'removeOverlayDialog');

    var removeOverlay = dojo.byId('removeOverlay');
    removeOverlay.onmouseover = function() {
        removeOverlay.src = './icons/removeOverlayMouseOver.png';
    };
    removeOverlay.onmouseout = function() {
        removeOverlay.src = './icons/removeOverlay.png';
    };
    removeOverlay.onclick = function() {
        removeOverlayDialog.show();
    };

    var documentation = dojo.byId('documentation');
    documentation.onmouseover = function() {
        documentation.src = './icons/documentationMouseOver.png';
    };
    documentation.onmouseout = function() {
        documentation.src = './icons/documentation.png';
    };
}());