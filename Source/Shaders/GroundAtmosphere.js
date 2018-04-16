//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "/*!\n\
 * Atmosphere code:\n\
 *\n\
 * Copyright (c) 2000-2005, Sean O'Neil (s_p_oneil@hotmail.com)\n\
 * All rights reserved.\n\
 * \n\
 * Redistribution and use in source and binary forms, with or without\n\
 * modification, are permitted provided that the following conditions\n\
 * are met:\n\
 * \n\
 * * Redistributions of source code must retain the above copyright notice,\n\
 *   this list of conditions and the following disclaimer.\n\
 * * Redistributions in binary form must reproduce the above copyright notice,\n\
 *   this list of conditions and the following disclaimer in the documentation\n\
 *   and/or other materials provided with the distribution.\n\
 * * Neither the name of the project nor the names of its contributors may be\n\
 *   used to endorse or promote products derived from this software without\n\
 *   specific prior written permission.\n\
 * \n\
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS \"AS IS\"\n\
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE\n\
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n\
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE\n\
 * FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL\n\
 * DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR\n\
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER\n\
 * CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,\n\
 * OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE\n\
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n\
 *\n\
 * Modifications made by Analytical Graphics, Inc.\n\
 */\n\
 \n\
 // Atmosphere:\n\
 //   Code:  http://sponeil.net/\n\
 //   GPU Gems 2 Article:  http://http.developer.nvidia.com/GPUGems2/gpugems2_chapter16.html\n\
\n\
const float fInnerRadius = 6378137.0;\n\
const float fOuterRadius = 6378137.0 * 1.025;\n\
const float fOuterRadius2 = fOuterRadius * fOuterRadius;\n\
\n\
const float Kr = 0.0025;\n\
const float Km = 0.0015;\n\
const float ESun = 15.0;\n\
\n\
const float fKrESun = Kr * ESun;\n\
const float fKmESun = Km * ESun;\n\
const float fKr4PI = Kr * 4.0 * czm_pi;\n\
const float fKm4PI = Km * 4.0 * czm_pi;\n\
\n\
const float fScale = 1.0 / (fOuterRadius - fInnerRadius);\n\
const float fScaleDepth = 0.25;\n\
const float fScaleOverScaleDepth = fScale / fScaleDepth;\n\
\n\
struct AtmosphereColor\n\
{\n\
    vec3 mie;\n\
    vec3 rayleigh;\n\
};\n\
\n\
const int nSamples = 2;\n\
const float fSamples = 2.0;\n\
\n\
float scale(float fCos)\n\
{\n\
    float x = 1.0 - fCos;\n\
    return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));\n\
}\n\
\n\
AtmosphereColor computeGroundAtmosphereFromSpace(vec3 v3Pos)\n\
{\n\
	vec3 v3InvWavelength = vec3(1.0 / pow(0.650, 4.0), 1.0 / pow(0.570, 4.0), 1.0 / pow(0.475, 4.0));\n\
\n\
    // Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)\n\
    vec3 v3Ray = v3Pos - czm_viewerPositionWC;\n\
    float fFar = length(v3Ray);\n\
    v3Ray /= fFar;\n\
    \n\
    float fCameraHeight = length(czm_viewerPositionWC);\n\
    float fCameraHeight2 = fCameraHeight * fCameraHeight;\n\
\n\
    // This next line is an ANGLE workaround. It is equivalent to B = 2.0 * dot(czm_viewerPositionWC, v3Ray), \n\
    // which is what it should be, but there are problems at the poles.\n\
    float B = 2.0 * length(czm_viewerPositionWC) * dot(normalize(czm_viewerPositionWC), v3Ray);\n\
    float C = fCameraHeight2 - fOuterRadius2;\n\
    float fDet = max(0.0, B*B - 4.0 * C);\n\
    float fNear = 0.5 * (-B - sqrt(fDet));\n\
\n\
    // Calculate the ray's starting position, then calculate its scattering offset\n\
    vec3 v3Start = czm_viewerPositionWC + v3Ray * fNear;\n\
    fFar -= fNear;\n\
    float fDepth = exp((fInnerRadius - fOuterRadius) / fScaleDepth);\n\
    \n\
    // The light angle based on the sun position would be:\n\
    //    dot(czm_sunDirectionWC, v3Pos) / length(v3Pos);\n\
    // We want the atmosphere to be uniform over the globe so it is set to 1.0.\n\
    float fLightAngle = 1.0;\n\
    float fCameraAngle = dot(-v3Ray, v3Pos) / length(v3Pos);\n\
    float fCameraScale = scale(fCameraAngle);\n\
    float fLightScale = scale(fLightAngle);\n\
    float fCameraOffset = fDepth*fCameraScale;\n\
    float fTemp = (fLightScale + fCameraScale);\n\
\n\
    // Initialize the scattering loop variables\n\
    float fSampleLength = fFar / fSamples;\n\
    float fScaledLength = fSampleLength * fScale;\n\
    vec3 v3SampleRay = v3Ray * fSampleLength;\n\
    vec3 v3SamplePoint = v3Start + v3SampleRay * 0.5;\n\
\n\
    // Now loop through the sample rays\n\
    vec3 v3FrontColor = vec3(0.0);\n\
    vec3 v3Attenuate = vec3(0.0);\n\
    for(int i=0; i<nSamples; i++)\n\
    {\n\
        float fHeight = length(v3SamplePoint);\n\
        float fDepth = exp(fScaleOverScaleDepth * (fInnerRadius - fHeight));\n\
        float fScatter = fDepth*fTemp - fCameraOffset;\n\
        v3Attenuate = exp(-fScatter * (v3InvWavelength * fKr4PI + fKm4PI));\n\
        v3FrontColor += v3Attenuate * (fDepth * fScaledLength);\n\
        v3SamplePoint += v3SampleRay;\n\
    }\n\
    \n\
    AtmosphereColor color;\n\
    color.mie = v3FrontColor * (v3InvWavelength * fKrESun + fKmESun);\n\
    color.rayleigh = v3Attenuate; // Calculate the attenuation factor for the ground\n\
    \n\
    return color;\n\
}\n\
\n\
";
});