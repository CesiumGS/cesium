import defined from '../Core/defined.js';
import Ellipsoid from '../Core/Ellipsoid.js';
import PolylineVolumeOutlineGeometry from '../Core/PolylineVolumeOutlineGeometry.js';

    function createPolylineVolumeOutlineGeometry(polylineVolumeOutlineGeometry, offset) {
        if (defined(offset)) {
            polylineVolumeOutlineGeometry = PolylineVolumeOutlineGeometry.unpack(polylineVolumeOutlineGeometry, offset);
        }
        polylineVolumeOutlineGeometry._ellipsoid = Ellipsoid.clone(polylineVolumeOutlineGeometry._ellipsoid);
        return PolylineVolumeOutlineGeometry.createGeometry(polylineVolumeOutlineGeometry);
    }
export default createPolylineVolumeOutlineGeometry;
