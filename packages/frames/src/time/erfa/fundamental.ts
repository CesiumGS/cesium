// Derived from ERFA (eraFal03 and the other eraFa*03 functions, liberfa
// v2.0.1), itself derived from the IAU SOFA library. See ./LICENSE.
//
// Fundamental arguments of the IERS Conventions (2003), after Simon et al.
// (1994) and Souchay et al. (1999). Each takes `t`, TDB (TT here) in Julian
// centuries since J2000.0, and returns radians.

/** Arcseconds to radians. */
export const DAS2R = 4.84813681109536e-6;
/** 2 pi. */
export const D2PI = 6.283185307179586;
/** Arcseconds in a full circle. */
const TURNAS = 1_296_000.0;

/** Mean anomaly of the Moon. */
export function fal03(t: number): number {
  return (
    ((485868.249036 +
      t * (1717915923.2178 + t * (31.8792 + t * (0.051635 + t * -0.0002447)))) %
      TURNAS) *
    DAS2R
  );
}

/** Mean anomaly of the Sun. */
export function falp03(t: number): number {
  return (
    ((1287104.793048 +
      t * (129596581.0481 + t * (-0.5532 + t * (0.000136 + t * -0.00001149)))) %
      TURNAS) *
    DAS2R
  );
}

/** Mean longitude of the Moon minus that of the ascending node. */
export function faf03(t: number): number {
  return (
    ((335779.526232 +
      t *
        (1739527262.8478 + t * (-12.7512 + t * (-0.001037 + t * 0.00000417)))) %
      TURNAS) *
    DAS2R
  );
}

/** Mean elongation of the Moon from the Sun. */
export function fad03(t: number): number {
  return (
    ((1072260.703692 +
      t * (1602961601.209 + t * (-6.3706 + t * (0.006593 + t * -0.00003169)))) %
      TURNAS) *
    DAS2R
  );
}

/** Mean longitude of the Moon's ascending node. */
export function faom03(t: number): number {
  return (
    ((450160.398036 +
      t * (-6962890.5431 + t * (7.4722 + t * (0.007702 + t * -0.00005939)))) %
      TURNAS) *
    DAS2R
  );
}

/** Mean longitude of Mercury. */
export function fame03(t: number): number {
  return (4.402608842 + 2608.7903141574 * t) % D2PI;
}

/** Mean longitude of Venus. */
export function fave03(t: number): number {
  return (3.176146697 + 1021.3285546211 * t) % D2PI;
}

/** Mean longitude of Earth. */
export function fae03(t: number): number {
  return (1.753470314 + 628.3075849991 * t) % D2PI;
}

/** Mean longitude of Mars. */
export function fama03(t: number): number {
  return (6.203480913 + 334.06124267 * t) % D2PI;
}

/** Mean longitude of Jupiter. */
export function faju03(t: number): number {
  return (0.599546497 + 52.9690962641 * t) % D2PI;
}

/** Mean longitude of Saturn. */
export function fasa03(t: number): number {
  return (0.874016757 + 21.329910496 * t) % D2PI;
}

/** Mean longitude of Uranus. */
export function faur03(t: number): number {
  return (5.481293872 + 7.4781598567 * t) % D2PI;
}

/** Mean longitude of Neptune. */
export function fane03(t: number): number {
  return (5.311886287 + 3.8133035638 * t) % D2PI;
}

/** General accumulated precession in longitude. */
export function fapa03(t: number): number {
  return (0.02438175 + 0.00000538691 * t) * t;
}
