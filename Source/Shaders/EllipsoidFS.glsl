uniform vec3 u_radii;
uniform vec3 u_oneOverEllipsoidRadiiSquared;

varying vec3 v_positionEC;

void main()
{
    czm_ellipsoid ellipsoid = czm_ellipsoidNew(czm_modelView[3].xyz, u_radii);
    vec3 direction = normalize(v_positionEC);
    czm_ray ray = czm_ray(vec3(0.0), direction);
    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid);
    
    if (czm_isEmpty(intersection))
    {
        discard;
    }
        
    // Pick the intersection point based on if the viewer is outside or inside the ellipsoid
    bool hitFrontFace = (intersection.start != 0.0);
    vec3 positionEC = czm_pointAlongRay(ray, hitFrontFace ? intersection.start : intersection.stop);
    vec3 positionMC = (czm_inverseModelView * vec4(positionEC, 1.0)).xyz;
    vec3 geodeticNormal = normalize(czm_geodeticSurfaceNormal(positionMC, vec3(0.0), u_oneOverEllipsoidRadiiSquared));
    vec3 normalMC = hitFrontFace ? geodeticNormal : -geodeticNormal;   // normalized surface normal (always facing the viewer) in model coordinates
    vec3 normalEC = normalize(czm_normal * normalMC);                    // normalized surface normal in eye coordiantes
    
    vec2 st = czm_ellipsoidWgs84TextureCoordinates(geodeticNormal);
    vec3 positionToEyeEC = -positionEC; 
                
    czm_materialInput materialInput;
    materialInput.s = st.s;
    materialInput.st = st;
    materialInput.str = (positionMC + u_radii) / u_radii;
    materialInput.normalEC = normalEC;
    materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(positionMC, normalEC);
    materialInput.positionToEyeEC = positionToEyeEC;
    materialInput.positionMC = positionMC;
    czm_material material = czm_getMaterial(materialInput);

	gl_FragColor = czm_phong(normalize(positionToEyeEC), material);
}
