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
#ifdef SHOW_TERMINATOR
    #ifdef GL_OES_standard_derivatives
        #extension GL_OES_standard_derivatives : enable
    #endif    
#endif

// This #ifdef is required due to a bug in Mac OS X 10.6.  It doesn't realize that
// the uniform is unused when SHOW_NIGHT is not defined, and so it doesn't get
// optimized out.
#ifdef SHOW_NIGHT
uniform sampler2D u_nightTexture;
#endif

uniform sampler2D u_specularMap;
uniform sampler2D u_cloudMap;
uniform sampler2D u_bumpMap;

uniform float u_dayNightBlendDelta; // 0.0 - sharp transition between day and night.  > 0.0 - smooth, linearly blended transition.
uniform vec2 u_bumpMapResoltuion;   // (1.0 / width, 1.0 / height)
uniform float u_bumpMapNormalZ;     // 1.0 - correctly (approximate) perturbed.  > 1.0 - less perturbed.  < 1.0 - more perturbed.

uniform float u_nightIntensity;    // 1.0 - same intensity as night texture.  < 1.0 - darker.  > 1.0 - brighter.

uniform float u_dayIntensity;

// This shader is similar to the one in Chapter 10 of the OpenGL Shading Language
// and the one described here:
//
//   http://web.engr.oregonstate.edu/~mjb/WebMjb/Papers/globalworlds.pdf
//
// For more inspiration, check out Eve Online's planets:
//
//   http://www.eveonline.com/devblog.asp?a=blog&bid=724
//
// Also, check out:
//
//   http://www.nicholaswoodfield.com/showcase/planetshader.html
//
// Shading includes:
//    * The side of the globe illuminated by the sun is shaded with a day texture.
//    * The day texture blends to a night texture on the dark side of the globe.
//
// * Day
//    * A specular map is used so only water has specular light.
//    * A bump map perturbs the normal used for diffuse shading.
//    * Clouds are shaded with diffuse light and cast approximate shadows.
//
// * Night
//    * Clouds occlude (sometimes partially) the city lights.
//
// A cloud cover of zero indicates no cloud; a cover of one indicates a cloud.
//
// This shader could be optimized.  Fewer textures could be used by storing the
// specular map, cloud cover, and bump map in extra channels of other textures.  
// Also, it may be possible to increase the number of independent instructions after 
// some texture reads and eliminate some computations based on bump map
// and cloud map texture reads, e.g., no bump mapping if in ocean or if land 
// is completely covered by clouds.  The bump map could also be replaced with 
// a normal map, and some work could be moved to the vertex shader.
//
// If the compiler doesn't already do so, we can also:
// * Remove duplicate texture reads when cloud and clouds shadows are enabled.
// * Removed duplicate east-north-up-to-eye-coordinates call when bump mapping
//   and cloud shadows are enabled.

bool isCloud(float cloudCover)
{
    return cloudCover > 0.7;
}

vec3 dayColor(vec3 positionMC, vec3 positionEC, vec3 normalEC, vec3 startColor, vec2 txCoord, float cloudCover)
{
    // TODO: where does this come from?
#ifdef SHOW_GROUND_ATMOSPHERE
    // When the atmosphere is shown, the diffuse component should be low
    vec4 diffuseSpecularAmbientShininess = vec4(0.35, 0.5, u_dayIntensity, 10.0);
#else
    vec4 diffuseSpecularAmbientShininess = vec4(0.75, 0.5, u_dayIntensity, 10.0);
#endif
    
#ifdef SHOW_SPECULAR    
    float specularWeight = texture2D(u_specularMap, txCoord).r;
#else
    float specularWeight = 1.0;     // Specular everywhere, no specular map.
#endif
    
    float intensity = diffuseSpecularAmbientShininess.z;    // Start with ambient, then accumulate diffuse and specular
    float diffuse = max(dot(czm_sunDirectionEC, normalEC), 0.0);
    
#ifdef SHOW_BUMPS   
    // Diffuse shading with bump mapping
    float center = texture2D(u_bumpMap, txCoord).r;
    float right = texture2D(u_bumpMap, txCoord + vec2(u_bumpMapResoltuion.x, 0.0)).r;
    float top = texture2D(u_bumpMap, txCoord + vec2(0.0, u_bumpMapResoltuion.y)).r;

    vec3 perturbedNormalTC = normalize(vec3(center - right, center - top, u_bumpMapNormalZ));               // perturbed surface normal in tangent coordinates
    vec3 perturbedNormalEC = czm_eastNorthUpToEyeCoordinates(positionMC, normalEC) * perturbedNormalTC;   // perturbed surface normal in eye coordinates
    perturbedNormalEC = normalize(perturbedNormalEC);
    float perturbedDiffuse = max(dot(czm_sunDirectionEC, perturbedNormalEC), 0.0);
#else
    float perturbedDiffuse = diffuse;
#endif

    intensity += (diffuseSpecularAmbientShininess.x * perturbedDiffuse);
            
    if (specularWeight != 0.0)
    {
        // Water has specular highlight
        vec3 positionToEyeEC = normalize(-positionEC);   // normalized position-to-eye vector in eye coordinates
        vec3 toReflectedLight = reflect(-czm_sunDirectionEC, normalEC);
    
        // Extra normalize added for Android
        float specular = max(dot(toReflectedLight, normalize(positionToEyeEC)), 0.0);
        specular = pow(specular, diffuseSpecularAmbientShininess.w);
        specular *= specularWeight;
        
        intensity += (diffuseSpecularAmbientShininess.y * specular);
    }

    //vec3 earthColor = czm_multiplyWithColorBalance(vec3(intensity), startColor);
    vec3 earthColor = vec3(intensity) * startColor;
    vec3 cloudColor = vec3(cloudCover * diffuse);
    vec3 earthUnderCloudColor = mix(earthColor, cloudColor, cloudCover);
    
#ifdef SHOW_CLOUD_SHADOWS
    // Darken if fragment is in shadow - cast a ray from the fragment to the sun 
    // and see what cloud cover is intersected.
    if (diffuse > 0.0)                                       // Fragment is on daylight side of globe
    {
        if (!isCloud(texture2D(u_cloudMap, txCoord).r))      // Fragment is not directly under a cloud
        {
            mat3 eyeToEastNorthUp = czm_transpose(czm_eastNorthUpToEyeCoordinates(positionMC, normalEC));
            vec3 positionToSunTC = eyeToEastNorthUp * czm_sunDirectionEC;                                         // normalized position-to-sun vector in tangent coordinates

            // The 0.005 term below is a fudge factor that gives the shadows some size.  It will 
            // probably be user-defined in the future, along with isCloud(), and the hard-coded 
            // shadow color below.
            float scale = (1.0 - positionToSunTC.z) * 0.005;
            float shadowCloudCover = texture2D(u_cloudMap, txCoord + (scale * positionToSunTC.xy)).r;
            float cloudBehind = texture2D(u_cloudMap, txCoord - (scale * positionToSunTC.xy)).r;
            float viewDistance = length(positionEC) * 10.0E-8;
            viewDistance = min(1.0, viewDistance);
            
            // Check to see if the fragment should be in shadow. If so, color it depending upon the view 
            // distance. Shadows viewed from farther away will be darker, while those viewed closer will
            // be lighter and more transparent. 
            if (isCloud(shadowCloudCover))
            {   
                //Fragment is part of an interior shadow within a cloud, so shade it slightly lighter
                if(isCloud(cloudBehind))
                {
                    return mix(earthUnderCloudColor, vec3(0.1), shadowCloudCover * viewDistance);
                }
                return mix(earthUnderCloudColor, vec3(0.1), viewDistance);
            }
            else                //If the fragment is on the cusp of a shadow, shade it slightly lighter.
            {
                scale = scale * 1.25;
                shadowCloudCover = texture2D(u_cloudMap, txCoord + (scale * positionToSunTC.xy)).r;
                if(isCloud(shadowCloudCover))
                {
                    return mix(earthUnderCloudColor, vec3(0.1), shadowCloudCover * viewDistance);
                }
            }
        }
    }
#endif
  
    return earthUnderCloudColor;
}

vec3 nightColor(vec2 txCoord, float cloudCover)
{
#ifdef SHOW_NIGHT
    return u_nightIntensity * texture2D(u_nightTexture, txCoord).rgb * (1.0 - cloudCover);
#else
    return vec3(0.0);
#endif
}

vec3 getCentralBodyColor(vec3 positionMC, vec3 positionEC, vec3 normalMC, vec3 normalEC, vec3 startDayColor, vec3 rayleighColor, vec3 mieColor) {
    float diffuse = dot(czm_sunDirectionEC, normalEC);
    
#ifdef SHOW_TERMINATOR
    // TODO:  Custom color and line width
    float absDiffuse = abs(diffuse);
    #ifdef GL_OES_standard_derivatives
        if ((absDiffuse < abs(dFdx(diffuse)) * 1.0) || 
            (absDiffuse < abs(dFdy(diffuse)) * 1.0))
        {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            return;
        }
    #else
        if (absDiffuse < 0.005)
        {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
            return;
        }
    #endif
#endif
    
    vec2 txCoord = czm_ellipsoidWgs84TextureCoordinates(normalMC);

#ifdef SHOW_CLOUDS
    float cloudCover = texture2D(u_cloudMap, txCoord).r;
#else
    float cloudCover = 0.0;     // No clouds
#endif

    vec3 rgb = dayColor(positionMC, positionEC, normalEC, startDayColor, txCoord, cloudCover);
    
#ifdef SHOW_GROUND_ATMOSPHERE
    const float fExposure = 2.0;
    vec3 color = mieColor + rgb * rayleighColor;
    rgb = vec3(1.0) - exp(-fExposure * color);
#endif

    if (diffuse < -u_dayNightBlendDelta)
    {
        // Night time
        rgb = nightColor(txCoord, cloudCover);
    }
    else if (diffuse <= u_dayNightBlendDelta)
    {
        // Dusk/dawn
        rgb = mix(
            nightColor(txCoord, cloudCover), 
            rgb,
            (diffuse + u_dayNightBlendDelta) / (2.0 * u_dayNightBlendDelta));
    }
    
    return rgb;
}
