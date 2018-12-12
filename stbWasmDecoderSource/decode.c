#define STB_IMAGE_IMPLEMENTATION
#define STBI_NO_HDR
#include "stb_image.h"

unsigned char* decode(const unsigned char* buffer, int bufferLength, int channelCount, int* dimensions)
{
    unsigned char* result = stbi_load_from_memory(buffer, bufferLength, &dimensions[0], &dimensions[1], 0, channelCount);
    return result;
}
