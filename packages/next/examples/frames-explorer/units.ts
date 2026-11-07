// The explorer's units and radii, each named for what it is (the final
// review, finding 5): one home for constants several files had re-typed,
// some under one name with different values. No imports, so the page, the
// worker and the catalog can all read it.

/** Radians in a degree: degrees × RAD_PER_DEG = radians. */
export const RAD_PER_DEG = Math.PI / 180;

/** Degrees in a radian: radians × DEG_PER_RAD = degrees. */
export const DEG_PER_RAD = 180 / Math.PI;

/** An arcsecond, in radians. */
export const ARCSECOND = Math.PI / 648_000;

/** US survey feet in a metre (3937/1200, exact by definition). */
export const FTUS_PER_M = 3937 / 1200;

/** The Earth's mean radius, m (IUGG): a horizon's dip, a sphere's scale. */
export const EARTH_MEAN_RADIUS = 6_371_000;

/** WGS 84's equatorial radius, m: the camera's range limits round the Earth. */
export const EARTH_EQUATORIAL_RADIUS = 6_378_137;

/** WGS 84's polar radius to the metre, m: the globe's inner sphere, which nothing may draw inside. */
export const EARTH_POLAR_RADIUS = 6_356_752;

/** The Moon's mean radius, m (IAU, 1,737.4 km). */
export const MOON_RADIUS = 1_737_400;
