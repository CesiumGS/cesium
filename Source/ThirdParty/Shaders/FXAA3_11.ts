/**
 * @license
 * Copyright (c) 2014-2015, NVIDIA CORPORATION. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *  * Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 *  * Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *  * Neither the name of NVIDIA CORPORATION nor the names of its
 *    contributors may be used to endorse or promote products derived
 *    from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
//This file is automatically rebuilt by the Cesium build process.
define(function() {
    'use strict';
    return "#if (FXAA_QUALITY_PRESET == 10)\n\
#define FXAA_QUALITY_PS 3\n\
#define FXAA_QUALITY_P0 1.5\n\
#define FXAA_QUALITY_P1 3.0\n\
#define FXAA_QUALITY_P2 12.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 11)\n\
#define FXAA_QUALITY_PS 4\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 3.0\n\
#define FXAA_QUALITY_P3 12.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 12)\n\
#define FXAA_QUALITY_PS 5\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 4.0\n\
#define FXAA_QUALITY_P4 12.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 13)\n\
#define FXAA_QUALITY_PS 6\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 4.0\n\
#define FXAA_QUALITY_P5 12.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 14)\n\
#define FXAA_QUALITY_PS 7\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 2.0\n\
#define FXAA_QUALITY_P5 4.0\n\
#define FXAA_QUALITY_P6 12.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 15)\n\
#define FXAA_QUALITY_PS 8\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 2.0\n\
#define FXAA_QUALITY_P5 2.0\n\
#define FXAA_QUALITY_P6 4.0\n\
#define FXAA_QUALITY_P7 12.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 20)\n\
#define FXAA_QUALITY_PS 3\n\
#define FXAA_QUALITY_P0 1.5\n\
#define FXAA_QUALITY_P1 2.0\n\
#define FXAA_QUALITY_P2 8.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 21)\n\
#define FXAA_QUALITY_PS 4\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 8.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 22)\n\
#define FXAA_QUALITY_PS 5\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 8.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 23)\n\
#define FXAA_QUALITY_PS 6\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 2.0\n\
#define FXAA_QUALITY_P5 8.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 24)\n\
#define FXAA_QUALITY_PS 7\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 2.0\n\
#define FXAA_QUALITY_P5 3.0\n\
#define FXAA_QUALITY_P6 8.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 25)\n\
#define FXAA_QUALITY_PS 8\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 2.0\n\
#define FXAA_QUALITY_P5 2.0\n\
#define FXAA_QUALITY_P6 4.0\n\
#define FXAA_QUALITY_P7 8.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 26)\n\
#define FXAA_QUALITY_PS 9\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 2.0\n\
#define FXAA_QUALITY_P5 2.0\n\
#define FXAA_QUALITY_P6 2.0\n\
#define FXAA_QUALITY_P7 4.0\n\
#define FXAA_QUALITY_P8 8.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 27)\n\
#define FXAA_QUALITY_PS 10\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 2.0\n\
#define FXAA_QUALITY_P5 2.0\n\
#define FXAA_QUALITY_P6 2.0\n\
#define FXAA_QUALITY_P7 2.0\n\
#define FXAA_QUALITY_P8 4.0\n\
#define FXAA_QUALITY_P9 8.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 28)\n\
#define FXAA_QUALITY_PS 11\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 2.0\n\
#define FXAA_QUALITY_P5 2.0\n\
#define FXAA_QUALITY_P6 2.0\n\
#define FXAA_QUALITY_P7 2.0\n\
#define FXAA_QUALITY_P8 2.0\n\
#define FXAA_QUALITY_P9 4.0\n\
#define FXAA_QUALITY_P10 8.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 29)\n\
#define FXAA_QUALITY_PS 12\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.5\n\
#define FXAA_QUALITY_P2 2.0\n\
#define FXAA_QUALITY_P3 2.0\n\
#define FXAA_QUALITY_P4 2.0\n\
#define FXAA_QUALITY_P5 2.0\n\
#define FXAA_QUALITY_P6 2.0\n\
#define FXAA_QUALITY_P7 2.0\n\
#define FXAA_QUALITY_P8 2.0\n\
#define FXAA_QUALITY_P9 2.0\n\
#define FXAA_QUALITY_P10 4.0\n\
#define FXAA_QUALITY_P11 8.0\n\
#endif\n\
#if (FXAA_QUALITY_PRESET == 39)\n\
#define FXAA_QUALITY_PS 12\n\
#define FXAA_QUALITY_P0 1.0\n\
#define FXAA_QUALITY_P1 1.0\n\
#define FXAA_QUALITY_P2 1.0\n\
#define FXAA_QUALITY_P3 1.0\n\
#define FXAA_QUALITY_P4 1.0\n\
#define FXAA_QUALITY_P5 1.5\n\
#define FXAA_QUALITY_P6 2.0\n\
#define FXAA_QUALITY_P7 2.0\n\
#define FXAA_QUALITY_P8 2.0\n\
#define FXAA_QUALITY_P9 2.0\n\
#define FXAA_QUALITY_P10 4.0\n\
#define FXAA_QUALITY_P11 8.0\n\
#endif\n\
#define FxaaBool bool\n\
#define FxaaFloat float\n\
#define FxaaFloat2 vec2\n\
#define FxaaFloat3 vec3\n\
#define FxaaFloat4 vec4\n\
#define FxaaHalf float\n\
#define FxaaHalf2 vec2\n\
#define FxaaHalf3 vec3\n\
#define FxaaHalf4 vec4\n\
#define FxaaInt2 vec2\n\
#define FxaaTex sampler2D\n\
#define FxaaSat(x) clamp(x, 0.0, 1.0)\n\
#define FxaaTexTop(t, p) texture2D(t, p)\n\
#define FxaaTexOff(t, p, o, r) texture2D(t, p + (o * r))\n\
FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.y; }\n\
FxaaFloat4 FxaaPixelShader(\n\
FxaaFloat2 pos,\n\
FxaaTex tex,\n\
FxaaFloat2 fxaaQualityRcpFrame,\n\
FxaaFloat fxaaQualitySubpix,\n\
FxaaFloat fxaaQualityEdgeThreshold,\n\
FxaaFloat fxaaQualityEdgeThresholdMin\n\
) {\n\
FxaaFloat2 posM;\n\
posM.x = pos.x;\n\
posM.y = pos.y;\n\
FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);\n\
#define lumaM rgbyM.y\n\
FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0, 1), fxaaQualityRcpFrame.xy));\n\
FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 0), fxaaQualityRcpFrame.xy));\n\
FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0,-1), fxaaQualityRcpFrame.xy));\n\
FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 0), fxaaQualityRcpFrame.xy));\n\
FxaaFloat maxSM = max(lumaS, lumaM);\n\
FxaaFloat minSM = min(lumaS, lumaM);\n\
FxaaFloat maxESM = max(lumaE, maxSM);\n\
FxaaFloat minESM = min(lumaE, minSM);\n\
FxaaFloat maxWN = max(lumaN, lumaW);\n\
FxaaFloat minWN = min(lumaN, lumaW);\n\
FxaaFloat rangeMax = max(maxWN, maxESM);\n\
FxaaFloat rangeMin = min(minWN, minESM);\n\
FxaaFloat rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;\n\
FxaaFloat range = rangeMax - rangeMin;\n\
FxaaFloat rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);\n\
FxaaBool earlyExit = range < rangeMaxClamped;\n\
if(earlyExit)\n\
return rgbyM;\n\
FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1,-1), fxaaQualityRcpFrame.xy));\n\
FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 1), fxaaQualityRcpFrame.xy));\n\
FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1,-1), fxaaQualityRcpFrame.xy));\n\
FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));\n\
FxaaFloat lumaNS = lumaN + lumaS;\n\
FxaaFloat lumaWE = lumaW + lumaE;\n\
FxaaFloat subpixRcpRange = 1.0/range;\n\
FxaaFloat subpixNSWE = lumaNS + lumaWE;\n\
FxaaFloat edgeHorz1 = (-2.0 * lumaM) + lumaNS;\n\
FxaaFloat edgeVert1 = (-2.0 * lumaM) + lumaWE;\n\
FxaaFloat lumaNESE = lumaNE + lumaSE;\n\
FxaaFloat lumaNWNE = lumaNW + lumaNE;\n\
FxaaFloat edgeHorz2 = (-2.0 * lumaE) + lumaNESE;\n\
FxaaFloat edgeVert2 = (-2.0 * lumaN) + lumaNWNE;\n\
FxaaFloat lumaNWSW = lumaNW + lumaSW;\n\
FxaaFloat lumaSWSE = lumaSW + lumaSE;\n\
FxaaFloat edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);\n\
FxaaFloat edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);\n\
FxaaFloat edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;\n\
FxaaFloat edgeVert3 = (-2.0 * lumaS) + lumaSWSE;\n\
FxaaFloat edgeHorz = abs(edgeHorz3) + edgeHorz4;\n\
FxaaFloat edgeVert = abs(edgeVert3) + edgeVert4;\n\
FxaaFloat subpixNWSWNESE = lumaNWSW + lumaNESE;\n\
FxaaFloat lengthSign = fxaaQualityRcpFrame.x;\n\
FxaaBool horzSpan = edgeHorz >= edgeVert;\n\
FxaaFloat subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;\n\
if(!horzSpan) lumaN = lumaW;\n\
if(!horzSpan) lumaS = lumaE;\n\
if(horzSpan) lengthSign = fxaaQualityRcpFrame.y;\n\
FxaaFloat subpixB = (subpixA * (1.0/12.0)) - lumaM;\n\
FxaaFloat gradientN = lumaN - lumaM;\n\
FxaaFloat gradientS = lumaS - lumaM;\n\
FxaaFloat lumaNN = lumaN + lumaM;\n\
FxaaFloat lumaSS = lumaS + lumaM;\n\
FxaaBool pairN = abs(gradientN) >= abs(gradientS);\n\
FxaaFloat gradient = max(abs(gradientN), abs(gradientS));\n\
if(pairN) lengthSign = -lengthSign;\n\
FxaaFloat subpixC = FxaaSat(abs(subpixB) * subpixRcpRange);\n\
FxaaFloat2 posB;\n\
posB.x = posM.x;\n\
posB.y = posM.y;\n\
FxaaFloat2 offNP;\n\
offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;\n\
offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;\n\
if(!horzSpan) posB.x += lengthSign * 0.5;\n\
if( horzSpan) posB.y += lengthSign * 0.5;\n\
FxaaFloat2 posN;\n\
posN.x = posB.x - offNP.x * FXAA_QUALITY_P0;\n\
posN.y = posB.y - offNP.y * FXAA_QUALITY_P0;\n\
FxaaFloat2 posP;\n\
posP.x = posB.x + offNP.x * FXAA_QUALITY_P0;\n\
posP.y = posB.y + offNP.y * FXAA_QUALITY_P0;\n\
FxaaFloat subpixD = ((-2.0)*subpixC) + 3.0;\n\
FxaaFloat lumaEndN = FxaaLuma(FxaaTexTop(tex, posN));\n\
FxaaFloat subpixE = subpixC * subpixC;\n\
FxaaFloat lumaEndP = FxaaLuma(FxaaTexTop(tex, posP));\n\
if(!pairN) lumaNN = lumaSS;\n\
FxaaFloat gradientScaled = gradient * 1.0/4.0;\n\
FxaaFloat lumaMM = lumaM - lumaNN * 0.5;\n\
FxaaFloat subpixF = subpixD * subpixE;\n\
FxaaBool lumaMLTZero = lumaMM < 0.0;\n\
lumaEndN -= lumaNN * 0.5;\n\
lumaEndP -= lumaNN * 0.5;\n\
FxaaBool doneN = abs(lumaEndN) >= gradientScaled;\n\
FxaaBool doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P1;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P1;\n\
FxaaBool doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P1;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P1;\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P2;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P2;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P2;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P2;\n\
#if (FXAA_QUALITY_PS > 3)\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P3;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P3;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P3;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P3;\n\
#if (FXAA_QUALITY_PS > 4)\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P4;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P4;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P4;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P4;\n\
#if (FXAA_QUALITY_PS > 5)\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P5;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P5;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P5;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P5;\n\
#if (FXAA_QUALITY_PS > 6)\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P6;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P6;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P6;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P6;\n\
#if (FXAA_QUALITY_PS > 7)\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P7;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P7;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P7;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P7;\n\
#if (FXAA_QUALITY_PS > 8)\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P8;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P8;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P8;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P8;\n\
#if (FXAA_QUALITY_PS > 9)\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P9;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P9;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P9;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P9;\n\
#if (FXAA_QUALITY_PS > 10)\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P10;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P10;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P10;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P10;\n\
#if (FXAA_QUALITY_PS > 11)\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P11;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P11;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P11;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P11;\n\
#if (FXAA_QUALITY_PS > 12)\n\
if(doneNP) {\n\
if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));\n\
if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));\n\
if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;\n\
if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;\n\
doneN = abs(lumaEndN) >= gradientScaled;\n\
doneP = abs(lumaEndP) >= gradientScaled;\n\
if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P12;\n\
if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P12;\n\
doneNP = (!doneN) || (!doneP);\n\
if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P12;\n\
if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P12;\n\
}\n\
#endif\n\
}\n\
#endif\n\
}\n\
#endif\n\
}\n\
#endif\n\
}\n\
#endif\n\
}\n\
#endif\n\
}\n\
#endif\n\
}\n\
#endif\n\
}\n\
#endif\n\
}\n\
#endif\n\
}\n\
FxaaFloat dstN = posM.x - posN.x;\n\
FxaaFloat dstP = posP.x - posM.x;\n\
if(!horzSpan) dstN = posM.y - posN.y;\n\
if(!horzSpan) dstP = posP.y - posM.y;\n\
FxaaBool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;\n\
FxaaFloat spanLength = (dstP + dstN);\n\
FxaaBool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;\n\
FxaaFloat spanLengthRcp = 1.0/spanLength;\n\
FxaaBool directionN = dstN < dstP;\n\
FxaaFloat dst = min(dstN, dstP);\n\
FxaaBool goodSpan = directionN ? goodSpanN : goodSpanP;\n\
FxaaFloat subpixG = subpixF * subpixF;\n\
FxaaFloat pixelOffset = (dst * (-spanLengthRcp)) + 0.5;\n\
FxaaFloat subpixH = subpixG * fxaaQualitySubpix;\n\
FxaaFloat pixelOffsetGood = goodSpan ? pixelOffset : 0.0;\n\
FxaaFloat pixelOffsetSubpix = max(pixelOffsetGood, subpixH);\n\
if(!horzSpan) posM.x += pixelOffsetSubpix * lengthSign;\n\
if( horzSpan) posM.y += pixelOffsetSubpix * lengthSign;\n\
return FxaaFloat4(FxaaTexTop(tex, posM).xyz, lumaM);\n\
}\n\
";
});