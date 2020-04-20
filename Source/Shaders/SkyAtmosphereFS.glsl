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
 * Modifications made by Cesium GS, Inc.
 */

 // Code:  http://sponeil.net/
 // GPU Gems 2 Article:  https://developer.nvidia.com/gpugems/GPUGems2/gpugems2_chapter16.html

varying vec3 v_outerPositionWC;

#ifndef GLOBE_TRANSLUCENT
varying vec3 v_rayleighColor;
varying vec3 v_mieColor;
#endif

void main (void)
{
#ifdef GLOBE_TRANSLUCENT
    vec3 outerPositionWC = v_outerPositionWC;
    vec3 directionWC = normalize(outerPositionWC - czm_viewerPositionWC);
    vec3 directionEC = czm_viewRotation * directionWC;
    czm_ray viewRay = czm_ray(vec3(0.0), directionEC);
    czm_raySegment raySegment = czm_rayEllipsoidIntersectionInterval(viewRay, vec3(czm_view[3]), czm_ellipsoidInverseRadii);
    bool intersectsEllipsoid = raySegment.start >= 0.0;

    vec3 startPositionWC = czm_viewerPositionWC;
    if (intersectsEllipsoid)
    {
        startPositionWC = czm_viewerPositionWC + raySegment.stop * directionWC;
    }

    vec3 toCamera = startPositionWC - outerPositionWC;
    vec3 lightDirection = getLightDirection(startPositionWC);

    vec3 mieColor;
    vec3 rayleighColor;

    calculateMieColorAndRayleighColor(
        startPositionWC,
        outerPositionWC,
        lightDirection,
        intersectsEllipsoid,
        mieColor,
        rayleighColor
    );

    gl_FragColor = calculateFinalColor(startPositionWC, toCamera, lightDirection, rayleighColor, mieColor);
#else
    vec3 toCamera = czm_viewerPositionWC - v_outerPositionWC;
    vec3 lightDirection = getLightDirection(czm_viewerPositionWC);
    gl_FragColor = calculateFinalColor(czm_viewerPositionWC, toCamera, lightDirection, v_rayleighColor, v_mieColor);
#endif
}
