import CoplanarPolygonOutlineGeometry from '../Core/CoplanarPolygonOutlineGeometry.js';
import defined from '../Core/defined.js';
import Ellipsoid from '../Core/Ellipsoid.js';

    function createCoplanarPolygonOutlineGeometry(polygonGeometry, offset) {
        if (defined(offset)) {
            polygonGeometry = CoplanarPolygonOutlineGeometry.unpack(polygonGeometry, offset);
        }
        polygonGeometry._ellipsoid = Ellipsoid.clone(polygonGeometry._ellipsoid);
        return CoplanarPolygonOutlineGeometry.createGeometry(polygonGeometry);
    }
export default createCoplanarPolygonOutlineGeometry;
