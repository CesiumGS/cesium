/*global define*/
define([
        './DynamicObject',
        './DynamicBillboard',
        './DynamicClock',
        './DynamicEllipse',
        './DynamicEllipsoid',
        './DynamicCone',
        './DynamicLabel',
        './DynamicPath',
        './DynamicPoint',
        './DynamicPolygon',
        './DynamicPolyline',
        './DynamicPyramid',
        './DynamicBillboardVisualizer',
        './DynamicEllipsoidVisualizer',
        './DynamicConeVisualizerUsingCustomSensor', //CZML_TODO Replace with './DynamicConeVisualizer', once ComplexConicSensor works.
        './DynamicLabelVisualizer',
        './DynamicPathVisualizer',
        './DynamicPointVisualizer',
        './DynamicPolygonVisualizer',
        './DynamicPolylineVisualizer',
        './DynamicPyramidVisualizer'
    ], function(
        DynamicObject,
        DynamicBillboard,
        DynamicClock,
        DynamicEllipse,
        DynamicEllipsoid,
        DynamicCone,
        DynamicLabel,
        DynamicPath,
        DynamicPoint,
        DynamicPolygon,
        DynamicPolyline,
        DynamicPyramid,
        DynamicBillboardVisualizer,
        DynamicEllipsoidVisualizer,
        DynamicConeVisualizer,
        DynamicLabelVisualizer,
        DynamicPathVisualizer,
        DynamicPointVisualizer,
        DynamicPolygonVisualizer,
        DynamicPolylineVisualizer,
        DynamicPyramidVisualizer) {
    "use strict";

    /**
     * Helper class which provides the default set of CZML processing methods
     * needed to visualize the complete CZML standard.  There's no reason to
     * access this class directly, as it just holds the defaults used by
     * DynamicObjectCollection, CompositeDynamicObjectCollection, and VisualizerCollection.
     *
     * @exports CzmlDefaults
     *
     * @see DynamicObjectCollection
     * @see CompositeDynamicObjectCollection
     * @see VisualizerCollection#createCzmlDefaultsCollection
     */
    var CzmlDefaults = {
        //Any change to updaters needs to be reflected in the DynamicObject constructor,
        //which has the superset of all properties created by the various updaters.
        /**
         * The standard set of updaters for processing CZML.  This array is the default
         * set of updater methods used by DynamicObjectCollection.
         * @see DynamicObjectCollection
         */
        updaters : [DynamicClock.processCzmlPacket,
                    DynamicBillboard.processCzmlPacket,
                    DynamicEllipse.processCzmlPacket,
                    DynamicEllipsoid.processCzmlPacket,
                    DynamicCone.processCzmlPacket,
                    DynamicLabel.processCzmlPacket,
                    DynamicPath.processCzmlPacket,
                    DynamicPoint.processCzmlPacket,
                    DynamicPolygon.processCzmlPacket,
                    DynamicPolyline.processCzmlPacket,
                    DynamicPyramid.processCzmlPacket,
                    DynamicObject.processCzmlPacketPosition,
                    DynamicObject.processCzmlPacketViewFrom,
                    DynamicObject.processCzmlPacketOrientation,
                    DynamicObject.processCzmlPacketVertexPositions,
                    DynamicObject.processCzmlPacketAvailability],

        /**
         * The standard set of mergers for processing CZML.  This array is the default
         * set of updater methods used by CompositeDynamicObjectCollection.
         *
         * @see CompositeDynamicObjectCollection
         */
        mergers : [DynamicClock.mergeProperties,
                   DynamicBillboard.mergeProperties,
                   DynamicEllipse.mergeProperties,
                   DynamicEllipsoid.mergeProperties,
                   DynamicCone.mergeProperties,
                   DynamicLabel.mergeProperties,
                   DynamicPath.mergeProperties,
                   DynamicPoint.mergeProperties,
                   DynamicPolygon.mergeProperties,
                   DynamicPolyline.mergeProperties,
                   DynamicPyramid.mergeProperties,
                   DynamicObject.mergeProperties],

        /**
         * The standard set of cleaners for processing CZML.  This array is the default
         * set of updater methods used by CompositeDynamicObjectCollection.
         *
         * @see CompositeDynamicObjectCollection
         */
        cleaners : [DynamicBillboard.undefineProperties,
                    DynamicEllipse.undefineProperties,
                    DynamicEllipsoid.undefineProperties,
                    DynamicCone.undefineProperties,
                    DynamicLabel.undefineProperties,
                    DynamicPath.undefineProperties,
                    DynamicPoint.undefineProperties,
                    DynamicPolygon.undefineProperties,
                    DynamicPolyline.undefineProperties,
                    DynamicPyramid.undefineProperties,
                    DynamicObject.undefineProperties,
                    DynamicClock.undefineProperties],

        /**
         * Creates an array containing the standard CZML visualizers,
         * configured for the provided scene.
         *
         * @param scene The scene being used for visualization.
         * @returns {Array} The CZML standard visualizers.
         * @see VisualizerCollection#createCzmlDefaultsCollection
         */
        createVisualizers : function(scene) {
            return [new DynamicBillboardVisualizer(scene),
                    new DynamicEllipsoidVisualizer(scene),
                    new DynamicConeVisualizer(scene),
                    new DynamicLabelVisualizer(scene),
                    new DynamicPointVisualizer(scene),
                    new DynamicPolygonVisualizer(scene),
                    new DynamicPolylineVisualizer(scene),
                    new DynamicPyramidVisualizer(scene),
                    new DynamicPathVisualizer(scene)];
        }
    };

    return CzmlDefaults;
});