import ScreenspacePanCameraController from "./ScreenspaceElevatorCameraController.js";
import ScreenspaceMapCameraController from "./ScreenspaceMapCameraController.js";
import Cartesian3 from "../../Core/Cartesian3.js";
import CesiumMath from "../../Core/Math.js";

/**
 * A contextual camera controller that combines screenspace panning and screenspace map controls.
 * Based on the camera angle, either a screenspace pan or screenspace map controller is used:
 * - If the camera is looking mostly down (within angleThreshold of nadir), the screenspace map controller is used.
 * - If the camera is looking more horizontally (beyond angleThreshold from nadir), the screenspace pan controller is used.
 */
export default class HybridScreenspacePanCameraController {
    constructor() {
        this._panController = new ScreenspacePanCameraController();
        this._mapController = new ScreenspaceMapCameraController();

        this._enabled = true;
        this._ellipsoidNormal = new Cartesian3();
        
        this.angleThreshold = CesiumMath.toRadians(45);
    }
    
    get enabled() {
        return this._enabled;
    }

    set enabled(value) {
        this._enabled = value;
    }
    
    connectedCallback(element) {
        this._panController.connectedCallback(element);
        this._mapController.connectedCallback(element);
    }

    disconnectedCallback(element) {
        this._panController.disconnectedCallback(element);
        this._mapController.disconnectedCallback(element);
    }
    
    firstUpdate(scene, time) {
        this._panController.firstUpdate(scene, time);
        this._mapController.firstUpdate(scene, time);
    }

    update(scene, time) {
            const camera = scene.camera;
            const normal = scene.ellipsoid.geodeticSurfaceNormal(
            camera.positionWC,
            this._ellipsoidNormal,
            );

        const angle = Math.abs(Cartesian3.angleBetween(normal, camera.directionWC));
        
        if (angle < this.angleThreshold) {
            this._panController.update(scene, time);
        } else {
            this._mapController.update(scene, time);
        }
    }
}