(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    /**
     * Creates a mutable content area positioned over the Sandbox example.
     *
     * @param {String} id The id for this overlay's DIV element.
     * @param {String} content The code/text to be displayed in this overlay.
     * @param {Object} [sandbox]
     *
     * @exception {Cesium.DeveloperError} <code>id</code> is required.
     * @exception {Cesium.DeveloperError} <code>content</code> is required.
     * @exception {Cesium.DeveloperError} <code>sandbox</code> is required.
     *
     * @internalConstructor
     */
    Sandbox.Overlay = function(id, content, sandbox) {
        if (!id) {
            throw new Cesium.DeveloperError('id is required.');
        }

        if (!content) {
            throw new Cesium.DeveloperError('content is required.');
        }

        if (!sandbox) {
            throw new Cesium.DeveloperError('sandbox is required.');
        }

        var overlayContainer = document.getElementById('userOverlays');

        var ellipsoid = sandbox.getEllipsoid();
        var primitives = sandbox.getScene().getPrimitives();
        var cb = primitives.getCentralBody();

        // If an overlay of the same name already exists, return 1 greater than its index.
        function checkForOverlay(id) {
            var numOverlays = overlayContainer.children.length;
            for ( var i = 0; i < numOverlays; i++) {
                if (overlayContainer.children[i].id === id) {
                    return i + 1;
                }
            }
            return false;
        }
        var overlay;
        var overlayIndexPlusOne = checkForOverlay(id);
        if (overlayIndexPlusOne) {
            overlay = overlayContainer.children[overlayIndexPlusOne - 1];
        } else {
            overlay = document.createElement('div');
            overlay.id = id;
            overlayContainer.appendChild(overlay);
        }

        // Default position: top right corner.
        // Can be changed via Sandbox.Overlay.prototype.setPosition
        overlay.style.top = '10px';
        overlay.style.right = '10px';
        overlay.style.position = 'absolute';

        // Inherited styles can be changed by editing the overlays class in the CSS file.
        overlay.style.border = 'inherit';
        overlay.style.backgroundColor = 'inherit';
        overlay.style.padding = 'inherit';
        overlay.style.borderRadius = 'inherit';

        this._overlay = overlay;
        this._id = id;
        this._content = content;

        this._interval = window.setInterval(function() {
            /*jslint evil : true*/
            var tempFunc = new Function('ellipsoid', 'primitives', 'cb', 'sb', 'display', content);
            overlay.innerHTML = content;
            tempFunc(ellipsoid, primitives, cb, sandbox, function display(content) {
                if (typeof content === 'string') {
                    content = content.replace(/\n|\r/g, '<br/>');
                }
                overlay.innerHTML = content;
            });
        }, 500);
    };

    /**
     * Returns the id for this overlay.
     *
     * @return {String} The overlay's ID.
     */
    Sandbox.Overlay.prototype.getId = function() {
        return this._id;
    };

    /**
     * Returns the content for this overlay.
     *
     * @return {String} The overlay's content.
     */
    Sandbox.Overlay.prototype.getContent = function() {
        return this._content;
    };

    /**
     * DOC_TBA
     */
    Sandbox.Overlay.prototype.getDiv = function() {
        return this._overlay;
    };

    /**
     * Update (replace) the overlay's contents with new data.
     *
     * @param {String} newContent
     */
    Sandbox.Overlay.prototype.update = function(newContent) {
        this._content = newContent;
        this._overlay.innerHTML = newContent.replace(/\n|\r/g, '<br/>');
    };

    /**
     * Repositions the overlay according to the new parameters.
     *
     * @param {Array} An object containing any of the properties
     * <code>left</code>, <code>right</code>, <code>top</code>, <code>bottom</code>, with String values
     * representing the CSS aboslute positioning of the overlay, including units.
     *
     * @exception {Cesium.DeveloperError} <code>positions</code> is required.
     *
     * @example
     * var overlay = new Sandbox.Overlay('test', 'Hello World!');
     * overlay.setPosition({'top': '25px', 'left': '50%'});
     *
     */
    Sandbox.Overlay.prototype.setPosition = function(positions) {
        if (!positions) {
            throw new Cesium.DeveloperError('positions is required');
        }
        // Clear old position so the overlay does not stretch
        this._overlay.style.left = null;
        this._overlay.style.top = null;
        this._overlay.style.right = null;
        this._overlay.style.bottom = null;

        // Update new position
        if (positions.left) {
            this._overlay.style.left = positions.left;
        }
        if (positions.top) {
            this._overlay.style.top = positions.top;
        }
        if (positions.right) {
            this._overlay.style.right = positions.right;
        }
        if (positions.bottom) {
            this._overlay.style.bottom = positions.bottom;
        }
    };

    /**
     * Removes the overlay from the page.
     */
    Sandbox.Overlay.prototype.remove = function() {
        var overlayContainer = document.getElementById('userOverlays');
        var child = document.getElementById(this._id);
        if (child) {
            overlayContainer.removeChild(child);
        }
        if (!overlayContainer.children.length) {
            overlayContainer.setAttribute('style', 'visibility: hidden;');
        }
        window.clearInterval(this._interval);
    };
}());
