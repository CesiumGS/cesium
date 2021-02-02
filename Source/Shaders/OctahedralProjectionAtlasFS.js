//This file is automatically rebuilt by the Cesium build process.
export default "varying vec2 v_textureCoordinates;\n\
\n\
uniform float originalSize;\n\
uniform sampler2D texture0;\n\
uniform sampler2D texture1;\n\
uniform sampler2D texture2;\n\
uniform sampler2D texture3;\n\
uniform sampler2D texture4;\n\
uniform sampler2D texture5;\n\
\n\
const float yMipLevel1 = 1.0 - (1.0 / pow(2.0, 1.0));\n\
const float yMipLevel2 = 1.0 - (1.0 / pow(2.0, 2.0));\n\
const float yMipLevel3 = 1.0 - (1.0 / pow(2.0, 3.0));\n\
const float yMipLevel4 = 1.0 - (1.0 / pow(2.0, 4.0));\n\
\n\
void main()\n\
{\n\
    vec2 uv = v_textureCoordinates;\n\
    vec2 textureSize = vec2(originalSize * 1.5 + 2.0, originalSize);\n\
    vec2 pixel = 1.0 / textureSize;\n\
\n\
    float mipLevel = 0.0;\n\
\n\
    if (uv.x - pixel.x > (textureSize.y / textureSize.x))\n\
    {\n\
        mipLevel = 1.0;\n\
        if (uv.y - pixel.y > yMipLevel1)\n\
        {\n\
            mipLevel = 2.0;\n\
            if (uv.y - pixel.y * 3.0 > yMipLevel2)\n\
            {\n\
                mipLevel = 3.0;\n\
                if (uv.y - pixel.y * 5.0 > yMipLevel3)\n\
                {\n\
                    mipLevel = 4.0;\n\
                    if (uv.y - pixel.y * 7.0 > yMipLevel4)\n\
                    {\n\
                        mipLevel = 5.0;\n\
                    }\n\
                }\n\
            }\n\
        }\n\
    }\n\
\n\
    if (mipLevel > 0.0)\n\
    {\n\
        float scale = pow(2.0, mipLevel);\n\
\n\
        uv.y -= (pixel.y * (mipLevel - 1.0) * 2.0);\n\
        uv.x *= ((textureSize.x - 2.0) / textureSize.y);\n\
\n\
        uv.x -= 1.0 + pixel.x;\n\
        uv.y -= (1.0 - (1.0 / pow(2.0, mipLevel - 1.0)));\n\
        uv *= scale;\n\
    }\n\
    else\n\
    {\n\
        uv.x *= (textureSize.x / textureSize.y);\n\
    }\n\
\n\
    if(mipLevel == 0.0)\n\
    {\n\
        gl_FragColor = texture2D(texture0, uv);\n\
    }\n\
    else if(mipLevel == 1.0)\n\
    {\n\
        gl_FragColor = texture2D(texture1, uv);\n\
    }\n\
    else if(mipLevel == 2.0)\n\
    {\n\
        gl_FragColor = texture2D(texture2, uv);\n\
    }\n\
    else if(mipLevel == 3.0)\n\
    {\n\
        gl_FragColor = texture2D(texture3, uv);\n\
    }\n\
    else if(mipLevel == 4.0)\n\
    {\n\
        gl_FragColor = texture2D(texture4, uv);\n\
    }\n\
    else if(mipLevel == 5.0)\n\
    {\n\
        gl_FragColor = texture2D(texture5, uv);\n\
    }\n\
    else\n\
    {\n\
        gl_FragColor = vec4(0.0);\n\
    }\n\
}\n\
";
