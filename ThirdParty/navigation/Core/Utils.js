import defined from  '../../../Source/Core/defined.js';
import Ray from  '../../../Source/Core/Ray.js';
import Cartesian3 from  '../../../Source/Core/Cartesian3.js';
import Cartographic from  '../../../Source/Core/Cartographic.js';
import ReferenceFrame from  '../../../Source/Core/ReferenceFrame.js';
import SceneMode from  '../../../Source/Scene/SceneMode.js';

var Utils = {};

var unprojectedScratch = new Cartographic();
var rayScratch = new Ray();

/**
 * gets the focus point of the camera
 * @param {Viewer|Widget} terria The terria
 * @param {boolean} inWorldCoordinates true to get the focus in world coordinates, otherwise get it in projection-specific map coordinates, in meters.
 * @param {Cartesian3} [result] The object in which the result will be stored.
 * @return {Cartesian3} The modified result parameter, a new instance if none was provided or undefined if there is no focus point.
 */
Utils.getCameraFocus = function (terria, inWorldCoordinates, result) {
    var scene = terria.scene;
    var camera = scene.camera;

    if(scene.mode == SceneMode.MORPHING) {
        return undefined;
    }

    if(!defined(result)) {
        result = new Cartesian3();
    }

    // TODO bug when tracking: if entity moves the current position should be used and not only the one when starting orbiting/rotating
    // TODO bug when tracking: reset should reset to default view of tracked entity

    if(defined(terria.trackedEntity)) {
        result = terria.trackedEntity.position.getValue(terria.clock.currentTime, result);
    } else {
        rayScratch.origin = camera.positionWC;
        rayScratch.direction = camera.directionWC;
        result = scene.globe.pick(rayScratch, scene, result);
    }

    if (!defined(result)) {
        return undefined;
    }

    if(scene.mode == SceneMode.SCENE2D || scene.mode == SceneMode.COLUMBUS_VIEW) {
        result = camera.worldToCameraCoordinatesPoint(result, result);

        if(inWorldCoordinates) {
            result = scene.globe.ellipsoid.cartographicToCartesian(scene.mapProjection.unproject(result, unprojectedScratch), result);
        }
    } else {
        if(!inWorldCoordinates) {
            result = camera.worldToCameraCoordinatesPoint(result, result);
        }
    }

    return result;
};

export default Utils;
