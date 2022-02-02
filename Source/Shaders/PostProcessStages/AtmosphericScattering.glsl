uniform sampler2D colorTexture;
uniform sampler2D depthTexture;

uniform float planetRadius;

varying vec2 v_textureCoordinates;

vec2 raySphereIntersect(vec3 r0, vec3 rd, float sr) {
    float a = dot(rd, rd);
    float b = 2.0 * dot(rd, r0);
    float c = dot(r0, r0) - (sr * sr);
    float d = (b * b) - 4.0 * a * c;

    // stop early if there is no intersect
    if (d < 0.0) return vec2(-1.0, -1.0);

    // calculate the ray length
    float squaredD = sqrt(d);
    return vec2(
        (-b - squaredD) / (2.0 * a),
        (-b + squaredD) / (2.0 * a)
    );
}

// --------------------------------------------------------------------------------------------------------------------
//
// Atmosphere by Dimas Leenman, Shared under the MIT license
// https://github.com/Dimev/Realistic-Atmosphere-Godot-and-UE4/blob/master/godot/shader/atmosphere.shader
//
// --------------------------------------------------------------------------------------------------------------------
vec3 light_intensity = vec3(100.0); // how bright the light is, affects the brightness of the atmosphere

float atmo_thickness = 111e3;
float atmo_radius = planetRadius + atmo_thickness;
float atmo_radius_squared = atmo_radius * atmo_radius; // the radius of the atmosphere
vec3 beta_ray = vec3(5.5e-6, 13.0e-6, 22.4e-6); // the amount rayleigh scattering scatters the colors (for earth: causes the blue atmosphere)
vec3 beta_mie = vec3(21e-6); // the amount mie scattering scatters colors
vec3 beta_ambient = vec3(0.0); // the amount of scattering that always occurs, can help make the back side of the atmosphere a bit brighter
float g = 0.9; // the direction mie scatters the light in (like a cone). closer to -1 means more towards a single direction
float height_ray = 10e3; // how high do you have to go before there is no rayleigh scattering?
float height_mie = 3.2e3; // the same, but for mie
float density_multiplier = 1.0; // how much extra the atmosphere blocks light

vec4 calculate_scattering(
    vec3 start, 			// the start of the ray (the camera position)
    vec3 dir, 				// the direction of the ray (the camera vector)
    float maxDistance, 		// the maximum distance the ray can travel (because something is in the way, like an object)
    vec3 light_dir
) {

    // calculate the start and end position of the ray, as a distance along the ray
    // we do this with a ray sphere intersect
    float a = dot(dir, dir);
    float b = 2.0 * dot(dir, start);
    float c = dot(start, start) - atmo_radius_squared;
    float d = (b * b) - 4.0 * a * c;

    // stop early if there is no intersect
    if (d < 0.0) return vec4(0.0);

    // calculate the ray length
    float squaredD = sqrt(d);
    vec2 ray_length = vec2(
        max((-b - squaredD) / (2.0 * a), 0.0),
        min((-b + squaredD) / (2.0 * a), maxDistance)
    );

    // if the ray did not hit the atmosphere, return a black color
    if (ray_length.x > ray_length.y) return vec4(0.0);

    // prevent the mie glow from appearing if there's an object in front of the camera
    bool allow_mie = maxDistance > ray_length.y;

    // get the step size of the ray
    float step_size_i = (ray_length.y - ray_length.x) / float(PRIMARY_STEPS);

    // next, set how far we are along the ray, so we can calculate the position of the sample
    // if the camera is outside the atmosphere, the ray should start at the edge of the atmosphere
    // if it's inside, it should start at the position of the camera
    // the min statement makes sure of that
    float ray_pos_i = ray_length.x;

    // these are the values we use to gather all the scattered light
    vec3 total_ray = vec3(0.0); // for rayleigh
    vec3 total_mie = vec3(0.0); // for mie

    // initialize the optical depth. This is used to calculate how much air was in the ray
    vec2 opt_i = vec2(0.0);

    // also init the scale height, avoids some vec2's later on
    vec2 scale_height = vec2(height_ray, height_mie);

    // Calculate the Rayleigh and Mie phases.
    // This is the color that will be scattered for this ray
    // mu, mumu and gg are used quite a lot in the calculation, so to speed it up, precalculate them
    float mu = dot(dir, light_dir);
    float mumu = mu * mu;
    float gg = g * g;
    float phase_ray = 3.0 / (50.2654824574 ) * (1.0 + mumu);
    float phase_mie = allow_mie ? 3.0 / (25.1327412287 ) * ((1.0 - gg) * (mumu + 1.0)) / (pow(1.0 + gg - 2.0 * mu * g, 1.5) * (2.0 + gg)) : 0.0;

    // now we need to sample the 'primary' ray. this ray gathers the light that gets scattered onto it
    for (int i = 0; i < PRIMARY_STEPS; ++i) {

        // calculate where we are along this ray
        vec3 pos_i = start + dir * (ray_pos_i + step_size_i);

        // and how high we are above the surface
        float height_i = length(pos_i) - planetRadius;

        // now calculate the density of the particles (both for rayleigh and mie)
        vec2 density = exp(-height_i / scale_height) * step_size_i;

        // Add these densities to the optical depth, so that we know how many particles are on this ray.
        opt_i += density;

        // Calculate the step size of the light ray.
        // again with a ray sphere intersect
        // a, b, c and d are already defined
        a = dot(light_dir, light_dir);
        b = 2.0 * dot(light_dir, pos_i);
        c = dot(pos_i, pos_i) - atmo_radius_squared;
        d = (b * b) - 4.0 * a * c;

        if (d <= 0.0) d = 1.0; // GeoFS: not supposed to be required but this avoids a black singularity line at dusk and dawn

        // no early stopping, this one should always be inside the atmosphere
        // calculate the ray length
        float step_size_l = (-b + sqrt(d)) / (2.0 * a * float(LIGHT_STEPS));

        // and the position along this ray
        // this time we are sure the ray is in the atmosphere, so set it to 0
        float ray_pos_l = 0.0;

        // and the optical depth of this ray
        vec2 opt_l = vec2(0.0);

        // now sample the light ray
        // this is similar to what we did before
        for (int l = 0; l < LIGHT_STEPS; ++l) {

            // calculate where we are along this ray
            vec3 pos_l = pos_i + light_dir * (ray_pos_l + step_size_l * 0.5);

            // the heigth of the position
            float height_l = length(pos_l) - planetRadius;

            // calculate the particle density, and add it
            opt_l += exp(-height_l / scale_height) * step_size_l;

            // and increment where we are along the light ray.
            ray_pos_l += step_size_l;
        }

        // Now we need to calculate the attenuation
        // this is essentially how much light reaches the current sample point due to scattering
        vec3 attn = exp(-((beta_mie * (opt_i.y + opt_l.y)) + (beta_ray * (opt_i.x + opt_l.x))));

        // accumulate the scattered light (how much will be scattered towards the camera)
        total_ray += density.x * attn;
        total_mie += density.y * attn;

        // and increment the position on this ray
        ray_pos_i += step_size_i;
    }

    // calculate how much light can pass through the atmosphere
    float opacity = length(exp(-((beta_mie * opt_i.y) + (beta_ray * opt_i.x)) * density_multiplier));

    return vec4((
            phase_ray * beta_ray * total_ray // rayleigh color
            + phase_mie * beta_mie * total_mie // mie
            + opt_i.x * beta_ambient // and ambient
        ) * light_intensity, 1.0 - opacity);
}

void main() {

    vec4 color = texture2D(colorTexture, v_textureCoordinates);
    vec4 rawDepthColor = texture2D(depthTexture, v_textureCoordinates);

    //float depth = czm_unpackDepth(rawDepthColor); // depth packing appears to be buggy on mobile
    float depth = rawDepthColor.r; // so only use the most significant depth element for now

    // calculate world position from view/depth
    vec4 positionEC = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);
    vec4 worldCoordinate = czm_inverseView * positionEC;
    vec3 vWorldPosition = worldCoordinate.xyz / worldCoordinate.w;

    vec3 posToEye = vWorldPosition - czm_viewerPositionWC;
    vec3 direction = normalize(posToEye);
    vec3 lightDirection = normalize(czm_sunPositionWC);
    float distance = length(posToEye);

    // clamp distance to avoid artefacts at max depth
    if (depth == 1.0) {
        distance = 10000000.0;
    }

    // atmosphere scattering
    vec4 atmosphereColor = calculate_scattering(
        czm_viewerPositionWC,
        direction,
        distance,
        lightDirection
    );

    color = atmosphereColor + color * (1.0 - atmosphereColor.a);

    // tone mapping
    // necessary for globe colors to appear natural
    float exposure = 1.0;
    color = vec4(1.0 - exp(-exposure * color));
    float gamma = 0.8;
    color = pow(color, vec4(1.0 / gamma));

    gl_FragColor = color;
}
