vec3 czm_acestoneMapping(vec3 color)
{
    float g = 0.985;
    float a = 0.065;
    float b = 0.0001;
    float c = 0.433;
    float d = 0.238;

    color = (color * (color + a) - b) / (color * (g * color + c) + d);

    color = clamp(color, 0.0, 1.0);
    color = czm_inverseGamma(color);

    return color
}