var Cesium = module.exports = {};
var requirejs = require('requirejs');
var async = require('async');
var q = require('q');

var compat = {
  'Core': [
    'AxisAlignedBoundingBox',
    'BingMapsApi',
    'BoundingRectangle',
    'BoundingSphere',
    'BoxGeometry',
    'BoxOutlineGeometry',
    'Cartesian2',
    'Cartesian3',
    'Cartesian4',
    'Cartographic',
    'CatmullRomSpline',
    'CircleGeometry',
    'CircleOutlineGeometry',
    'Clock',
    'ClockRange',
    'ClockStep',
    'Color',
    'ColorGeometryInstanceAttribute',
    'ComponentDatatype',
    'CornerType',
    'CorridorGeometry',
    'CorridorGeometryLibrary',
    'CorridorOutlineGeometry',
    'CubicRealPolynomial',
    'CylinderGeometry',
    'CylinderGeometryLibrary',
    'CylinderOutlineGeometry',
    'DefaultProxy',
    'DeveloperError',
    'EarthOrientationParameters',
    'EarthOrientationParametersSample',
    'EllipseGeometry',
    'EllipseGeometryLibrary',
    'EllipseOutlineGeometry',
    'Ellipsoid',
    'EllipsoidGeodesic',
    'EllipsoidGeometry',
    'EllipsoidOutlineGeometry',
    'EllipsoidTangentPlane',
    'EllipsoidalOccluder',
    'EncodedCartesian3',
    'Enumeration',
    'Event',
    'EventHelper',
    'Extent',
    'ExtentGeometry',
    'ExtentOutlineGeometry',
    'FAR',
    'FeatureDetection',
    'Fullscreen',
    'GeographicProjection',
    'Geometry',
    'GeometryAttribute',
    'GeometryAttributes',
    'GeometryInstance',
    'GeometryInstanceAttribute',
    'GeometryPipeline',
    'HeightmapTessellator',
    'HermitePolynomialApproximation',
    'HermiteSpline',
    'Iau2000Orientation',
    'Iau2006XysData',
    'Iau2006XysSample',
    'IauOrientationAxes',
    'IauOrientationParameters',
    'IndexDatatype',
    'InterpolationAlgorithm',
    'Intersect',
    'IntersectionTests',
    'Interval',
    'Iso8601',
    'JulianDate',
    'KeyboardEventModifier',
    'LagrangePolynomialApproximation',
    'LeapSecond',
    'LinearApproximation',
    'LinearSpline',
    'Math',
    'Matrix2',
    'Matrix3',
    'Matrix4',
    'NearFarScalar',
    'ObjectOrientedBoundingBox',
    'Occluder',
    'Packable',
    'PackableForInterpolation',
    'Plane',
    'PolygonGeometry',
    'PolygonGeometryLibrary',
    'PolygonOutlineGeometry',
    'PolygonPipeline',
    'PolylineGeometry',
    'PolylinePipeline',
    'PolylineVolumeGeometry',
    'PolylineVolumeGeometryLibrary',
    'PolylineVolumeOutlineGeometry',
    'PrimitiveType',
    'QuadraticRealPolynomial',
    'QuarticRealPolynomial',
    'Quaternion',
    'QuaternionSpline',
    'Queue',
    'Ray',
    'ReferenceFrame',
    'RequestErrorEvent',
    'RuntimeError',
    'ScreenSpaceEventHandler',
    'ScreenSpaceEventType',
    'Shapes',
    'ShowGeometryInstanceAttribute',
    'Simon1994PlanetaryPositions',
    'SimplePolylineGeometry',
    'SphereGeometry',
    'SphereOutlineGeometry',
    'Spherical',
    'Spline',
    'TaskProcessor',
    'TimeConstants',
    'TimeInterval',
    'TimeIntervalCollection',
    'TimeStandard',
    'Tipsify',
    'Transforms',
    'TridiagonalSystemSolver',
    'VertexFormat',
    'Visibility',
    'WallGeometry',
    'WallGeometryLibrary',
    'WallOutlineGeometry',
    'WebMercatorProjection',
    'WindingOrder',
    'barycentricCoordinates',
    'binarySearch',
    'buildModuleUrl',
    'clone',
    'combine',
    'createGuid',
    'defaultValue',
    'defineProperties',
    'defined',
    'destroyObject',
    'freezeObject',
    'getFilenameFromUri',
    'getImagePixels',
    'isCrossOriginUrl',
    'isLeapYear',
    'jsonp',
    'loadArrayBuffer',
    'loadBlob',
    'loadImage',
    'loadImageViaBlob',
    'loadJson',
    'loadText',
    'loadWithXhr',
    'loadXML',
    'pointInsideTriangle',
    'throttleRequestByServer',
    'wrapFunction',
    'writeTextToCanvas'
  ],
    'Scene': [
    'GeographicTilingScheme',
    'WebMercatorTilingScheme'
  ]
};
var sections = Object.keys(compat);

function loadSectionModules(section, callback) {
  var mods = compat[section];
  var modulePaths = mods.map(function(name) {
    return './Source/' + section + '/' + name;
  });
  
  requirejs.config({
    baseUrl: "."
  });

  requirejs(modulePaths, function() {
    var loadedModules = [].slice.call(arguments);

    // iterate through the arguments and patch into the Cesium global
    mods.forEach(function(name, index) {
      Cesium[name] = loadedModules[index];
    });

    callback();
  });
}

var deferred = q.defer();

Cesium.isReady = deferred.promise;
  
async.forEach(sections, loadSectionModules, function() {
  deferred.resolve();
});

 