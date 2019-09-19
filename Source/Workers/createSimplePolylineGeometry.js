import defined from '../Core/defined.js';
import Ellipsoid from '../Core/Ellipsoid.js';
import SimplePolylineGeometry from '../Core/SimplePolylineGeometry.js';

    function createSimplePolylineGeometry(simplePolylineGeometry, offset) {
        if (defined(offset)) {
            simplePolylineGeometry = SimplePolylineGeometry.unpack(simplePolylineGeometry, offset);
        }
        simplePolylineGeometry._ellipsoid = Ellipsoid.clone(simplePolylineGeometry._ellipsoid);
        return SimplePolylineGeometry.createGeometry(simplePolylineGeometry);
    }
export default createSimplePolylineGeometry;
