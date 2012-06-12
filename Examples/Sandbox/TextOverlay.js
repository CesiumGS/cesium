(function() {
    "use strict";
    /*global Cesium,Sandbox*/

    /**
     * Creates a simple overlay containing formatted HTML.
     *
     * @param {String} content The string to be displayed.
     * @param {Object} [position] An object containing any of the properties
     * <code>left</code>, <code>right</code>, <code>top</code>, <code>bottom</code>, with String values
     * representing the CSS aboslute positioning of the overlay, including units.
     */
    Sandbox.TextOverlay = function(content, position) {
        if (!content) {
            throw new Cesium.DeveloperError('content is required.');
        }

        var overlayContainer = document.getElementById('textOverlays');

        var overlay = document.createElement('div');
        overlay.id = content;
        overlayContainer.appendChild(overlay);
        overlay.innerHTML = content.replace(/\n|\r/g, '<br/>');

        // Inherited styles can be changed by editing the overlays class in the CSS file.
        overlay.style.border = 'inherit';
        overlay.style.backgroundColor = 'inherit';
        overlay.style.padding = 'inherit';
        overlay.style.borderRadius = 'inherit';
        overlay.style.visibility = 'visible';

        this._overlay = overlay;
        this._content = content;

        if (position) {
            this.setPosition(position);
        } else {
            // Default position: top right corner.
            overlay.style.top = '10px';
            overlay.style.right = '10px';
        }
        overlay.style.position = 'absolute';
    };

    /**
     * Returns the content for this overlay.
     *
     * @return {String} The overlay's content.
     */
    Sandbox.TextOverlay.prototype.getContent = function() {
        return this._content;
    };

    /**
     * DOC_TBA
     */
    Sandbox.TextOverlay.prototype.getDiv = function() {
        return this._overlay;
    };

    /**
     * Update (replace) the overlay's contents with new data.
     *
     * @param {String} newContent
     */
    Sandbox.TextOverlay.prototype.update = function(newContent) {
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
     * var textOverlay = new Sandbox.TextOverlay('Welcome to the Cesium Sandbox');
     * textOverlay.setPosition({'top': '50%', 'left': '10px'});
     */
    Sandbox.TextOverlay.prototype.setPosition = function(positions) {
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
    Sandbox.TextOverlay.prototype.remove = function() {
        var overlayContainer = document.getElementById('textOverlays');
        var child = document.getElementById(this._content);
        if (child) {
            overlayContainer.removeChild(child);
        }
    };

    /**
     * Removes all text overlays from the page.
     */
    Sandbox.TextOverlay.removeAll = function() {
        var overlayContainer = document.getElementById('textOverlays');
        overlayContainer.setAttribute('style', 'visibility: hidden;');
        if (overlayContainer.hasChildNodes()) {
            while (overlayContainer.childNodes.length >= 1) {
                overlayContainer.removeChild(overlayContainer.firstChild);
            }
        }
    };
}());
