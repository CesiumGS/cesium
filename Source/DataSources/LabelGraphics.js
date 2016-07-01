/*global define*/
define([
        '../Core/defaultValue',
        '../Core/defined',
        '../Core/defineProperties',
        '../Core/DeveloperError',
        '../Core/Event',
        './createPropertyDescriptor'
    ], function(
        defaultValue,
        defined,
        defineProperties,
        DeveloperError,
        Event,
        createPropertyDescriptor) {
    'use strict';

    /**
     * Describes a two dimensional label located at the position of the containing {@link Entity}.
     * <p>
     * <div align='center'>
     * <img src='images/Label.png' width='400' height='300' /><br />
     * Example labels
     * </div>
     * </p>
     *
     * @alias LabelGraphics
     * @constructor
     *
     * @param {Object} [options] Object with the following properties:
     * @param {Property} [options.text] A Property specifying the text.
     * @param {Property} [options.font='10px sans-serif'] A Property specifying the CSS font.
     * @param {Property} [options.style=LabelStyle.FILL] A Property specifying the {@link LabelStyle}.
     * @param {Property} [options.fillColor=Color.WHITE] A Property specifying the fill {@link Color}.
     * @param {Property} [options.outlineColor=Color.BLACK] A Property specifying the outline {@link Color}.
     * @param {Property} [options.outlineWidth=1.0] A numeric Property specifying the outline width.
     * @param {Property} [options.show=true] A boolean Property specifying the visibility of the label.
     * @param {Property} [options.scale=1.0] A numeric Property specifying the scale to apply to the text.
     * @param {Property} [options.horizontalOrigin=HorizontalOrigin.CENTER] A Property specifying the {@link HorizontalOrigin}.
     * @param {Property} [options.verticalOrigin=VerticalOrigin.CENTER] A Property specifying the {@link VerticalOrigin}.
     * @param {Property} [options.eyeOffset=Cartesian3.ZERO] A {@link Cartesian3} Property specifying the eye offset.
     * @param {Property} [options.pixelOffset=Cartesian2.ZERO] A {@link Cartesian2} Property specifying the pixel offset.
     * @param {Property} [options.translucencyByDistance] A {@link NearFarScalar} Property used to set translucency based on distance from the camera.
     * @param {Property} [options.pixelOffsetScaleByDistance] A {@link NearFarScalar} Property used to set pixelOffset based on distance from the camera.
     * @param {Property} [options.heightReference=HeightReference.NONE] A Property specifying what the height is relative to.
     *
     * @demo {@link http://cesiumjs.org/Cesium/Apps/Sandcastle/index.html?src=Labels.html|Cesium Sandcastle Labels Demo}
     */
    function LabelGraphics(options) {
        this._text = undefined;
        this._textSubscription = undefined;
        this._font = undefined;
        this._fontSubscription = undefined;
        this._style = undefined;
        this._styleSubscription = undefined;
        this._fillColor = undefined;
        this._fillColorSubscription = undefined;
        this._outlineColor = undefined;
        this._outlineColorSubscription = undefined;
        this._outlineWidth = undefined;
        this._outlineWidthSubscription = undefined;
        this._horizontalOrigin = undefined;
        this._horizontalOriginSubscription = undefined;
        this._verticalOrigin = undefined;
        this._verticalOriginSubscription = undefined;
        this._eyeOffset = undefined;
        this._eyeOffsetSubscription = undefined;
        this._heightReference = undefined;
        this._heightReferenceSubscription = undefined;
        this._pixelOffset = undefined;
        this._pixelOffsetSubscription = undefined;
        this._scale = undefined;
        this._scaleSubscription = undefined;
        this._show = undefined;
        this._showSubscription = undefined;
        this._translucencyByDistance = undefined;
        this._translucencyByDistanceSubscription = undefined;
        this._pixelOffsetScaleByDistance = undefined;
        this._pixelOffsetScaleByDistanceSubscription = undefined;
        this._definitionChanged = new Event();

        this.merge(defaultValue(options, defaultValue.EMPTY_OBJECT));
    }

    defineProperties(LabelGraphics.prototype, {
        /**
         * Gets the event that is raised whenever a property or sub-property is changed or modified.
         * @memberof LabelGraphics.prototype
         *
         * @type {Event}
         * @readonly
         */
        definitionChanged : {
            get : function() {
                return this._definitionChanged;
            }
        },

        /**
         * Gets or sets the string Property specifying the text of the label.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        text : createPropertyDescriptor('text'),

        /**
         * Gets or sets the string Property specifying the font in CSS syntax.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/font|CSS font on MDN}
         */
        font : createPropertyDescriptor('font'),

        /**
         * Gets or sets the Property specifying the {@link LabelStyle}.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        style : createPropertyDescriptor('style'),

        /**
         * Gets or sets the Property specifying the fill {@link Color}.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        fillColor : createPropertyDescriptor('fillColor'),

        /**
         * Gets or sets the Property specifying the outline {@link Color}.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        outlineColor : createPropertyDescriptor('outlineColor'),

        /**
         * Gets or sets the numeric Property specifying the outline width.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        outlineWidth : createPropertyDescriptor('outlineWidth'),

        /**
         * Gets or sets the Property specifying the {@link HorizontalOrigin}.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        horizontalOrigin : createPropertyDescriptor('horizontalOrigin'),

        /**
         * Gets or sets the Property specifying the {@link VerticalOrigin}.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        verticalOrigin : createPropertyDescriptor('verticalOrigin'),

        /**
         * Gets or sets the {@link Cartesian3} Property specifying the label's offset in eye coordinates.
         * Eye coordinates is a left-handed coordinate system, where <code>x</code> points towards the viewer's
         * right, <code>y</code> points up, and <code>z</code> points into the screen.
         * <p>
         * An eye offset is commonly used to arrange multiple labels or objects at the same position, e.g., to
         * arrange a label above its corresponding 3D model.
         * </p>
         * Below, the label is positioned at the center of the Earth but an eye offset makes it always
         * appear on top of the Earth regardless of the viewer's or Earth's orientation.
         * <p>
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><img src='images/Billboard.setEyeOffset.one.png' width='250' height='188' /></td>
         * <td align='center'><img src='images/Billboard.setEyeOffset.two.png' width='250' height='188' /></td>
         * </tr></table>
         * <code>l.eyeOffset = new Cartesian3(0.0, 8000000.0, 0.0);</code><br /><br />
         * </div>
         * </p>
         * @memberof LabelGraphics.prototype
         * @type {Property}
         * @default Cartesian3.ZERO
         */
        eyeOffset : createPropertyDescriptor('eyeOffset'),

        /**
         * Gets or sets the Property specifying the {@link HeightReference}.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         * @default HeightReference.NONE
         */
        heightReference : createPropertyDescriptor('heightReference'),

        /**
         * Gets or sets the {@link Cartesian2} Property specifying the label's pixel offset in screen space
         * from the origin of this label.  This is commonly used to align multiple labels and labels at
         * the same position, e.g., an image and text.  The screen space origin is the top, left corner of the
         * canvas; <code>x</code> increases from left to right, and <code>y</code> increases from top to bottom.
         * <p>
         * <div align='center'>
         * <table border='0' cellpadding='5'><tr>
         * <td align='center'><code>default</code><br/><img src='images/Label.setPixelOffset.default.png' width='250' height='188' /></td>
         * <td align='center'><code>l.pixeloffset = new Cartesian2(25, 75);</code><br/><img src='images/Label.setPixelOffset.x50y-25.png' width='250' height='188' /></td>
         * </tr></table>
         * The label's origin is indicated by the yellow point.
         * </div>
         * </p>
         * @memberof LabelGraphics.prototype
         * @type {Property}
         * @default Cartesian2.ZERO
         */
        pixelOffset : createPropertyDescriptor('pixelOffset'),

        /**
         * Gets or sets the numeric Property specifying the uniform scale to apply to the image.
         * A scale greater than <code>1.0</code> enlarges the label while a scale less than <code>1.0</code> shrinks it.
         * <p>
         * <div align='center'>
         * <img src='images/Label.setScale.png' width='400' height='300' /><br/>
         * From left to right in the above image, the scales are <code>0.5</code>, <code>1.0</code>,
         * and <code>2.0</code>.
         * </div>
         * </p>
         * @memberof LabelGraphics.prototype
         * @type {Property}
         * @default 1.0
         */
        scale : createPropertyDescriptor('scale'),

        /**
         * Gets or sets the boolean Property specifying the visibility of the label.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        show : createPropertyDescriptor('show'),

        /**
         * Gets or sets {@link NearFarScalar} Property specifying the translucency of the label based on the distance from the camera.
         * A label's translucency will interpolate between the {@link NearFarScalar#nearValue} and
         * {@link NearFarScalar#farValue} while the camera distance falls within the upper and lower bounds
         * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
         * Outside of these ranges the label's translucency remains clamped to the nearest bound.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        translucencyByDistance : createPropertyDescriptor('translucencyByDistance'),

        /**
         * Gets or sets {@link NearFarScalar} Property specifying the pixel offset of the label based on the distance from the camera.
         * A label's pixel offset will interpolate between the {@link NearFarScalar#nearValue} and
         * {@link NearFarScalar#farValue} while the camera distance falls within the upper and lower bounds
         * of the specified {@link NearFarScalar#near} and {@link NearFarScalar#far}.
         * Outside of these ranges the label's pixel offset remains clamped to the nearest bound.
         * @memberof LabelGraphics.prototype
         * @type {Property}
         */
        pixelOffsetScaleByDistance : createPropertyDescriptor('pixelOffsetScaleByDistance')

    });

    /**
     * Duplicates this instance.
     *
     * @param {LabelGraphics} [result] The object onto which to store the result.
     * @returns {LabelGraphics} The modified result parameter or a new instance if one was not provided.
     */
    LabelGraphics.prototype.clone = function(result) {
        if (!defined(result)) {
            return new LabelGraphics(this);
        }
        result.text = this.text;
        result.font = this.font;
        result.show = this.show;
        result.style = this.style;
        result.fillColor = this.fillColor;
        result.outlineColor = this.outlineColor;
        result.outlineWidth = this.outlineWidth;
        result.scale = this.scale;
        result.horizontalOrigin = this.horizontalOrigin;
        result.verticalOrigin = this.verticalOrigin;
        result.eyeOffset = this.eyeOffset;
        result.heightReference = this.heightReference;
        result.pixelOffset = this.pixelOffset;
        result.translucencyByDistance = this.translucencyByDistance;
        result.pixelOffsetScaleByDistance = this.pixelOffsetScaleByDistance;
        return result;
    };

    /**
     * Assigns each unassigned property on this object to the value
     * of the same property on the provided source object.
     *
     * @param {LabelGraphics} source The object to be merged into this object.
     */
    LabelGraphics.prototype.merge = function(source) {
        //>>includeStart('debug', pragmas.debug);
        if (!defined(source)) {
            throw new DeveloperError('source is required.');
        }
        //>>includeEnd('debug');

        this.text = defaultValue(this.text, source.text);
        this.font = defaultValue(this.font, source.font);
        this.show = defaultValue(this.show, source.show);
        this.style = defaultValue(this.style, source.style);
        this.fillColor = defaultValue(this.fillColor, source.fillColor);
        this.outlineColor = defaultValue(this.outlineColor, source.outlineColor);
        this.outlineWidth = defaultValue(this.outlineWidth, source.outlineWidth);
        this.scale = defaultValue(this.scale, source.scale);
        this.horizontalOrigin = defaultValue(this.horizontalOrigin, source.horizontalOrigin);
        this.verticalOrigin = defaultValue(this.verticalOrigin, source.verticalOrigin);
        this.eyeOffset = defaultValue(this.eyeOffset, source.eyeOffset);
        this.heightReference = defaultValue(this.heightReference, source.heightReference);
        this.pixelOffset = defaultValue(this.pixelOffset, source.pixelOffset);
        this.translucencyByDistance = defaultValue(this._translucencyByDistance, source.translucencyByDistance);
        this.pixelOffsetScaleByDistance = defaultValue(this._pixelOffsetScaleByDistance, source.pixelOffsetScaleByDistance);
    };

    return LabelGraphics;
});
