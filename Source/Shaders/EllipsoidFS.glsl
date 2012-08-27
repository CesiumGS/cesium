uniform vec3 u_radii;

varying vec3 v_positionEC;

// TODO: uniform
vec3 oneOverEllipsoidRadiiSquared = 1.0 / (u_radii * u_radii);

void main()
{
 
    // TODO:  WTF - center in eye coordinates, and radii in model coordinates!
    czm_ellipsoid ellipsoid = czm_ellipsoidNew(czm_modelView[3].xyz, u_radii);
    vec3 direction = normalize(v_positionEC);
    czm_ray ray = czm_ray(vec3(0.0), direction);
    czm_raySegment intersection = czm_rayEllipsoidIntersectionInterval(ray, ellipsoid);
    
    if (!czm_isEmpty(intersection))
    {
        // TODO: start is zero if inside the ellipsoid
            

            
        vec3 positionEC = czm_pointAlongRay(ray, intersection.start);
        vec3 positionMC = (czm_inverseModelView * vec4(positionEC, 1.0)).xyz;
        
        vec3 normalMC = normalize(czm_geodeticSurfaceNormal(positionMC, vec3(0.0), oneOverEllipsoidRadiiSquared));  // normalized surface normal in model coordinates
        vec3 normalEC = normalize(czm_normal * normalMC);                                                           // normalized surface normal in eye coordiantes
        
        vec2 st = czm_ellipsoidWgs84TextureCoordinates(normalMC);
        vec3 positionToEyeEC = normalize(-positionEC); 
                    
        czm_materialInput materialInput;
        materialInput.s = st.s;
        materialInput.st = st;
        materialInput.str = (positionMC + u_radii) / u_radii;
        materialInput.normalEC = normalEC;
        materialInput.tangentToEyeMatrix = czm_eastNorthUpToEyeCoordinates(positionMC, normalEC);
        materialInput.positionToEyeWC = positionToEyeEC;
        materialInput.positionMC = positionMC;
        
        czm_material material = czm_getMaterial(materialInput);

		vec4 color; 
//#ifdef AFFECTED_BY_LIGHTING
		color = czm_lightValuePhong(czm_sunDirectionEC, positionToEyeEC, material);
//#else
//		color = vec4(material.diffuse, material.alpha);
//#endif
		
		gl_FragColor = color;
    }
    else
    {
//        gl_FragColor = vec4(1.0, 0.0, 0.0, 0.75);
        discard;
    }
}
