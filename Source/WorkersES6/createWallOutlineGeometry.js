import defined from '../Core/defined.js';
import Ellipsoid from '../Core/Ellipsoid.js';
import WallOutlineGeometry from '../Core/WallOutlineGeometry.js';

    function createWallOutlineGeometry(wallGeometry, offset) {
        if (defined(offset)) {
            wallGeometry = WallOutlineGeometry.unpack(wallGeometry, offset);
        }
        wallGeometry._ellipsoid = Ellipsoid.clone(wallGeometry._ellipsoid);
        return WallOutlineGeometry.createGeometry(wallGeometry);
    }
export default createWallOutlineGeometry;
