import defined from '../Core/defined.js';
import SphereOutlineGeometry from '../Core/SphereOutlineGeometry.js';

    function createSphereOutlineGeometry(sphereGeometry, offset) {
        if (defined(offset)) {
            sphereGeometry = SphereOutlineGeometry.unpack(sphereGeometry, offset);
        }
        return SphereOutlineGeometry.createGeometry(sphereGeometry);
    }
export default createSphereOutlineGeometry;
