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
            'precision mediump float;\n' +
            'varying vec2 v_textureCoordinates;\n' +
            'const float M_PI = 3.141592653589793;\n';

        var vdcRadicalInverse =
            'float vdcRadicalInverse(int i) {\n' +
            '  float r;' +
            '  float base = 2.0;\n' +
            '  float value = 0.0;\n' +
            '  float invBase = 1.0 / base;\n' +
            '  float invBi = invBase;\n' +
            '  for (int x = 0; x < 100; x++) {\n' +
            '    if (i <= 0) {\n' +
            '      break;\n' +
            '    }\n' +
            '    r = mod(float(i), base);\n' +
            '    value += r * invBi;\n' +
            '    invBi *= invBase;\n' +
            '    i = int(float(i) * invBase);\n' +
            '  }\n' +
            '  return value;\n' +
            '}\n';

        var hammersley =
            'vec2 hammersley2D(int i, int N) {\n' +
            '  return vec2(float(i) / float(N), vdcRadicalInverse(i));\n' +
            '}\n';

        // Taken from Real Shading in Unreal Engine 4
        var importanceSampleGGX =
            'vec3 importanceSampleGGX(vec2 xi, float roughness, vec3 N) {\n' +
            '  float a = roughness * roughness;\n' +
            '  float phi = 2.0 * M_PI * xi.x;\n' +
            '  float cosTheta = sqrt((1.0 - xi.y) / (1.0 + (a * a - 1.0) * xi.y));\n' +
            '  float sinTheta = sqrt(1.0 - cosTheta * cosTheta);\n' +
            '  vec3 H = vec3(sinTheta * cos(phi), sinTheta * sin(phi), cosTheta);\n' +
            '  vec3 upVector = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);\n' +
            '  vec3 tangentX = normalize(cross(upVector, N));\n' +
            '  vec3 tangentY = cross(N, tangentX);\n' +
            '  return tangentX * H.x + tangentY * H.y + N * H.z;\n' +
            '}\n';

        var G1_Smith =
            'float G1_Smith(float NdotV, float k) {\n' +
            '  return NdotV / (NdotV * (1.0 - k) + k);\n' +
            '}\n';

        var G_Smith =
            'float G_Smith(float roughness, float NdotV, float NdotL) {\n' +
            '  float k = roughness * roughness / 2.0;\n' +
            '  return G1_Smith(NdotV, k) * G1_Smith(NdotL, k);\n' +
            '}\n';

        var integrateBRDF =
            'vec2 integrateBRDF(float roughness, float NdotV) {\n' +
            '  vec3 V = vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);\n' +
            '  float A = 0.0;\n' +
            '  float B = 0.0;\n' +
            '  const int NumSamples = 1024;\n' +
            '  for (int i = 0; i < NumSamples; i++) {\n' +
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
            '  return vec2(A, B) / float(NumSamples);\n' +
            '}\n';

        var fragmentShaderMain =
            'void main() {\n' +
            '  gl_FragColor = vec4(integrateBRDF(1.0 - v_textureCoordinates.y, v_textureCoordinates.x), 0.0, 1.0);\n' +
            '}\n';

        fragmentShader += vdcRadicalInverse + hammersley + importanceSampleGGX + G1_Smith + G_Smith + integrateBRDF + fragmentShaderMain;

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
        });
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
