/*global define*/
define([
        '../Core/BoundingRectangle',
        '../Core/Color',
        '../Core/defined',
        '../Core/PixelFormat',
        '../Renderer/Framebuffer',
        '../Renderer/Pass',
        '../Renderer/PixelDatatype',
        '../Renderer/RenderState',
        '../Renderer/Sampler',
        '../Renderer/Texture',
        '../Renderer/TextureMagnificationFilter',
        '../Renderer/TextureMinificationFilter',
        '../Renderer/TextureWrap'
    ], function(
        BoundingRectangle,
        Color,
        defined,
        PixelFormat,
        Framebuffer,
        Pass,
        PixelDatatype,
        RenderState,
        Sampler,
        Texture,
        TextureMagnificationFilter,
        TextureMinificationFilter,
        TextureWrap) {
    'use strict';

    function BrdfLutProcessor() {
        this._framebuffer = undefined;
        this._colorTexture = undefined;
        this._drawCommand = undefined;
        this._executed = false;
    }

    function createCommand(processor, context) {
        var framebuffer = processor._framebuffer;

        var fragmentShader =
            '#version 300 es\n' +
            'precision mediump float;\n' +
            'const float M_PI = 3.141592653589793;\n';

        // Taken from Holger Dammertz's notes on Hammersley Points
        var radicalInverse =
            'float vdcRadicalInverse(uint bits) {\n' +
            '  bits = (bits << 16u) | (bits >> 16u);\n' +
            '  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);\n' +
            '  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);\n' +
            '  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);\n' +
            '  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);\n' +
            '  return float(bits) * 2.3283064365386963e-10;\n' +
            '}\n';

        var hammersley =
            'vec2 hammersley2D(uint i, uint N) {\n' +
            '  return vec2(float(i) / float(N), vdcRadicalInverse(i));\n' +
            '}\n';

        // Taken from Real Shading in Unreal Engine 4
        var importanceSampleGGX =
            'vec3 importanceSampleGGX(vec2 xi, float roughness, vec3 N) {\n' +
            '  float a = roughness * roughness;\n' +
            '  float phi = 2.0 * M_PI * xi.x;\n' +
            '  cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a * a - 1.0) * xi.y));\n' +
            '  sinTheta = sqrt(1.0 - cosTheta * cosTheta);\n' +
            '  vec3 H = vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);\n' +
            '  vec3 upVector = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);\n' +
            '  vec3 tangentX = normalize(cross(upVector, N));\n' +
            '  vec3 tangentY = cross(N, tangentX);\n' +
            '  return tangentX * H.x + tangentY * H.y + N * H.z;\n' +
            '}\n';

        var GGX =
            'float GGX(float NdotV, float a) {\n' +
            '  float k = a / 2.0;\n' +
            '  return NdotV / (NdotV * (1.0 - k) + k);\n' +
            '}\n';

        var G_Smith =
            'float G_Smith(float roughness, float NdotV, float NdotL) {\n' +
            '  float a = roughness * roughness;\n' +
            '  return GGX(NdotL, a) * GGX(NdotV, a);\n' +
            '}\n';

        var integrateBRDF =
            'vec2 integrateBRDF(float roughness, float NdotV) {\n' +
            '  vec3 V = vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);\n' +
            '  float A = 0.0;\n' +
            '  float B = 0.0;\n' +
            '  const uint NumSamples = 1024;\n' +
            '  for (uint i = 0; i < NumSamples; i++) {\n' +
            '    vec2 xi = hammersley2D(i, NumSamples);\n' +
            '    vec3 H = importanceSampleGGX(xi, roughness, vec3(0.0, 0.0, 1.0));\n' +
            '    vec3 L = 2.0 * dot(V, H) * H - V;\n' +
            '    float NdotL = clamp(L.z, 0.0, 1.0);\n' +
            '    float NdotH = clamp(H.z, 0.0, 1.0);\n' +
            '    float VdotH = clamp(dot(V, H), 0.0, 1.0);\n' +
            '    if (NdotL > 0.0) {\n' +
            '      float G = G_Smith(roughness, NdotV, NdotL);\n' +
            '      float G_Vis = G * VdotH / (NdotH * NdotV);\n' +
            '      float Fc = pow(1.0 - VdotH, 5.0);\n' +
            '      A += (1.0 - Fc) * G_Vis;\n' +
            '      B += Fc * G_Vis;\n' +
            '    }\n' +
            '  }\n' +
            '  return vec2(A, B) / NumSamples;\n' +
            '}\n';

        var fragmentShaderMain =
            'void main() {\n' +
            '  gl_FragColor = vec4(integrateBRDF(gl_FragCoord.x, gl_FragCoord.y), 0.0, 1.0);\n' +
            '}\n';

        fragmentShader += radicalInverse + hammersley + importanceSampleGGX + GGX + G_Smith + integrateBRDF + fragmentShaderMain;

        var drawCommand = context.createViewportQuadCommand(fragmentShader, {
            framebuffer : framebuffer,
            renderState : RenderState.fromCache({
                viewport : new BoundingRectangle(0.0, 0.0, 256.0, 256.0)
            })
        });

        processor._drawCommand = drawCommand;
    }

    function createSampler() {
        return new Sampler({
            wrapS : TextureWrap.CLAMP_TO_EDGE,
            wrapT : TextureWrap.CLAMP_TO_EDGE,
            minificationFilter : TextureMinificationFilter.NEAREST,
            magnificationFilter : TextureMagnificationFilter.NEAREST
        })
    }

    function createFramebuffer(processor, context) {
        var colorTexture = new Texture({
            context : context,
            width : 256,
            height: 256,
            pixelFormat : PixelFormat.RGBA,
            pixelDatatype : PixelDatatype.UNSIGNED_BYTE,
            sampler : createSampler()
        });

        processor._colorTexture = colorTexture;

        var framebuffer = new Framebuffer({
            context : context,
            colorTextures : [colorTexture],
            destroyAttachments : true
        });

        processor._framebuffer = framebuffer;
    }

    function createResources(processor, context) {
        var framebuffer = processor._framebuffer;
        var drawCommand = processor._drawCommand;

        if (!defined(framebuffer)) {
            createFramebuffer(processor, context);
        }

        if (!defined(drawCommand)) {
            createCommand(processor, context);
        }

    }

    BrdfLutProcessor.prototype.update = function(frameState) {
        createResources(this, frameState.context);

        if (!this._executed) {
            this._drawCommand.execute(frameState.context);
            this._executed = true;
        }
    };

    return BrdfLutProcessor;
});
