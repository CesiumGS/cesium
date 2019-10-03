import defined from '../Core/defined.js';
import EllipsoidGeometry from '../Core/EllipsoidGeometry.js';

    function createEllipsoidGeometry(ellipsoidGeometry, offset) {
        if (defined(offset)) {
            ellipsoidGeometry = EllipsoidGeometry.unpack(ellipsoidGeometry, offset);
        }
        return EllipsoidGeometry.createGeometry(ellipsoidGeometry);
    }
export default createEllipsoidGeometry;
