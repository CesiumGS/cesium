/*!
 * Atmosphere code:
 *
 * Copyright (c) 2000-2005, Sean O'Neil (s_p_oneil@hotmail.com)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * * Redistributions of source code must retain the above copyright notice,
 *   this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright notice,
 *   this list of conditions and the following disclaimer in the documentation
 *   and/or other materials provided with the distribution.
 * * Neither the name of the project nor the names of its contributors may be
 *   used to endorse or promote products derived from this software without
 *   specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 *
 * Modifications made by Analytical Graphics, Inc.
 */

 // Atmosphere:
 //   Code:  http://sponeil.net/
 //   GPU Gems 2 Article:  https://developer.nvidia.com/gpugems/GPUGems2/gpugems2_chapter16.html

czm_raySegment raySphereIntersection(czm_ray ray, float radius)
{
    vec3 o = ray.origin;
    vec3 d = ray.direction;

    float a = dot(d, d);
    float b = 2.0 * dot(o, d);
    float c = dot(o, o) - (radius * radius);

    float det = (b * b) - (4.0 * a * c);

    if (det < 0.0) {
        return czm_emptyRaySegment;
    }

    float sqrtDet = sqrt(det);


    float t0 = (-b - sqrtDet) / (2.0 * a);
    float t1 = (-b + sqrtDet) / (2.0 * a);

    return czm_raySegment(t0, t1);
}

const float Kr = 0.0025;
const float Km = 0.0015;
const float ESun = 15.0;

const float fKrESun = Kr * ESun;
const float fKmESun = Km * ESun;
const float fKr4PI = Kr * 4.0 * czm_pi;
const float fKm4PI = Km * 4.0 * czm_pi;

// Original: vec3(1.0 / pow(0.650, 4.0), 1.0 / pow(0.570, 4.0), 1.0 / pow(0.475, 4.0));
const vec3 v3InvWavelength = vec3(5.60204474633241, 9.473284437923038, 19.64380261047721);

const float fScaleDepth = 0.25;

struct AtmosphereColor
{
    vec3 mie;
    vec3 rayleigh;
    float opacity;
};

const int nSamples = 2;
const float fSamples = 2.0;

float scale(float fCos)
{
    float x = 1.0 - fCos;
    return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));
}

float planetRadius = 6356752.3142;
float ATMOSPHERE_THICKNESS = 111e3;

float G = 0.9;

float RAYLEIGH_HEIGHT_LIMIT = 10e3;
float MIE_HEIGHT_LIMIT = 3.2e3;

vec3 BETA_RAYLEIGH = vec3(5.5e-6, 13.0e-6, 22.4e-6);
vec3 BETA_MIE = vec3(21e-6);
vec3 BETA_AMBIENT = vec3(0.0);

vec3 LIGHT_INTENSITY = vec3(100.0);


void computeScattering(
    vec3 start,
    vec3 direction,
    float maxDistance,
    vec3 lightDirection,
    out vec3 rayleighColor,
    out vec3 mieColor,
    out float opacity
) {

    const int PRIMARY_STEPS = 16;
    const int LIGHT_STEPS = 4;

    vec2 HEIGHT_SCALE = vec2(RAYLEIGH_HEIGHT_LIMIT, MIE_HEIGHT_LIMIT);

    float planetRadius = 6356752.3142;
    float AtmosphereRadius = planetRadius + ATMOSPHERE_THICKNESS;

    // Initialize the default scattering amounts to 0.
    rayleighColor = vec3(0.0);
    mieColor = vec3(0.0);
    opacity = 0.0;

    // Find the intersection from the ray to the outer ring of the atmosphere.
    czm_ray viewpointRay = czm_ray(start, direction);
    czm_raySegment viewpointAtmosphereIntersect = raySphereIntersection(viewpointRay, AtmosphereRadius);

    if (viewpointAtmosphereIntersect == czm_emptyRaySegment) {
        return;
    }

    viewpointAtmosphereIntersect.start = max(viewpointAtmosphereIntersect.start, 0.0);
    viewpointAtmosphereIntersect.stop = min(viewpointAtmosphereIntersect.stop, maxDistance);

    if (viewpointAtmosphereIntersect.start > viewpointAtmosphereIntersect.stop) {
        return;
    }

    // Prevent Mie glow on objects right in front of the camera.
    // bool allowMie = maxDistance > viewpointAtmosphereIntersect.stop;

    // Set up for sampling positions along the ray - starting from the intersection with the outer ring of the atmosphere.
    float rayStepLength = (viewpointAtmosphereIntersect.stop - viewpointAtmosphereIntersect.start) / float(PRIMARY_STEPS);
    float rayPositionLength = viewpointAtmosphereIntersect.start;

    vec3 rayleighAccumulation = vec3(0.0);
    vec3 mieAccumulation = vec3(0.0);
    vec2 opticalDepth = vec2(0.0);

    // Sample positions along the primary ray.
    for (int i = 0; i < PRIMARY_STEPS; ++i) {

        // Calculate sample position along viewpoint ray.
        vec3 samplePosition = start + direction * (rayPositionLength + rayStepLength);

        // Calculate height of sample position above ellipsoid.
        float sampleHeight = length(samplePosition) - planetRadius;

        // Calculate density of particles at the sample position.
        vec2 density = exp(-sampleHeight / HEIGHT_SCALE) * rayStepLength;

        // Add these densities to the optical depth, so that we know how many particles are on this ray.
        opticalDepth += density;

        // Generate ray from the sample position segment to the light source, up to the outer ring of the atmosphere.
        czm_ray lightRay = czm_ray(samplePosition, lightDirection);
        czm_raySegment lightAtmosphereIntersect = raySphereIntersection(lightRay, AtmosphereRadius);
        
        float lightStepLength = lightAtmosphereIntersect.stop / float(LIGHT_STEPS);
        float lightPositionLength = 0.0;

        vec2 lightOpticalDepth = vec2(0.0);


        // Sample positions along the light ray, to accumulate incidence of light on the latest sample segment.
        for (int j = 0; j < LIGHT_STEPS; ++j) {

            // Calculate sample position along light ray.
            vec3 lightPosition = samplePosition + lightDirection * (lightPositionLength + lightStepLength * 0.5);

            // Calculate height of the light sample position above ellipsoid.
            float lightHeight = length(lightPosition) - planetRadius;

            // Calculate density of photons at the light sample position.
            lightOpticalDepth += exp(-lightHeight / HEIGHT_SCALE) * lightStepLength;

            // Increment distance on light ray.
            lightPositionLength += lightStepLength;
        }

        // Compute attenuation via the primary ray and the light ray.
        vec3 attenuation = exp(-((BETA_MIE * (opticalDepth.y + lightOpticalDepth.y)) + (BETA_RAYLEIGH * (opticalDepth.x + lightOpticalDepth.x))));

        // Accumulate the scattering.
        rayleighAccumulation += density.x * attenuation;
        mieAccumulation += density.y * attenuation;

        // Increment distance on primary ray.
        rayPositionLength += rayStepLength;
    }

    // Compute final color and opacity.
    rayleighColor = BETA_RAYLEIGH * rayleighAccumulation;
    mieColor = BETA_MIE * mieAccumulation;
    opacity = length(exp(-((BETA_MIE * opticalDepth.y) + (BETA_RAYLEIGH * opticalDepth.x))));
}

vec4 computeFinalColor(vec3 positionWC, vec3 lightDirection, vec3 rayleighColor, vec3 mieColor, float opacity)
{
    vec3 cameraToPositionRay = positionWC - czm_viewerPositionWC;
    vec3 direction = normalize(cameraToPositionRay);

    float cosAngle = dot(direction, lightDirection);
    float cosAngle2 = cosAngle * cosAngle;
    float G2 = G * G;

    // The Rayleigh phase function.
    float rayleighPhase = 3.0 / (50.2654824574) * (1.0 + cosAngle2);
    // The Mie phase function.
    float miePhase = 3.0 / (25.1327412287) * ((1.0 - G2) * (cosAngle2 + 1.0)) / (pow(1.0 + G2 - 2.0 * cosAngle * G, 1.5) * (2.0 + G2));

    // The final color is generated by combining the effects of the Rayleigh and Mie scattering.
    vec3 rayleigh = rayleighPhase * rayleighColor;
    vec3 mie = miePhase * mieColor;

    return vec4((rayleigh + mie) * LIGHT_INTENSITY, 1.0 - opacity);
}

AtmosphereColor computeGroundAtmosphereFromSpace(vec3 v3Pos, bool dynamicLighting, vec3 lightDirectionWC)
{
    vec3 cameraToPositionRay = v3Pos - czm_viewerPositionWC;
    vec3 direction = normalize(cameraToPositionRay);
    vec3 lightDirection = normalize(czm_sunPositionWC);

    float dist = length(cameraToPositionRay);

    vec3 mieColor;
    vec3 rayleighColor;
    float opacity;

    computeScattering(
        czm_viewerPositionWC,
        direction,
        dist,
        lightDirection,
        rayleighColor,
        mieColor,
        opacity
    );


    AtmosphereColor color;
    color.mie = mieColor;
    color.rayleigh = rayleighColor;

    return color;
}