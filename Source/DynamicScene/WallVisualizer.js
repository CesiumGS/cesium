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
                try {
                    updateObject(this, time, dynamicObjects[i]);
                } catch (exc) {
                    console.log("BENG >>");
                    console.log(exc);
                }
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

    var _objIds = [];

    /**
     * Render wall geometry
     */
    function updateObject(visualizer, time, dynamicObject) {
        if (_objIds.indexOf(dynamicObject._id) > -1) {
            return;
        }

        // expects wall geometry assigned to 'wall' property of dynamicObject
        if (typeof dynamicObject.wall === 'undefined') {
            return;
        }

        var show = dynamicObject.isAvailable(time) /* && (!defined(showProperty) || showProperty.getValue(time)) */;
        if (!show ) {
            return;
        }

        // ---------- //
        var sc = visualizer.getScene();



        // FIXME: this is a hack!
        /* var wallMaterial = Material.fromType('Color');
        wallMaterial.uniforms.color = new Color(1, 1, 0, 0.4);
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
            material    : wallMaterial
        }); */

        // FIXME: end of hack


        var wall = dynamicObject.wall; /* expects a WallGeometry instance */
        var gi = new GeometryInstance({ geometry: WallGeometry.createGeometry(wall.geometry) });

        var lineMaterial   = Material.fromType('Color'); // HACK HACK HACK
        lineMaterial.uniforms.color = new Color(1, 1, 0, 0.4);
        var lineWidth      = 1;

        /** if (typeof style !== 'undefined') {
            var material = Material.fromType(sc.getContext(), 'Color');
            material.uniforms.color = Color.fromRgba( parseInt(style['poly']['color'], 16) );
            wallAppearance = new MaterialAppearance({
                renderState : {
                    cull : {
                        enabled : false
                    },
                    depthTest : {
                        enabled : true
                    },
                    depthMask : true,
                    blending : Cesium.BlendingState.ALPHA_BLEND
                },
                flat        : true,
                faceForward : true,
                translucent : true,
                material    : material
            });

            lineMaterial = Material.fromType(sc.getContext(), 'Color');
            lineMaterial.uniforms.color = Color.fromRgba( parseInt(style['line']['color'], 16) );
            lineWidth = style['line']['width'];
        } **/

        var material = Material.fromType('Color');
        // material.uniforms.color = dynamicObject.wpolygon.material;
        MaterialProperty.getValue(time, dynamicObject.wpolygon._material, material);
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

        sc.getPrimitives().add(wallPrimitive);
        _objIds.push(dynamicObject._id);
    }

    return WallVisualizer;
});

