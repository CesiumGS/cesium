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
 //   GPU Gems 2 Article:  http://http.developer.nvidia.com/GPUGems2/gpugems2_chapter16.html

attribute vec3 position3D;
attribute vec2 textureCoordinates;
attribute vec2 position2D;

uniform float u_morphTime;
uniform int u_mode;

uniform vec3 v3InvWavelength;   // 1 / pow(wavelength, 4) for the red, green, and blue channels
uniform float fCameraHeight;    // The camera's current height
uniform float fCameraHeight2;   // fCameraHeight^2
uniform float fOuterRadius;     // The outer (atmosphere) radius
uniform float fOuterRadius2;    // fOuterRadius^2
uniform float fInnerRadius;     // The inner (planetary) radius
uniform float fInnerRadius2;    // fInnerRadius^2
uniform float fKrESun;          // Kr * ESun
uniform float fKmESun;          // Km * ESun
uniform float fKr4PI;           // Kr * 4 * PI
uniform float fKm4PI;           // Km * 4 * PI
uniform float fScale;           // 1 / (fOuterRadius - fInnerRadius)
uniform float fScaleDepth;      // The scale depth (i.e. the altitude at which the atmosphere's average density is found)
uniform float fScaleOverScaleDepth; // fScale / fScaleDepth
uniform float fMinGroundFromAtmosphereHeight;
uniform float fstartFadeGroundFromAtmosphere;

uniform vec3 u_center3D;
uniform vec2 u_center2D;
uniform mat4 u_modifiedModelView;

varying vec3 v_positionMC;
varying vec3 v_positionEC;

varying vec3 v_rayleighColor;
varying vec3 v_mieColor;

varying vec2 v_textureCoordinates;

struct AtmosphereColor
{
    vec3 mie;
    vec3 rayleigh;
};

#ifdef SHOW_GROUND_ATMOSPHERE

const int nSamples = 2;
const float fSamples = 2.0;

float scale(float fCos)
{
    float x = 1.0 - fCos;
    return fScaleDepth * exp(-0.00287 + x*(0.459 + x*(3.83 + x*(-6.80 + x*5.25))));
}

AtmosphereColor computeGroundAtmosphereFromSpace(vec3 v3Pos)
{
    // Get the ray from the camera to the vertex and its length (which is the far point of the ray passing through the atmosphere)
    vec3 v3Ray = v3Pos - agi_viewerPositionWC;
    float fFar = length(v3Ray);
    v3Ray /= fFar;

#ifdef SHOW_GROUND_ATMOSPHERE_FROM_SPACE
    // Calculate the closest intersection of the ray with the outer atmosphere (which is the near point of the ray passing through the atmosphere)
    float B = 2.0 * dot(agi_viewerPositionWC, v3Ray);
    float C = fCameraHeight2 - fOuterRadius2;
    float fDet = max(0.0, B*B - 4.0 * C);
    float fNear = 0.5 * (-B - sqrt(fDet));

    // Calculate the ray's starting position, then calculate its scattering offset
    vec3 v3Start = agi_viewerPositionWC + v3Ray * fNear;
    fFar -= fNear;
    float fDepth = exp((fInnerRadius - fOuterRadius) / fScaleDepth);
#else // SHOW_GROUND_ATMOSPHERE_FROM_ATMOSPHERE
    // Calculate the ray's starting position, then calculate its scattering offset
    vec3 v3Start = agi_viewerPositionWC;
    float fDepth = exp((fInnerRadius - fCameraHeight) / fScaleDepth);
#endif    
    float fCameraAngle = dot(-v3Ray, v3Pos) / length(v3Pos);
    float fLightAngle = dot(agi_sunDirectionWC, v3Pos) / length(v3Pos);
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
    
    vec3 mie = v3FrontColor * (v3InvWavelength * fKrESun + fKmESun);
    // Calculate the attenuation factor for the ground
    vec3 rayleigh = v3Attenuate;
    
    float fade = clamp((fCameraHeight - fMinGroundFromAtmosphereHeight) / fstartFadeGroundFromAtmosphere, 0.0, 1.0);
    AtmosphereColor color;
    color.mie = mix(vec3(0.0), mie,fade);
    color.rayleigh = rayleigh;
    
    return color;
}

#else

AtmosphereColor computeGroundAtmosphereFromSpace(vec3 v3Pos)
{
    AtmosphereColor color;
    color.mie = vec3(0.0);
    color.rayleigh = vec3(1.0);
    
    return color;
}

#endif

void main() 
{
    vec3 position3DWC = position3D + u_center3D;
    if (u_mode == 0) {
        v_positionEC = (u_modifiedModelView * vec4(position3D, 1.0)).xyz;  // position in eye coordinates
        gl_Position = agi_projection * (u_modifiedModelView * vec4(position3D, 1.0));
    }
    else if (u_mode == 1) {
        v_positionEC = (agi_modelView * vec4(position3DWC, 1.0)).xyz;  // position in eye coordinates
        gl_Position = agi_projection * (u_modifiedModelView * vec4(0.0, position2D.x, position2D.y, 1.0));
    }
    else {
        vec3 position2DWC = vec3(0.0, position2D.x + u_center2D.x, position2D.y + u_center2D.y);
        v_positionEC = (agi_modelView * vec4(position3DWC, 1.0)).xyz;  // position in eye coordinates
        vec4 position = agi_columbusViewMorph(position2DWC, position3DWC, u_morphTime);
        gl_Position = agi_modelViewProjection * position;
    }
    
    AtmosphereColor atmosphereColor = computeGroundAtmosphereFromSpace(position3DWC);

    v_positionMC = position3DWC;                                 // position in model coordinates
    v_mieColor = atmosphereColor.mie;
    v_rayleighColor = atmosphereColor.rayleigh;
    v_textureCoordinates = textureCoordinates;
}

