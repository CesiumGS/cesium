/*global define*/
define([
        '../Core/Cartesian3',
        '../Core/Matrix3',
        '../Core/defined',
        '../Core/DeveloperError',
        '../Core/Color',
        '../Core/Ellipsoid',
        '../Core/GeometryInstance',
        '../Core/WallGeometry',
        '../Core/destroyObject',
        '../Renderer/BlendingState',
        '../Scene/Polygon',
        '../Scene/PolylineCollection',
        '../Scene/Primitive',
        '../Scene/Material',
        '../Scene/MaterialAppearance',
        './MaterialProperty'
       ], function(
         Cartesian3,
         Matrix3,
         defined,
         DeveloperError,
         Color,
         Ellipsoid,
         GeometryInstance,
         WallGeometry,
         destroyObject,
         BlendingState,
         Polygon,
         PolylineCollection,
         Primitive,
         Material,
         MaterialAppearance,
         MaterialProperty) {
    "use strict";

    /**
     * A Wall Geometry visualizer.
     *
     * @alias WallVisualizer
     * @constructor
     *
     * @param {Scene} scene The scene the camera is updated for.
     * @param {DynamicObjectCollection} [dynamicObjectCollection] The dynamicObjectCollection to visualize.
     *
     * @exception {DeveloperError} scene is required.
     */
    var WallVisualizer = function(scene, dynamicObjectCollection) {
        if (!defined(scene)) {
            throw new DeveloperError('scene is required.');
        }
        this._scene = scene;
        this._dynamicObjectCollection = undefined;
        this.setDynamicObjectCollection(dynamicObjectCollection);
    };

    /**
     * Returns the scene being used by this visualizer.
     *
     * @returns {Scene} The scene being used by this visualizer.
     */
    WallVisualizer.prototype.getScene = function() {
        return this._scene;
    };

    /**
     * Gets the DynamicObjectCollection being visualized.
     *
     * @returns {DynamicObjectCollection} The DynamicObjectCollection being visualized.
     */
    WallVisualizer.prototype.getDynamicObjectCollection = function() {
        return this._dynamicObjectCollection;
    };

    /**
     * Sets the DynamicObjectCollection to visualize.
     *
     * @param dynamicObjectCollection The DynamicObjectCollection to visualizer.
     */
    WallVisualizer.prototype.setDynamicObjectCollection = function(dynamicObjectCollection) {
        var oldCollection = this._dynamicObjectCollection;
        if (oldCollection !== dynamicObjectCollection) {
            this._dynamicObjectCollection = dynamicObjectCollection;
        }
    };

    /**
     * Updates all of the primitives created by this visualizer to match their
     * DynamicObject counterpart at the given time.
     *
     * @param {JulianDate} time The time to update to.
     *
     * @exception {DeveloperError} time is required.
     */
    WallVisualizer.prototype.update = function(time) {
        if (!defined(time)) {
            throw new DeveloperError('time is requied.');
        }

        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for (var i = 0, len = dynamicObjects.length; i < len; i++) {
                updateObject(this, time, dynamicObjects[i]);
            }
        }
    };

    /**
     * Removes all primitives from the scene.
     */
    WallVisualizer.prototype.removeAllPrimitives = function() {
        if (defined(this._dynamicObjectCollection)) {
            var dynamicObjects = this._dynamicObjectCollection.getObjects();
            for ( var i = dynamicObjects.length - 1; i > -1; i--) {
                this._scene.getPrimitives().remove(dynamicObjects[i]._wprimitive);
                dynamicObjects[i]._wprimitive = undefined;
            }
        }
    };

    /**
     * Returns true if this object was destroyed; otherwise, false.
     * <br /><br />
     * If this object was destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.
     *
     * @memberof WallVisualizer
     *
     * @returns {Boolean} True if this object was destroyed; otherwise, false.
     *
     * @see WallVisualizer#destroy
     */
    WallVisualizer.prototype.isDestroyed = function() {
        return false;
    };

    /**
     * Destroys the WebGL resources held by this object.  Destroying an object allows for deterministic
     * release of WebGL resources, instead of relying on the garbage collector to destroy this object.
     * <br /><br />
     * Once an object is destroyed, it should not be used; calling any function other than
     * <code>isDestroyed</code> will result in a {@link DeveloperError} exception.  Therefore,
     * assign the return value (<code>undefined</code>) to the object as done in the example.
     *
     * @memberof WallVisualizer
     *
     * @returns {undefined}
     *
     * @exception {DeveloperError} This object was destroyed, i.e., destroy() was called.
     *
     * @see WallVisualizer#isDestroyed
     *
     * @example
     * visualizer = visualizer && visualizer.destroy();
     */
    WallVisualizer.prototype.destroy = function() {
        return destroyObject(this);
    };


    /**
     * Construct a wall primitive from a Wall geometry and a polygon
     *
     * @param {WallGeometry}
     * @param {Polygon}
     * @param {Scene} scene
     *
     * @return {Primitive}
     */
    function createPrimitive(wallGeometry, polygon, scene, time) {
        var gi = new GeometryInstance({ geometry: WallGeometry.createGeometry(wallGeometry.geometry) });

        var lineMaterial   = Material.fromType('Color'); // HACK HACK HACK
        lineMaterial.uniforms.color = new Color(1, 1, 0, 0.4);


        var material = Material.fromType('Color');
        // material.uniforms.color = polygon.material;
        MaterialProperty.getValue(time, polygon._material, material);
        var wallAppearance = new MaterialAppearance({
            renderState : {
                cull : {
                    enabled : false
                },
                depthTest : {
                    enabled : true
                },
                depthMask : true,
                blending : BlendingState.ALPHA_BLEND
            },
            flat        : true,
            faceForward : true,
            translucent : true,
            material    : material
        });

        var wallPrimitive = new Primitive({
            geometryInstances : [ gi ],
            appearance        : wallAppearance
        });

        // create the line that highlights the edge of the wall
        // var lines = new PolylineCollection();
        // var line = lines.add({positions: positions, material: lineMaterial, width: lineWidth});
        /* line.setPositions(positions);
        line.setMaterial(lineMaterial);
        line.setWidth(lineWidth); */
        // ---------- //

        return wallPrimitive;
    }

    /**
     * Render wall geometry
     */
    function updateObject(visualizer, time, dynamicObject) {
        if (typeof dynamicObject.wall === 'undefined') {
            return;
        }

        var sc = visualizer.getScene();
        var showProperty = dynamicObject.wall._show;
        var show = dynamicObject.isAvailable(time) && (!defined(showProperty) || showProperty.getValue(time));
        if (!show ) {
            if (typeof dynamicObject.wall._wprimitive !== 'undefined') {
                sc.getPrimitives().remove(dynamicObject.wall._wprimitive);
                dynamicObject.wall._wprimitive = undefined;
            }
            return;
        }

        // ---------- //

        var wallPrimitive = dynamicObject.wall._wprimitive;
        if (typeof wallPrimitive === 'undefined') {
            wallPrimitive = createPrimitive(dynamicObject.wall, dynamicObject.wpolygon, sc, time);

            sc.getPrimitives().add(wallPrimitive);

            dynamicObject.wall._wprimitive = wallPrimitive;
        }


        // create the line that highlights the edge of the wall
        // var lines = new PolylineCollection();
        // var line = lines.add({positions: positions, material: lineMaterial, width: lineWidth});
        /* line.setPositions(positions);
        line.setMaterial(lineMaterial);
        line.setWidth(lineWidth); */
        // ---------- //

    }

    return WallVisualizer;
});

