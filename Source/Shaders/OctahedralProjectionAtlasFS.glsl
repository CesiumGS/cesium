varying vec2 v_textureCoordinates;

uniform float originalSize;
uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;
uniform sampler2D texture5;

void main()
{
    vec2 uv = v_textureCoordinates;
    vec2 textureSize = vec2(originalSize * 1.5 + 2.0, originalSize);
    vec2 pixel = 1.0 / textureSize;

    float mipLevel = 0.0;

    if (uv.x - pixel.x > (textureSize.y / textureSize.x)) {
        mipLevel = 1.0;
        if (uv.y - pixel.y > 1.0 - (1.0 / pow(2.0, mipLevel)) ) {
            mipLevel = 2.0;
            if (uv.y - pixel.y * 3.0 > 1.0 - (1.0 / pow(2.0, mipLevel)) ) {
                mipLevel = 3.0;
                if (uv.y - pixel.y * 5.0 > 1.0 - (1.0 / pow(2.0, mipLevel)) ) {
                    mipLevel = 4.0;
                    if (uv.y - pixel.y * 7.0 > 1.0 - (1.0 / pow(2.0, mipLevel)) ) {
                        mipLevel = 5.0;
                    }
                }
            }
        }
    }

    if (mipLevel > 0.0) {
        float scale = pow(2.0, mipLevel);

        uv.y -= (pixel.y * (mipLevel-1.0) * 2.0);
        uv.x *= ((textureSize.x - 2.0) / textureSize.y);

        uv.x -= 1.0 + pixel.x;
        uv.y -= (1.0 - (1.0/pow(2.0, mipLevel-1.0)));
        uv *= scale;

    } else {
        uv.x *= (textureSize.x / textureSize.y);
    }

    if(mipLevel == 0.0) {
        gl_FragColor = texture2D(texture0, uv);
    }

    if(mipLevel == 1.0) {
        gl_FragColor = texture2D(texture1, uv);
    }

    if(mipLevel == 2.0) {
        gl_FragColor = texture2D(texture2, uv);
    }

    if(mipLevel == 3.0) {
        gl_FragColor = texture2D(texture3, uv);
    }

    if(mipLevel == 4.0) {
        gl_FragColor = texture2D(texture4, uv);
    }

    if(mipLevel == 5.0) {
        gl_FragColor = texture2D(texture5, uv);
    }
}
