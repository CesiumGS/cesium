/**
 * @license
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

 // Code:  http://sponeil.net/
 // GPU Gems 2 Article:  https://developer.nvidia.com/gpugems/GPUGems2/gpugems2_chapter16.html

attribute vec4 position;

uniform vec4 u_cameraAndRadiiAndDynamicAtmosphereColor; // Camera height, outer radius, inner radius, dynamic atmosphere color flag

const float Kr = 0.0025;
const float Kr4PI = Kr * 4.0 * czm_pi;
const float Km = 0.0015;
const float Km4PI = Km * 4.0 * czm_pi;
const float ESun = 15.0;
const float KmESun = Km * ESun;
const float KrESun = Kr * ESun;
const vec3 InvWavelength = vec3(
    5.60204474633241,  // Red = 1.0 / Math.pow(0.650, 4.0)
    9.473284437923038, // Green = 1.0 / Math.pow(0.570, 4.0)
    19.643802610477206); // Blue = 1.0 / Math.pow(0.475, 4.0)
const float rayleighScaleDepth = 0.25;

const int nSamples = 2;
const float fSamples = 2.0;

varying vec3 v_rayleighColor;
varying vec3 v_mieColor;
varying vec3 v_toCamera;

float scale(float cosAngle)
{
    float x = 1.0 - cosAngle;
    return rayleighScaleDepth  * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));
}

void main(void)
{
    // Unpack attributes
    float cameraHeight = u_cameraAndRadiiAndDynamicAtmosphereColor.x;
    float outerRadius = u_cameraAndRadiiAndDynamicAtmosphereColor.y;
    float innerRadius = u_cameraAndRadiiAndDynamicAtmosphereColor.z;

    // Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)
    vec3 positionV3 = position.xyz;
    vec3 ray = positionV3 - czm_viewerPositionWC;
    float far = length(ray);
    ray /= far;
    float atmosphereScale = 1.0 / (outerRadius - innerRadius);

#ifdef SKY_FROM_SPACE
    // Calculate the closest intersection of the ray with the outer atmosphere (which is the near point of the ray passing through the atmosphere)
    float B = 2.0 * dot(czm_viewerPositionWC, ray);
    float C = cameraHeight * cameraHeight - outerRadius * outerRadius;
    float det = max(0.0, B*B - 4.0 * C);
    float near = 0.5 * (-B - sqrt(det));

    // Calculate the ray's starting position, then calculate its scattering offset
    vec3 start = czm_viewerPositionWC + ray * near;
    far -= near;
    float startAngle = dot(ray, start) / outerRadius;
    float startDepth = exp(-1.0 / rayleighScaleDepth );
    float startOffset = startDepth*scale(startAngle);
#else // SKY_FROM_ATMOSPHERE
    // Calculate the ray's starting position, then calculate its scattering offset
    vec3 start = czm_viewerPositionWC;
    float height = length(start);
    float depth = exp((atmosphereScale / rayleighScaleDepth ) * (innerRadius - cameraHeight));
    float startAngle = dot(ray, start) / height;
    float startOffset = depth*scale(startAngle);
#endif

    // Initialize the scattering loop variables
    float sampleLength = far / fSamples;
    float scaledLength = sampleLength * atmosphereScale;
    vec3 sampleRay = ray * sampleLength;
    vec3 samplePoint = start + sampleRay * 0.5;

    // Now loop through the sample rays
    vec3 frontColor = vec3(0.0, 0.0, 0.0);
    vec3 lightDir = (u_cameraAndRadiiAndDynamicAtmosphereColor.w > 0.0) ? czm_sunPositionWC - czm_viewerPositionWC : czm_viewerPositionWC;
    lightDir = normalize(lightDir);

    for(int i=0; i<nSamples; i++)
    {
        float height = length(samplePoint);
        float depth = exp((atmosphereScale / rayleighScaleDepth ) * (innerRadius - height));
        float fLightAngle = dot(lightDir, samplePoint) / height;
        float fCameraAngle = dot(ray, samplePoint) / height;
        float fScatter = (startOffset + depth*(scale(fLightAngle) - scale(fCameraAngle)));
        vec3 attenuate = exp(-fScatter * (InvWavelength * Kr4PI + Km4PI));
        frontColor += attenuate * (depth * scaledLength);
        samplePoint += sampleRay;
    }

    // Finally, scale the Mie and Rayleigh colors and set up the varying variables for the pixel shader
    v_mieColor = frontColor * KmESun;
    v_rayleighColor = frontColor * (InvWavelength * KrESun);
    v_toCamera = czm_viewerPositionWC - positionV3;
    gl_Position = czm_modelViewProjection * position;
}
