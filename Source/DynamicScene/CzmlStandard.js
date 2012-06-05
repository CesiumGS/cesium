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
        './VisualizerCollection',
        './DynamicBillboardVisualizer',
        './DynamicConeVisualizer',
        './DynamicLabelVisualizer',
        './DynamicPointVisualizer',
        './DynamicPolygonVisualizer',
        './DynamicPolylineVisualizer',
        './DynamicPyramidVisualizer'
       ], function(
        DynamicObject,
        DynamicBillboard,
        DynamicCone,
        DynamicLabel,
        DynamicPoint,
        DynamicPolygon,
        DynamicPolyline,
        DynamicPyramid,
        VisualizerCollection,
        DynamicBillboardVisualizer,
        DynamicConeVisualizer,
        DynamicLabelVisualizer,
        DynamicPointVisualizer,
        DynamicPolygonVisualizer,
        DynamicPolylineVisualizer,
        DynamicPyramidVisualizer) {
    "use strict";

    var CzmlStandard = {
        //Any change to this list needs to be reflected in the DynamicObject constructor.
        updaters : [DynamicBillboard.processCzmlPacket,
                    DynamicCone.processCzmlPacket,
                    DynamicLabel.processCzmlPacket,
                    DynamicPoint.processCzmlPacket,
                    DynamicPolygon.processCzmlPacket,
                    DynamicPolyline.processCzmlPacket,
                    DynamicPyramid.processCzmlPacket,
                    DynamicObject.processCzmlPacketPosition,
                    DynamicObject.processCzmlPacketOrientation,
                    DynamicObject.processCzmlPacketVertexPositions],

        mergers : [DynamicBillboard.mergeProperties,
                   DynamicCone.mergeProperties,
                   DynamicLabel.mergeProperties,
                   DynamicPoint.mergeProperties,
                   DynamicPolygon.mergeProperties,
                   DynamicPolyline.mergeProperties,
                   DynamicPyramid.mergeProperties,
                   DynamicObject.mergeProperties],

        cleaners : [DynamicBillboard.undefineProperties,
                    DynamicCone.undefineProperties,
                    DynamicLabel.undefineProperties,
                    DynamicPoint.undefineProperties,
                    DynamicPolygon.undefineProperties,
                    DynamicPolyline.undefineProperties,
                    DynamicPyramid.undefineProperties,
                    DynamicObject.undefineProperties],

        createVisualizers : function(scene, dynamicObjectCollection) {
            return new VisualizerCollection([new DynamicBillboardVisualizer(scene),
                                             new DynamicConeVisualizer(scene),
                                             new DynamicLabelVisualizer(scene),
                                             new DynamicPointVisualizer(scene),
                                             new DynamicPolygonVisualizer(scene),
                                             new DynamicPolylineVisualizer(scene),
                                             new DynamicPyramidVisualizer(scene)],
                                             dynamicObjectCollection);
        }
    };

    return CzmlStandard;
});