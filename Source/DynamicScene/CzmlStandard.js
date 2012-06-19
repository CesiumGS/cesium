/*global define*/
define([
        './DynamicObject',
        './DynamicBillboard',
        './DynamicCone',
        './DynamicLabel',
        './DynamicPoint',
        './DynamicPolygon',
        './DynamicPolyline',
        './DynamicPyramid',
        './VisualizerCollection'
       ], function(
        DynamicObject,
        DynamicBillboard,
        DynamicCone,
        DynamicLabel,
        DynamicPoint,
        DynamicPolygon,
        DynamicPolyline,
        DynamicPyramid,
        VisualizerCollection) {
    "use strict";

    //NOTE!
    //Any change to the updater list needs to be reflected in the DynamicObject constructor.
    //Any new visualizers need to be added to VisualizerCollection.createCzmlStandardCollection.
    //NOTE!

    /**
     * Helper class which provides the full collection of CZML processing methods
     * needed to visualize the complete CZML standard.
     *
     * @exports CzmlStandard
     */
    var CzmlStandard = {
        /**
         * The standard set of updaters for processing CZML.  This array is the default
         * set of updater methods used by DynamicObjectCollection.
         *
         * @see DynamicObjectCollection
         */
        updaters : [DynamicBillboard.processCzmlPacket,
                    DynamicCone.processCzmlPacket,
                    DynamicLabel.processCzmlPacket,
                    DynamicPoint.processCzmlPacket,
                    DynamicPolygon.processCzmlPacket,
                    DynamicPolyline.processCzmlPacket,
                    DynamicPyramid.processCzmlPacket,
                    DynamicObject.processCzmlPacketPosition,
                    DynamicObject.processCzmlPacketOrientation,
                    DynamicObject.processCzmlPacketVertexPositions,
                    DynamicObject.processCzmlPacketAvailability],

        /**
         * The standard set of mergers for processing CZML.  This array is the default
         * set of updater methods used by CompositeDynamicObjectCollection.
         *
         * @see CompositeDynamicObjectCollection
         */
        mergers : [DynamicBillboard.mergeProperties,
                   DynamicCone.mergeProperties,
                   DynamicLabel.mergeProperties,
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
                    DynamicCone.undefineProperties,
                    DynamicLabel.undefineProperties,
                    DynamicPoint.undefineProperties,
                    DynamicPolygon.undefineProperties,
                    DynamicPolyline.undefineProperties,
                    DynamicPyramid.undefineProperties,
                    DynamicObject.undefineProperties],

        /**
         * Creates a new VisualizerCollection which includes all standard visualizers.
         *
         * @see VisualizerCollection
         * @see VisualizerCollection#createCzmlStandardCollection
         */
        createCzmlStandardVisualizerCollection : function(scene, dynamicObjectCollection) {
            return VisualizerCollection.createCzmlStandardCollection(scene, dynamicObjectCollection);
        }
    };

    return CzmlStandard;
});