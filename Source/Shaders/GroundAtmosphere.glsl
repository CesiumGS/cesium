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

const float fInnerRadius = 6378137.0;
const float fOuterRadius = 6378137.0 * 1.025;
const float fOuterRadius2 = fOuterRadius * fOuterRadius;

const float Kr = 0.0025;
const float Km = 0.0015;
const float ESun = 15.0;

const float fKrESun = Kr * ESun;
const float fKmESun = Km * ESun;
const float fKr4PI = Kr * 4.0 * czm_pi;
const float fKm4PI = Km * 4.0 * czm_pi;

const float fScale = 1.0 / (fOuterRadius - fInnerRadius);
const float fScaleDepth = 0.25;
const float fScaleOverScaleDepth = fScale / fScaleDepth;

struct AtmosphereColor
{
    vec3 mie;
    vec3 rayleigh;
};

const int nSamples = 2;
const float fSamples = 2.0;

float scale(float fCos)
{
    float x = 1.0 - fCos;
    return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));
}

AtmosphereColor computeGroundAtmosphereFromSpace(vec3 v3Pos, bool useSunLighting)
{
	vec3 v3InvWavelength = vec3(1.0 / pow(0.650, 4.0), 1.0 / pow(0.570, 4.0), 1.0 / pow(0.475, 4.0));

    // Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)
    vec3 v3Ray = v3Pos - czm_viewerPositionWC;
    float fFar = length(v3Ray);
    v3Ray /= fFar;

    float fCameraHeight = length(czm_viewerPositionWC);
    float fCameraHeight2 = fCameraHeight * fCameraHeight;

    // This next line is an ANGLE workaround. It is equivalent to B = 2.0 * dot(czm_viewerPositionWC, v3Ray),
    // which is what it should be, but there are problems at the poles.
    float B = 2.0 * length(czm_viewerPositionWC) * dot(normalize(czm_viewerPositionWC), v3Ray);
    float C = fCameraHeight2 - fOuterRadius2;
    float fDet = max(0.0, B*B - 4.0 * C);
    float fNear = 0.5 * (-B - sqrt(fDet));

    // Calculate the ray's starting position, then calculate its scattering offset
    vec3 v3Start = czm_viewerPositionWC + v3Ray * fNear;
    fFar -= fNear;
    float fDepth = exp((fInnerRadius - fOuterRadius) / fScaleDepth);

    // The light angle based on the sun position would be:
    //    dot(czm_sunDirectionWC, v3Pos) / length(v3Pos);
    // When we want the atmosphere to be uniform over the globe so it is set to 1.0.

    float fLightAngle = czm_branchFreeTernary(useSunLighting, dot(czm_sunDirectionWC, v3Pos) / length(v3Pos), 1.0);
    float fCameraAngle = dot(-v3Ray, v3Pos) / length(v3Pos);
    float fCameraScale = scale(fCameraAngle);
    float fLightScale = scale(fLightAngle);
    float fCameraOffset = fDepth*fCameraScale;
    float fTemp = (fLightScale + fCameraScale);

    // Initialize the scattering loop variables
    float fSampleLength = fFar / fSamples;
    float fScaledLength = fSampleLength * fScale;
    vec3 v3SampleRay = v3Ray * fSampleLength;
    vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;

    // Now loop through the sample rays
    vec3 v3FrontColor = vec3(0.0);
    vec3 v3Attenuate = vec3(0.0);
    for(int i=0; i<nSamples; i++)
    {
        float fHeight = length(v3SamplePoint);
        float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));
        float fScatter = fDepth*fTemp - fCameraOffset;
        v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));
        v3FrontColor += v3Attenuate * (fDepth * fScaledLength);
        v3SamplePoint += v3SampleRay;
    }

    AtmosphereColor color;
    color.mie = v3FrontColor * (v3InvWavelength * fKrESun + fKmESun);
    color.rayleigh = v3Attenuate; // Calculate the attenuation factor for the ground

    return color;
}

