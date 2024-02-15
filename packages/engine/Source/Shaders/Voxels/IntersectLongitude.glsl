// See IntersectionUtils.glsl for the definitions of Ray, NO_HIT, INF_HIT,
// RayShapeIntersection

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
    intersections[0] = intersectHalfSpace(ray, minMaxAngle.x, false);
    intersections[1] = intersectHalfSpace(ray, minMaxAngle.y, true);
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

    if (hitPositiveHalfPlane(ray, intersection, true)) {
        intersections[0].entry = -1.0 * farSide;
        intersections[0].exit = vec4(-1.0 * intersection.xy, 0.0, intersection.w);
        intersections[1].entry = intersection;
        intersections[1].exit = farSide;
    } else {
        vec4 miss = vec4(normalize(ray.dir), NO_HIT);
        intersections[0].entry = -1.0 * farSide;
        intersections[0].exit = farSide;
        intersections[1].entry = miss;
        intersections[1].exit = miss;
    }
}

RayShapeIntersection intersectRegularWedge(in Ray ray, in vec2 minMaxAngle, in bool convex)
{
    // Compute intersections with the two planes
    // TODO: the sign of the normals looks backwards?? But it works for convex == false
    vec4 intersect1 = intersectLongitude(ray, minMaxAngle.x, convex);
    vec4 intersect2 = intersectLongitude(ray, minMaxAngle.y, !convex);

    // Choose intersection with smallest T as the "entry", the other as "exit"
    // Note: entry or exit could be in the "shadow" wedge, beyond the tip
    bool inOrder = intersect1.w <= intersect2.w;
    vec4 entry = inOrder ? intersect1 : intersect2;
    vec4 exit = inOrder ? intersect2 : intersect1;

    bool enterFromOutside = (entry.w >= 0.0) == (dot(ray.pos.xy, entry.xy) < 0.0);
    bool exitFromInside = (exit.w > 0.0) == (dot(ray.pos.xy, exit.xy) >= 0.0);

    float farSideDirection = (convex) ? -1.0 : 1.0;
    vec4 farSide = vec4(normalize(ray.dir) * farSideDirection, INF_HIT);
    vec4 miss = vec4(normalize(ray.dir), NO_HIT);

    if (enterFromOutside && exitFromInside) {
        // Ray crosses both faces of wedge
        return RayShapeIntersection(entry, exit);
    } else if (!enterFromOutside && exitFromInside) {
        // Ray starts inside wedge. exit is in shadow wedge, and entry is actually the exit
        return RayShapeIntersection(-1.0 * farSide, entry);
    } else if (enterFromOutside && !exitFromInside) {
        // First intersection was in the shadow wedge, so exit is actually the entry
        return RayShapeIntersection(exit, farSide);
    } else { // !enterFromOutside && !exitFromInside
        // Both intersections were in the shadow wedge
        return RayShapeIntersection(miss, miss);
    }
}
