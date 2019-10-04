import Cartesian3 from '../Core/Cartesian3.js';
import CircleGeometry from '../Core/CircleGeometry.js';
import defined from '../Core/defined.js';
import Ellipsoid from '../Core/Ellipsoid.js';

    function createCircleGeometry(circleGeometry, offset) {
        if (defined(offset)) {
            circleGeometry = CircleGeometry.unpack(circleGeometry, offset);
        }
        circleGeometry._ellipseGeometry._center = Cartesian3.clone(circleGeometry._ellipseGeometry._center);
        circleGeometry._ellipseGeometry._ellipsoid = Ellipsoid.clone(circleGeometry._ellipseGeometry._ellipsoid);
        return CircleGeometry.createGeometry(circleGeometry);
    }
export default createCircleGeometry;
