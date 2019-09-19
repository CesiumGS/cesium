import CoplanarPolygonGeometry from '../Core/CoplanarPolygonGeometry.js';
import defined from '../Core/defined.js';

    function createCoplanarPolygonGeometry(polygonGeometry, offset) {
        if (defined(offset)) {
            polygonGeometry = CoplanarPolygonGeometry.unpack(polygonGeometry, offset);
        }
        return CoplanarPolygonGeometry.createGeometry(polygonGeometry);
    }
export default createCoplanarPolygonGeometry;
