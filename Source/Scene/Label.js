/*global define*/
define([
        '../Core/Color',
        '../Core/shallowEquals',
        '../Core/Cartesian2',
        '../Core/Cartesian3',
        '../ThirdParty/measureText',
        './Billboard',
        './LabelStyle',
        './HorizontalOrigin',
        './VerticalOrigin'
    ], function(
        Color,
        shallowEquals,
        Cartesian2,
        Cartesian3,
        measureText,
        Billboard,
        LabelStyle,
        HorizontalOrigin,
        VerticalOrigin) {
    "use strict";

    /**
     * DOC_TBA
     *
     * @alias Label
     * @internalConstructor
     *
     * @see LabelCollection
     * @see LabelCollection#add
     * @see Billboard
     *
     * @see <a href='http://www.whatwg.org/specs/web-apps/current-work/#2dcontext'>HTML canvas 2D context</a>
     */
    var Label = function(labelTemplate, labelCollection) {
        var l = labelTemplate || {};
        var show = (typeof l.show === 'undefined') ? true : l.show;
        var billboardCollection = labelCollection._getCollection();

        this._text = l.text || '';
        this._font = l.font || '30px sans-serif';
        this._fillColor = (typeof l.fillColor !== 'undefined') ? Color.clone(l.fillColor) : new Color(1.0, 1.0, 1.0, 1.0);
        this._outlineColor = (typeof l.outlineColor !== 'undefined') ? Color.clone(l.outlineColor) : new Color(0.0, 0.0, 0.0, 1.0);
        this._style = l.style || LabelStyle.FILL;
        this._verticalOrigin = l.verticalOrigin || VerticalOrigin.BOTTOM;
        this._horizontalOrigin = l.horizontalOrigin || HorizontalOrigin.LEFT;
        this._pixelOffset = l.pixelOffset ? new Cartesian2(l.pixelOffset.x, l.pixelOffset.y) : Cartesian2.ZERO.clone();
        this._eyeOffset = l.eyeOffset ? new Cartesian3(l.eyeOffset.x, l.eyeOffset.y, l.eyeOffset.z) : Cartesian3.ZERO.clone();

        this._position = l.position ? new Cartesian3(l.position.x, l.position.y, l.position.z) : Cartesian3.ZERO.clone();
        this._scale = (typeof l.scale === 'undefined') ? 1.0 : l.scale;
        this._show = show;

        this._billboardCollection = billboardCollection;
        this._labelCollection = labelCollection;
        this._billboards = undefined;

        this._createBillboards();
    };

    /**
     * Returns true if this label will be shown.  Call {@link Label#setShow}
     * to hide or show a label, instead of removing it and re-adding it to the collection.
     *
     * @memberof Label
     *
     * @return {Boolean} <code>true</code> if this label will be shown; otherwise, <code>false</code>.
     *
     * @see Label#setShow
     */
    Label.prototype.getShow = function() {
        return this._show;
    };

    /**
     * Determines if this label will be shown.  Call this to hide or show a label, instead
     * of removing it and re-adding it to the collection.
     *
     * @memberof Label
     *
     * @param {Boolean} value Indicates if this label will be shown.
     *
     * @see Label#getShow
     */
    Label.prototype.setShow = function(value) {
        if ((typeof value !== 'undefined') && (value !== this._show)) {
            this._show = value;

            var billboards = this._billboards;
            var length = this._billboards ? this._billboards.length : 0;
            for ( var i = 0; i < length; i++) {
                billboards[i].setShow(value);
            }
        }
    };

    /**
     * Returns the Cartesian position of this label.
     *
     * @memberof Label
     *
     * @return {Cartesian3} The Cartesian position of this label.
     *
     * @see Label#setPosition
     */
    Label.prototype.getPosition = function() {
        return this._position;
    };

    /**
     * Sets the Cartesian position of this label.
     * <br /><br />
     * As shown in the examples, <code>value</code> can be either a {@link Cartesian3}
     * or an object literal with <code>x</code>, <code>y</code>, and <code>z</code> properties.
     * A copy of <code>value</code> is made, so changing it after calling <code>setPosition</code>
     * does not affect the label's position; an explicit call to <code>setPosition</code> is required.
     *
     * @memberof Label
     *
     * @param {Cartesian3} value The Cartesian position.
     *
     * @see Label#getPosition
     *
     * @example
     * // Example 1. Set a label's position using a Cartesian3.
     * l.setPosition(new Cartesian3(1.0, 2.0, 3.0));
     *
     * //////////////////////////////////////////////////////////////////
     *
     * // Example 2. Set a label's position using an object literal.
     * l.setPosition({
     *   x : 1.0,
     *   y : 2.0,
     *   z : 3.0});
     */
    Label.prototype.setPosition = function(value) {
        var p = this._position;

        if ((typeof value !== 'undefined') &&
            ((p.x !== value.x) || (p.y !== value.y) || (p.z !== value.z))) {

            p.x = value.x;
            p.y = value.y;
            p.z = value.z;

            var billboards = this._billboards;
            var length = this._billboards ? this._billboards.length : 0;
            for ( var i = 0; i < length; i++) {
                billboards[i].setPosition(value);
            }
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Label
     *
     * @see Label#setText
     */
    Label.prototype.getText = function() {
        return this._text;
    };

    /**
     * DOC_TBA
     *
     * @memberof Label
     *
     * @see Label#getText
     */
    Label.prototype.setText = function(value) {
        if ((typeof value !== 'undefined') && (value !== this._text)) {
            this._text = value;
            this._createBillboards();
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Label
     *
     * @see Label#setFont
     */
    Label.prototype.getFont = function() {
        return this._font;
    };

    /**
     * DOC_TBA
     * CSS font-family
     *
     * @memberof Label
     *
     * @see Label#getFont
     * @see Label#setFillColor
     * @see Label#setOutlineColor
     * @see <a href='http://www.whatwg.org/specs/web-apps/current-work/#dom-context-2d-font'>HTML canvas 2D context font</a>
     */
    Label.prototype.setFont = function(value) {
        if ((typeof value !== 'undefined') && (this._font !== value)) {
            this._font = value;
            this._createBillboards();
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Label
     *
     * @see Label#setFillColor
     */
    Label.prototype.getFillColor = function() {
        return this._fillColor;
    };

    /**
     * DOC_TBA
     *
     * CSS <color> values
     *
     * @memberof Label
     *
     * @see Label#getFillColor
     * @see Label#setOutlineColor
     * @see Label#setFont
     */
    Label.prototype.setFillColor = function(value) {
        var c = this._fillColor;
        if ((typeof value !== 'undefined') && !Color.equals(c, value)) {
            Color.clone(value, this._fillColor);
            this._createBillboards();
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Label
     *
     * @see Label#setOutlineColor
     */
    Label.prototype.getOutlineColor = function() {
        return this._outlineColor;
    };

    /**
     * DOC_TBA
     *
     * CSS <color> values
     *
     * @memberof Label
     *
     * @see Label#getOutlineColor
     * @see Label#setFillColor
     * @see Label#setFont
     */
    Label.prototype.setOutlineColor = function(value) {
        var c = this._outlineColor;
        if ((typeof value !== 'undefined') && !Color.equals(c, value)) {
            Color.clone(value, this._outlineColor);
            this._createBillboards();
        }
    };

    /**
     * DOC_TBA
     *
     * @memberof Label
     *
     * @see Label#setStyle
     */
    Label.prototype.getStyle = function() {
        return this._style;
    };

    /**
     * DOC_TBA
     *
     * @memberof Label
     *
     * @param {LabelStyle} value DOC_TBA
     *
     * @see Label#getStyle
     * @see Label#setOutlineColor
     * @see Label#setFillColor
     */
    Label.prototype.setStyle = function(value) {
        if ((typeof value !== 'undefined') && (this._style !== value)) {
            this._style = value;
            this._createBillboards();
        }
    };

    /**
     * Returns the pixel offset from the origin of this label.
     *
     * @memberof Label
     *
     * @return {Cartesian2} The pixel offset of this label.
     *
     * @see Label#setPixelOffset
     */
    Label.prototype.getPixelOffset = function() {
        return this._pixelOffset;
    };

    /**
     * Sets the pixel offset in screen space from the origin of this label.  This is commonly used
     * to align multiple labels and billboards at the same position, e.g., an image and text.  The
     * screen space origin is the bottom, left corner of the canvas; <code>x</code> increases from
     * left to right, and <code>y</code> increases from bottom to top.
     * <br /><br />
     * <code>value</code> can be either a {@link Cartesian2}  or an object literal with
     * <code>x</code> and <code>y</code> properties.  A copy of <code>value</code> is made, so
     * changing it after calling <code>setPixelOffset</code> does not affect the label's pixel
     * offset; an explicit call to <code>setPixelOffset</code> is required.
     * <br /><br />
     * <div align='center'>
     * <table border='0' cellpadding='5'><tr>
     * <td align='center'><code>default</code><br/><img src='images/Label.setPixelOffset.default.png' width='250' height='188' /></td>
     * <td align='center'><code>l.setPixelOffset({ x : 25, y : -75 });</code><br/><img src='images/Label.setPixelOffset.x50y-25.png' width='250' height='188' /></td>
     * </tr></table>
     * The label's origin is indicated by the yellow point.
     * </div>
     *
     * @memberof Label
     *
     * @param {Cartesian2} value The 2D Cartesian pixel offset.
     *
     * @see Label#getPixelOffset
     * @see Billboard#setPixelOffset
     */
    Label.prototype.setPixelOffset = function(value) {
        var p = this._pixelOffset;
        if ((typeof value !== 'undefined') && ((p.x !== value.x) || (p.y !== value.y))) {
            p.x = value.x;
            p.y = value.y;
            this._setPixelOffsets();
        }
    };

    /**
     * Returns the 3D Cartesian offset applied to this label in eye coordinates.
     *
     * @memberof Label
     *
     * @return {Cartesian3} The 3D Cartesian offset applied to this label in eye coordinates.
     *
     * @see Label#setEyeOffset
     */
    Label.prototype.getEyeOffset = function() {
        return this._eyeOffset;
    };

    /**
     * Sets the 3D Cartesian offset applied to this label in eye coordinates.  Eye coordinates is a left-handed
     * coordinate system, where <code>x</code> points towards the viewer's right, <code>y</code> points up, and
     * <code>z</code> points into the screen.  Eye coordinates use the same scale as world and model coordinates,
     * which is typically meters.
     * <br /><br />
     * An eye offset is commonly used to arrange multiple label or objects at the same position, e.g., to
     * arrange a label above its corresponding 3D model.
     * <br /><br />
     * <code>value</code> can be either a {@link Cartesian3} or an object literal with <code>x</code>,
     * <code>y</code>, and <code>z</code> properties.  A copy of <code>value</code> is made, so changing it after
     * calling <code>setEyeOffset</code> does not affect the label's eye offset; an explicit call to
     * <code>setEyeOffset</code> is required.
     * <br /><br />
     * Below, the label is positioned at the center of the Earth but an eye offset makes it always
     * appear on top of the Earth regardless of the viewer's or Earth's orientation.
     * <br /><br />
     * <div align='center'>
     * <table border='0' cellpadding='5'><tr>
     * <td align='center'><img src='images/Billboard.setEyeOffset.one.png' width='250' height='188' /></td>
     * <td align='center'><img src='images/Billboard.setEyeOffset.two.png' width='250' height='188' /></td>
     * </tr></table>
     * <code>l.setEyeOffset({ x : 0.0, y : 8000000.0, z : 0.0 });</code><br /><br />
     * </div>
     *
     * @memberof Label
     *
     * @param {Cartesian3} value The 3D Cartesian offset in eye coordinates.
     *
     * @see Label#getEyeOffset
     */
    Label.prototype.setEyeOffset = function(value) {
        var e = this._eyeOffset;

        if ((typeof value !== 'undefined') &&
            ((e.x !== value.x) || (e.y !== value.y) || (e.z !== value.z))) {
            e.x = value.x;
            e.y = value.y;
            e.z = value.z;
            var billboards = this._billboards;
            var length = this._billboards ? this._billboards.length : 0;
            for ( var i = 0; i < length; i++) {
                var b = billboards[i];
                var eyeOffset = b.getEyeOffset();
                b.setEyeOffset({
                    x : this._eyeOffset.x + eyeOffset.x,
                    y : this._eyeOffset.y + eyeOffset.y,
                    z : this._eyeOffset.z + eyeOffset.z
                });
            }
        }
    };

    /**
     * Returns the horizontal origin of this label.
     *
     * @memberof Label
     *
     * @return {HorizontalOrigin} The horizontal origin of this label.
     *
     * @see Label#setHorizontalOrigin
     */
    Label.prototype.getHorizontalOrigin = function() {
        return this._horizontalOrigin;
    };

    /**
     * Sets the horizontal origin of this label, which determines if the label is
     * to the left, center, or right of its position.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Billboard.setHorizontalOrigin.png' width='400' height='300' /><br />
     * </div>
     *
     * @memberof Label
     *
     * @param {HorizontalOrigin} value The horizontal origin.
     *
     * @see Label#getHorizontalOrigin
     * @see Label#setVerticalOrigin
     *
     * @example
     * // Use a top, right origin
     * l.setHorizontalOrigin(HorizontalOrigin.RIGHT);
     * l.setVerticalOrigin(VerticalOrigin.TOP);
     */
    Label.prototype.setHorizontalOrigin = function(value) {
        if ((typeof value !== 'undefined') && (this._horizontalOrigin !== value)) {
            this._horizontalOrigin = value;
            this._createBillboards();
        }
    };

    /**
     * Returns the vertical origin of this label.
     *
     * @memberof Label
     *
     * @return {VerticalOrigin} The vertical origin of this label.
     *
     * @see Label#setVerticalOrigin
     */
    Label.prototype.getVerticalOrigin = function() {
        return this._verticalOrigin;
    };

    /**
     * Sets the vertical origin of this label, which determines if the label is
     * to the above, below, or at the center of its position.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Billboard.setVerticalOrigin.png' width='400' height='300' /><br />
     * </div>
     *
     * @memberof Label
     *
     * @param {VerticalOrigin} value The vertical origin.
     *
     * @see Label#getVerticalOrigin
     * @see Label#setHorizontalOrigin
     *
     * @example
     * // Use a top, right origin
     * l.setHorizontalOrigin(HorizontalOrigin.RIGHT);
     * l.setVerticalOrigin(VerticalOrigin.TOP);
     */
    Label.prototype.setVerticalOrigin = function(value) {
        if ((typeof value !== 'undefined') && (this._verticalOrigin !== value)) {
            this._verticalOrigin = value;
            this._createBillboards();
        }
    };

    /**
     * Returns the uniform scale that is multiplied with the label's size in pixels.
     *
     * @memberof Label
     *
     * @return {Number} The scale used to size the label.
     *
     * @see Label#setScale
     */
    Label.prototype.getScale = function() {
        return this._scale;
    };

    /**
     * Sets the uniform scale that is multiplied with the label's size in pixels.
     * A scale of <code>1.0</code> does not change the size of the label; a scale greater than
     * <code>1.0</code> enlarges the label; a positive scale less than <code>1.0</code> shrinks
     * the label.
     * <br /><br />
     * Applying a large scale value may pixelate the label.  To make text larger without pixelation,
     * use a larger font size when calling {@link Label#setFont} instead.
     * <br /><br />
     * <div align='center'>
     * <img src='images/Label.setScale.png' width='400' height='300' /><br/>
     * From left to right in the above image, the scales are <code>0.5</code>, <code>1.0</code>,
     * and <code>2.0</code>.
     * </div>
     *
     * @memberof Label
     *
     * @param {Number} value The scale used to size the label.
     *
     * @see Label#getScale
     * @see Label#setFont
     */
    Label.prototype.setScale = function(value) {
        if ((typeof value !== 'undefined') && (this._scale !== value)) {
            this._scale = value;
            var billboards = this._billboards;
            var length = this._billboards ? this._billboards.length : 0;
            for ( var i = 0; i < length; i++) {
                billboards[i].setScale(value);
            }
            this._setPixelOffsets();
        }
    };

    /**
     * Computes the screen-space position of the label's origin, taking into account eye and pixel offsets.
     * The screen space origin is the bottom, left corner of the canvas; <code>x</code> increases from
     * left to right, and <code>y</code> increases from bottom to top.
     *
     * @memberof Label
     *
     * @param {UniformState} uniformState The same state object passed to {@link LabelCollection#render}.
     *
     * @return {Cartesian2} The screen-space position of the label.
     *
     * @exception {DeveloperError} Label must be in a collection.
     * @exception {DeveloperError} uniformState is required.
     *
     * @see Label#setEyeOffset
     * @see Label#setPixelOffset
     * @see LabelCollection#render
     *
     * @example
     * console.log(l.computeScreenSpacePosition(scene.getUniformState()).toString());
     */
    Label.prototype.computeScreenSpacePosition = function(uniformState) {
        // This function is basically a stripped-down JavaScript version of BillboardCollectionVS.glsl

        var billboards = this._billboards;
        var position = (this._billboards.length !== 0) ? billboards[0]._getActualPosition() : this._position;

        return Billboard._computeScreenSpacePosition(this._labelCollection.modelMatrix, position, this._eyeOffset, this._pixelOffset, uniformState);
    };

    /**
     * Determines if this label equals another label.  Labels are equal if all their properties
     * are equal.  Labels in different collections can be equal.
     *
     * @memberof Label
     *
     * @param {Label} other The label to compare for equality.
     *
     * @return {Boolean} <code>true</code> if the labels are equal; otherwise, <code>false</code>.
     */
    Label.prototype.equals = function(other) {
        return other &&
               (this.getShow() === other.getShow()) &&
               (this.getPosition().equals(other.getPosition())) &&
               (this.getPixelOffset().equals(other.getPixelOffset())) &&
               (this.getEyeOffset().equals(other.getEyeOffset())) &&
               (this.getHorizontalOrigin().value === other.getHorizontalOrigin().value) &&
               (this.getVerticalOrigin().value === other.getVerticalOrigin().value) &&
               (this.getScale() === other.getScale()) &&
               (this._text === other._text) &&
               (this._font === other._font) &&
               (shallowEquals(this._fillColor, other._fillColor)) &&
               (shallowEquals(this._outlineColor, other._outlineColor)) &&
               (this._style === other._style);
    };

    Label.prototype._destroy = function() {
        var billboardCollection = this._billboardCollection;
        var billboards = this._billboards;
        var length = this._billboards ? this._billboards.length : 0;
        for ( var i = 0; i < length; i++) {
            billboardCollection.remove(billboards[i]);
        }
        this._billboards = null;
        this._billboardCollection = null;
        this._labelCollection = null;
    };

    Label.prototype._getCollection = function() {
        return this._labelCollection;
    };

    Label.prototype._getBillboards = function() {
        return this._billboards;
    };

    Label.prototype._createBillboards = function() {
        var i;
        var length = this._billboards ? this._billboards.length : 0;
        for (i = 0; i < length; i++) {
            this._billboardCollection.remove(this._billboards[i]);
        }

        this._billboards = [];
        var text = this._text;
        length = text.length;
        var self = this;

        var onCanvasCreated = function() {
            self._setUpdateTextureAtlas(true);
        };

        for (i = 0; i < length; i++) {
            var charValue = text.charAt(i);
            var billboard = this._billboardCollection.add({
                show : this._show,
                position : this._position,
                eyeOffset : this._eyeOffset,
                horizontalOrigin : HorizontalOrigin.LEFT,
                verticalOrigin : this._verticalOrigin,
                scale : this._scale,
                _pickIdThis : this
            });

            var canvasContainer = this._labelCollection._canvasContainer;
            var index = canvasContainer.add(charValue, this, onCanvasCreated);
            billboard.setImageIndex(index);
            billboard._labelDimension = canvasContainer.getItem(index)._dimension;
            this._billboards.push(billboard);
        }
        this._setPixelOffsets();
    };

    Label.prototype._createId = function(charValue) {
        return JSON.stringify({
            fillColor : this._fillColor.red.toString() + ',' + this._fillColor.green.toString() + ',' + this._fillColor.blue.toString() + ',' + this._fillColor.alpha.toString(),
            font : this._font,
            outlineColor : this._outlineColor.red.toString() + ',' + this._outlineColor.green.toString() + ',' + this._outlineColor.blue.toString() + ',' + this._outlineColor.alpha.toString(),
            style : this._style,
            verticalOrigin : this._verticalOrigin,
            value : charValue
        });
    };

    Label.prototype._createCanvas = function(charValue) {
        var font = this._font;

        var canvas = document.createElement('canvas');
        canvas.width = canvas.height = 1;
        canvas.style.font = font;
        canvas.style.display = 'hidden';

        var context2D = canvas.getContext('2d');
        context2D.font = font;


        //the vertical origin needs to be set before the measureText call. It won't work otherwise.
        //It's magic.
        var verticalOrigin = this._verticalOrigin;
        if (verticalOrigin === VerticalOrigin.BOTTOM) {
            context2D.textBaseline = 'bottom';
        } else if (verticalOrigin === VerticalOrigin.TOP) {
            context2D.textBaseline = 'top';
        } else {// VerticalOrigin.CENTER
            context2D.textBaseline = 'middle';
        }

        //in order for measureText to calculate style, the canvas has to be
        //(temporarily) added to the DOM.
        document.body.appendChild(canvas);
        var dimensions = measureText(context2D, charValue);
        document.body.removeChild(canvas);
        var baseline = dimensions.height - dimensions.ascent;
        canvas.width = dimensions.width;
        canvas.height = dimensions.height;
        context2D.font = font;
        // font must be explicitly set again after changing width and height
        context2D.fillStyle = 'rgba(' + this._fillColor.red * 255 + ', ' + this._fillColor.green * 255 + ', ' + this._fillColor.blue * 255 + ', ' + this._fillColor.alpha + ')';
        context2D.strokeStyle = 'rgba(' + this._outlineColor.red * 255 + ', ' + this._outlineColor.green * 255 + ', ' + this._outlineColor.blue * 255 + ', ' + this._outlineColor.alpha + ')';

        var y = canvas.height - baseline;
        var style = this._style;

        canvas._dimension = {
            width : canvas.width,
            height : canvas.height,
            descent : dimensions.descent
        };

        if (style === LabelStyle.FILL) {
            context2D.fillText(charValue, 0, y);
        } else if (style === LabelStyle.OUTLINE) {
            context2D.strokeText(charValue, 0, y);
        } else {// LabelStyle.FILL_AND_OUTLINE
            context2D.fillText(charValue, 0, y);
            context2D.strokeText(charValue, 0, y);
        }
        return canvas;
    };

    Label.prototype._getMaxHeight = function() {
        var i;
        var billboards = this._billboards;
        var length = billboards.length;
        var maxHeight = 0;
        for (i = 0; i < length; i++) {
            var billboard = billboards[i];
            maxHeight = Math.max(maxHeight, billboard._labelDimension.height);
        }
        return maxHeight;
    };

    Label.prototype._getWidth = function(){
        var i;
        var billboards = this._billboards;
        var length = billboards.length;
        var width = 0;
        for (i = 0; i < length; i++) {
            var billboard = billboards[i];
            width += billboard._labelDimension.width;
        }
        return width;
    };

    Label.prototype._setPixelOffsets = function() {
        var billboards = this._billboards;
        var maxHeight = 0;
        var i;
        var length = billboards.length;
        var thisPixelOffset = this._pixelOffset;
        var thisVerticalOrigin = this._verticalOrigin;
        var thisHorizontalOrigin = this._horizontalOrigin;
        var totalWidth = this._getWidth();
        var widthOffset = 0;
        var scale = this._scale;
        var dimension;
        var billboard;
        if(thisHorizontalOrigin === HorizontalOrigin.CENTER){
            widthOffset -= totalWidth / 2 * scale;
        }
        else if(thisHorizontalOrigin === HorizontalOrigin.RIGHT){
            widthOffset -= totalWidth * scale;
        }
        if (thisVerticalOrigin === VerticalOrigin.TOP) {
            maxHeight = this._getMaxHeight();
            for (i = 0; i < length; i++) {
                billboard = billboards[i];
                dimension = billboard._labelDimension;
                if (dimension.height < maxHeight) {
                    billboard.setPixelOffset({
                        x : thisPixelOffset.x + widthOffset,
                        y : thisPixelOffset.y - ((maxHeight - dimension.height) * scale) - (dimension.descent * scale)
                    });
                } else {
                    billboard.setPixelOffset({
                        x : thisPixelOffset.x + widthOffset,
                        y : thisPixelOffset.y - (dimension.descent * scale)
                    });
                }
                widthOffset += dimension.width * scale;
            }
        } else if (thisVerticalOrigin === VerticalOrigin.CENTER) {
            maxHeight = this._getMaxHeight();
            for (i = 0; i < length; i++) {
                billboard = billboards[i];
                dimension = billboard._labelDimension;
                if (dimension.height < maxHeight) {
                    billboard.setPixelOffset({
                        x : thisPixelOffset.x + widthOffset,
                        y : thisPixelOffset.y - (((maxHeight - billboard._labelDimension.height) / 2) * scale) - dimension.descent * scale
                    });
                } else {
                    billboard.setPixelOffset({
                        x : thisPixelOffset.x + widthOffset,
                        y : thisPixelOffset.y - billboard._labelDimension.descent * scale
                    });
                }
                widthOffset += dimension.width * scale;
            }
        } else if (thisVerticalOrigin === VerticalOrigin.BOTTOM) {
            for (i = 0; i < length; i++) {
                billboard = billboards[i];
                billboard.setPixelOffset({
                    x : thisPixelOffset.x + widthOffset,
                    y : thisPixelOffset.y - billboard._labelDimension.descent * scale
                });
                widthOffset += billboard._labelDimension.width * scale;
            }
        }
    };

    Label.prototype._setUpdateTextureAtlas = function(value) {
        this._labelCollection._setUpdateTextureAtlas(value);
    };

    return Label;
});