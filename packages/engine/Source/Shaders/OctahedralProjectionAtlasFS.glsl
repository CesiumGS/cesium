in vec2 v_textureCoordinates;

uniform float originalSize;
uniform sampler2D texture0;
uniform sampler2D texture1;
uniform sampler2D texture2;
uniform sampler2D texture3;
uniform sampler2D texture4;
uniform sampler2D texture5;

const float yMipLevel1 = 1.0 - (1.0 / pow(2.0, 1.0));
const float yMipLevel2 = 1.0 - (1.0 / pow(2.0, 2.0));
const float yMipLevel3 = 1.0 - (1.0 / pow(2.0, 3.0));
const float yMipLevel4 = 1.0 - (1.0 / pow(2.0, 4.0));

void main()
{
    vec2 uv = v_textureCoordinates;
    vec2 textureSize = vec2(originalSize * 1.5 + 2.0, originalSize);
    vec2 pixel = 1.0 / textureSize;

    float mipLevel = 0.0;

    if (uv.x - pixel.x > (textureSize.y / textureSize.x))
    {
        mipLevel = 1.0;
        if (uv.y - pixel.y > yMipLevel1)
        {
            mipLevel = 2.0;
            if (uv.y - pixel.y * 3.0 > yMipLevel2)
            {
                mipLevel = 3.0;
                if (uv.y - pixel.y * 5.0 > yMipLevel3)
                {
                    mipLevel = 4.0;
                    if (uv.y - pixel.y * 7.0 > yMipLevel4)
                    {
                        mipLevel = 5.0;
                    }
                }
            }
        }
    }

    if (mipLevel > 0.0)
    {
        float scale = pow(2.0, mipLevel);

        uv.y -= (pixel.y * (mipLevel - 1.0) * 2.0);
        uv.x *= ((textureSize.x - 2.0) / textureSize.y);

        uv.x -= 1.0 + pixel.x;
        uv.y -= (1.0 - (1.0 / pow(2.0, mipLevel - 1.0)));
        uv *= scale;
    }
    else
    {
        uv.x *= (textureSize.x / textureSize.y);
    }

    if(mipLevel == 0.0)
    {
        out_FragColor = texture(texture0, uv);
    }
    else if(mipLevel == 1.0)
    {
        out_FragColor = texture(texture1, uv);
    }
    else if(mipLevel == 2.0)
    {
        out_FragColor = texture(texture2, uv);
    }
    else if(mipLevel == 3.0)
    {
        out_FragColor = texture(texture3, uv);
    }
    else if(mipLevel == 4.0)
    {
        out_FragColor = texture(texture4, uv);
    }
    else if(mipLevel == 5.0)
    {
        out_FragColor = texture(texture5, uv);
    }
    else
    {
        out_FragColor = vec4(0.0);
    }
}
