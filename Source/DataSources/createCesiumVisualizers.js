/*global define*/
define([
        './DataSourceDisplayWithoutVisualizers',
        './BillboardVisualizer',
        './GeometryVisualizer',
        './LabelVisualizer',
        './ModelVisualizer',
        './PathVisualizer',
        './PointVisualizer',
        './PolylineVisualizer',
    ], function(
        DataSourceDisplay,
        BillboardVisualizer,
        GeometryVisualizer,
        LabelVisualizer,
        ModelVisualizer,
        PathVisualizer,
        PointVisualizer,
        PolylineVisualizer) {
    'use strict';

    function createCesiumVisualizers(scene, entityCluster, dataSource) {
        var entities = dataSource.entities;
        return [new BillboardVisualizer(entityCluster, entities),
                new GeometryVisualizer(scene, entities, dataSource._primitives, dataSource._groundPrimitives),
                new LabelVisualizer(entityCluster, entities),
                new ModelVisualizer(scene, entities),
                new PointVisualizer(entityCluster, entities),
                new PathVisualizer(scene, entities),
                new PolylineVisualizer(scene, entities, dataSource._primitives, dataSource._groundPrimitives)];
    }

    return createCesiumVisualizers;
});
