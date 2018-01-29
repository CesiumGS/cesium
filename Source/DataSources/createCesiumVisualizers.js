/*global define*/
define([
        './DataSourceDisplayWithoutVisualizers',
        './BillboardVisualizer',
        './BoxGeometryUpdater',
        './CorridorGeometryUpdater',
        './CylinderGeometryUpdater',
        './EllipseGeometryUpdater',
        './EllipsoidGeometryUpdater',
        './GeometryVisualizer',
        './LabelVisualizer',
        './ModelVisualizer',
        './PathVisualizer',
        './PlaneGeometryUpdater',
        './PointVisualizer',
        './PolygonGeometryUpdater',
        './PolylineGeometryUpdater',
        './PolylineVolumeGeometryUpdater',
        './RectangleGeometryUpdater',
        './WallGeometryUpdater'
    ], function(
        DataSourceDisplay,
        BillboardVisualizer,
        BoxGeometryUpdater,
        CorridorGeometryUpdater,
        CylinderGeometryUpdater,
        EllipseGeometryUpdater,
        EllipsoidGeometryUpdater,
        GeometryVisualizer,
        LabelVisualizer,
        ModelVisualizer,
        PathVisualizer,
        PlaneGeometryUpdater,
        PointVisualizer,
        PolygonGeometryUpdater,
        PolylineGeometryUpdater,
        PolylineVolumeGeometryUpdater,
        RectangleGeometryUpdater,
        WallGeometryUpdater) {
    'use strict';

    function createCesiumVisualizers(scene, entityCluster, dataSource) {
        var entities = dataSource.entities;
        return [new BillboardVisualizer(entityCluster, entities),
            new GeometryVisualizer(BoxGeometryUpdater, scene, entities),
            new GeometryVisualizer(CylinderGeometryUpdater, scene, entities),
            new GeometryVisualizer(CorridorGeometryUpdater, scene, entities),
            new GeometryVisualizer(EllipseGeometryUpdater, scene, entities),
            new GeometryVisualizer(EllipsoidGeometryUpdater, scene, entities),
            new GeometryVisualizer(PlaneGeometryUpdater, scene, entities),
            new GeometryVisualizer(PolygonGeometryUpdater, scene, entities),
            new GeometryVisualizer(PolylineGeometryUpdater, scene, entities),
            new GeometryVisualizer(PolylineVolumeGeometryUpdater, scene, entities),
            new GeometryVisualizer(RectangleGeometryUpdater, scene, entities),
            new GeometryVisualizer(WallGeometryUpdater, scene, entities),
            new LabelVisualizer(entityCluster, entities),
            new ModelVisualizer(scene, entities),
            new PointVisualizer(entityCluster, entities),
            new PathVisualizer(scene, entities)];
    }

    return createCesiumVisualizers;
});
