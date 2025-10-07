struct Ray {
    vec3 pos;
    vec3 dir;
};

float minComponent(in vec3 v) {
    return min(min(v.x, v.y), v.z);
}

float maxComponent(in vec3 v) {
    return max(max(v.x, v.y), v.z);
}
