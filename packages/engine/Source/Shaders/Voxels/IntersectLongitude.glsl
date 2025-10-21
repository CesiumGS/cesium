// See IntersectionUtils.glsl for the definitions of Ray, NO_HIT, INF_HIT,
// RayShapeIntersection

vec4 transformNormalToEC(in vec4 intersection) {
    return vec4(normalize(czm_normal * intersection.xyz), intersection.w);
}

RayShapeIntersection transformNormalsToEC(in RayShapeIntersection ix) {
    return RayShapeIntersection(transformNormalToEC(ix.entry), transformNormalToEC(ix.exit));
}

vec4 intersectLongitude(in Ray ray, in float angle, in bool positiveNormal) {
    float normalSign = positiveNormal ? 1.0 : -1.0;
    vec2 planeNormal = vec2(-sin(angle), cos(angle)) * normalSign;

    vec2 position = ray.pos.xy;
    vec2 direction = ray.dir.xy;
    float approachRate = dot(direction, planeNormal);
    float distance = -dot(position, planeNormal);

    float t = (approachRate == 0.0)
        ? NO_HIT
        : distance / approachRate;

    return vec4(planeNormal, 0.0, t);
}

RayShapeIntersection intersectHalfSpace(in Ray ray, in float angle, in bool positiveNormal)
{
    vec4 intersection = intersectLongitude(ray, angle, positiveNormal);
    vec4 farSide = vec4(normalize(ray.dir), INF_HIT);

    bool hitFront = (intersection.w > 0.0) == (dot(ray.pos.xy, intersection.xy) > 0.0);
    if (!hitFront) {
        return RayShapeIntersection(intersection, farSide);
    } else {
        return RayShapeIntersection(-1.0 * farSide, intersection);
    }
}

void intersectFlippedWedge(in Ray ray, in vec2 minMaxAngle, out RayShapeIntersection intersections[2])
{
    intersections[0] = transformNormalsToEC(intersectHalfSpace(ray, minMaxAngle.x, false));
    intersections[1] = transformNormalsToEC(intersectHalfSpace(ray, minMaxAngle.y, true));
}

bool hitPositiveHalfPlane(in Ray ray, in vec4 intersection, in bool positiveNormal) {
    float normalSign = positiveNormal ? 1.0 : -1.0;
    vec2 planeDirection = vec2(intersection.y, -intersection.x) * normalSign;
    vec2 hit = ray.pos.xy + intersection.w * ray.dir.xy;
    return dot(hit, planeDirection) > 0.0;
}

void intersectHalfPlane(in Ray ray, in float angle, out RayShapeIntersection intersections[2]) {
    vec4 intersection = intersectLongitude(ray, angle, true);
    vec4 farSide = vec4(normalize(ray.dir), INF_HIT);
    bool hitPositiveSide = hitPositiveHalfPlane(ray, intersection, true);

    farSide = transformNormalToEC(farSide);

    if (hitPositiveSide) {
        intersection = transformNormalToEC(intersection);
        intersections[0].entry = -1.0 * farSide;
        intersections[0].exit = vec4(-1.0 * intersection.xyz, intersection.w);
        intersections[1].entry = intersection;
        intersections[1].exit = farSide;
    } else {
        vec4 miss = vec4(normalize(czm_normal * ray.dir), NO_HIT);
        intersections[0].entry = -1.0 * farSide;
        intersections[0].exit = farSide;
        intersections[1].entry = miss;
        intersections[1].exit = miss;
    }
}

RayShapeIntersection intersectRegularWedge(in Ray ray, in vec2 minMaxAngle)
{
    // Note: works for maxAngle > minAngle + pi, where the "regular wedge"
    // is actually a negative volume.
    // Compute intersections with the two planes.
    // Normals will point toward the "outside" (negative space)
    vec4 intersect1 = intersectLongitude(ray, minMaxAngle.x, false);
    vec4 intersect2 = intersectLongitude(ray, minMaxAngle.y, true);

    // Choose intersection with smallest T as the "first", the other as "last"
    // Note: first or last could be in the "shadow" wedge, beyond the tip
    bool inOrder = intersect1.w <= intersect2.w;
    vec4 first = inOrder ? intersect1 : intersect2;
    vec4 last = inOrder ? intersect2 : intersect1;

    bool firstIsAhead = first.w >= 0.0;
    bool startedInsideFirst = dot(ray.pos.xy, first.xy) < 0.0;
    bool exitFromInside = firstIsAhead == startedInsideFirst;
    bool lastIsAhead = last.w > 0.0;
    bool startedOutsideLast = dot(ray.pos.xy, last.xy) >= 0.0;
    bool enterFromOutside = lastIsAhead == startedOutsideLast;

    vec4 farSide = vec4(normalize(ray.dir), INF_HIT);
    vec4 miss = vec4(normalize(ray.dir), NO_HIT);

    if (exitFromInside && enterFromOutside) {
        // Ray crosses both faces of negative wedge, exiting then entering the positive shape
        return transformNormalsToEC(RayShapeIntersection(first, last));
    } else if (!exitFromInside && enterFromOutside) {
        // Ray starts inside wedge. last is in shadow wedge, and first is actually the entry
        return transformNormalsToEC(RayShapeIntersection(-1.0 * farSide, first));
    } else if (exitFromInside && !enterFromOutside) {
        // First intersection was in the shadow wedge, so last is actually the exit
        return transformNormalsToEC(RayShapeIntersection(last, farSide));
    } else { // !exitFromInside && !enterFromOutside
        // Both intersections were in the shadow wedge
        return transformNormalsToEC(RayShapeIntersection(miss, miss));
    }
}
