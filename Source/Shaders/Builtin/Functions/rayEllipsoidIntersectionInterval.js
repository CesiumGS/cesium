//This file is automatically rebuilt by the Cesium build process.
export default "/**\n\
 * DOC_TBA\n\
 *\n\
 * @name czm_rayEllipsoidIntersectionInterval\n\
 * @glslFunction\n\
 */\n\
czm_raySegment czm_rayEllipsoidIntersectionInterval(czm_ray ray, vec3 ellipsoid_center, vec3 ellipsoid_inverseRadii)\n\
{\n\
   // ray and ellipsoid center in eye coordinates.  radii in model coordinates.\n\
    vec3 q = ellipsoid_inverseRadii * (czm_inverseModelView * vec4(ray.origin, 1.0)).xyz;\n\
    vec3 w = ellipsoid_inverseRadii * (czm_inverseModelView * vec4(ray.direction, 0.0)).xyz;\n\
\n\
    q = q - ellipsoid_inverseRadii * (czm_inverseModelView * vec4(ellipsoid_center, 1.0)).xyz;\n\
\n\
    float q2 = dot(q, q);\n\
    float qw = dot(q, w);\n\
\n\
    if (q2 > 1.0) // Outside ellipsoid.\n\
    {\n\
        if (qw >= 0.0) // Looking outward or tangent (0 intersections).\n\
        {\n\
            return czm_emptyRaySegment;\n\
        }\n\
        else // qw < 0.0.\n\
        {\n\
            float qw2 = qw * qw;\n\
            float difference = q2 - 1.0; // Positively valued.\n\
            float w2 = dot(w, w);\n\
            float product = w2 * difference;\n\
\n\
            if (qw2 < product) // Imaginary roots (0 intersections).\n\
            {\n\
                return czm_emptyRaySegment;\n\
            }\n\
            else if (qw2 > product) // Distinct roots (2 intersections).\n\
            {\n\
                float discriminant = qw * qw - product;\n\
                float temp = -qw + sqrt(discriminant); // Avoid cancellation.\n\
                float root0 = temp / w2;\n\
                float root1 = difference / temp;\n\
                if (root0 < root1)\n\
                {\n\
                    czm_raySegment i = czm_raySegment(root0, root1);\n\
                    return i;\n\
                }\n\
                else\n\
                {\n\
                    czm_raySegment i = czm_raySegment(root1, root0);\n\
                    return i;\n\
                }\n\
            }\n\
            else // qw2 == product.  Repeated roots (2 intersections).\n\
            {\n\
                float root = sqrt(difference / w2);\n\
                czm_raySegment i = czm_raySegment(root, root);\n\
                return i;\n\
            }\n\
        }\n\
    }\n\
    else if (q2 < 1.0) // Inside ellipsoid (2 intersections).\n\
    {\n\
        float difference = q2 - 1.0; // Negatively valued.\n\
        float w2 = dot(w, w);\n\
        float product = w2 * difference; // Negatively valued.\n\
        float discriminant = qw * qw - product;\n\
        float temp = -qw + sqrt(discriminant); // Positively valued.\n\
        czm_raySegment i = czm_raySegment(0.0, temp / w2);\n\
        return i;\n\
    }\n\
    else // q2 == 1.0. On ellipsoid.\n\
    {\n\
        if (qw < 0.0) // Looking inward.\n\
        {\n\
            float w2 = dot(w, w);\n\
            czm_raySegment i = czm_raySegment(0.0, -qw / w2);\n\
            return i;\n\
        }\n\
        else // qw >= 0.0.  Looking outward or tangent.\n\
        {\n\
            return czm_emptyRaySegment;\n\
        }\n\
    }\n\
}\n\
";
