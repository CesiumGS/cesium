// Fresnel integrals (plan 4a R8), normalized as
//
//   C(t) = ∫₀ᵗ cos(πu²/2) du,   S(t) = ∫₀ᵗ sin(πu²/2) du
//
// (the convention of Abramowitz & Stegun 7.3.1 and scipy.special.fresnel).
//
// Small |t| uses the power series of ∫₀ᵗ exp(iπu²/2) du, summed until the
// next term is below a float64 ulp of the smaller of C and S. Large |t| uses
// the large-argument (asymptotic) form C + iS = (1 + i)/2 · erf((1 − i)√π t/2)
// with erfc evaluated by its Lentz continued fraction (A&S 7.1.14; the
// approach of Numerical Recipes' `frenel`). The continued fraction is the
// convergent form of the asymptotic expansion: the plain asymptotic series
// stalls at a relative error of about exp(−πt²/2), which is 1e-12 only beyond
// t ≈ 4.2, while the continued fraction converges to float64 for every
// t ≥ 1.5. The switch is at |t| = 1.5, where the series' largest term is
// about 11, so its cancellation costs about one digit (error ~1e-15).
//
// Both forms hold 1e-12 relative (in practice ~1e-15, see test/alignment).

const SWITCH = 1.5;
const EPS = 2.220446049250313e-16;
const MAX_ITERATIONS = 500;

/** C(t) and S(t), with C(t) = ∫₀ᵗ cos(πu²/2) du; odd in t. */
export function fresnel(t: number): [number, number] {
  if (!Number.isFinite(t)) {
    if (Number.isNaN(t)) {
      return [NaN, NaN];
    }
    return t > 0 ? [0.5, 0.5] : [-0.5, -0.5];
  }
  const x = Math.abs(t);
  // Beyond 1e16 the remainder 1/(πx) is below half an ulp of 0.5.
  const [c, s] =
    x < SWITCH ? series(x) : x < 1e16 ? continuedFraction(x) : [0.5, 0.5];
  return t < 0 ? [-c, -s] : [c, s];
}

/** Σₖ (iπ/2)ᵏ x^(2k+1) / (k! (2k+1)): even k feed C, odd k feed S. */
function series(x: number): [number, number] {
  const q = (Math.PI / 2) * x * x;
  let term = x; // (π x²/2)ᵏ x / k!
  let c = x;
  let s = 0;
  for (let k = 1; k < MAX_ITERATIONS; k++) {
    term *= q / k;
    const contribution = term / (2 * k + 1);
    // i^k: k ≡ 1 → +S, 2 → −C, 3 → −S, 0 → +C (mod 4).
    switch (k & 3) {
      case 0:
        c += contribution;
        break;
      case 1:
        s += contribution;
        break;
      case 2:
        c -= contribution;
        break;
      default:
        s -= contribution;
    }
    // Past the largest term, every remaining term is smaller than this one.
    if (k > q && contribution <= EPS * 0.5 * Math.min(c, s)) {
      break;
    }
  }
  return [c, s];
}

/**
 * C + iS = (1 + i)/2 · [1 − exp(iπx²/2) · (1 − i) x · h], with h the Lentz
 * evaluation of the continued fraction 1/(b₀ + a₁/(b₁ + a₂/(b₂ + …))),
 * b_k = 1 − iπx² + 4k, a_k = −(2k − 1)(2k).
 */
function continuedFraction(x: number): [number, number] {
  const pix2 = Math.PI * x * x;
  const TINY = 1e-300;
  // Complex arithmetic on [re, im] pairs.
  let bRe = 1;
  const bIm = -pix2;
  // d = h = 1/b
  let den = bRe * bRe + bIm * bIm;
  let dRe = bRe / den;
  let dIm = -bIm / den;
  let hRe = dRe;
  let hIm = dIm;
  let ccRe = 1 / TINY;
  let ccIm = 0;
  let n = -1;
  for (let k = 2; k <= MAX_ITERATIONS; k++) {
    n += 2;
    const a = -n * (n + 1);
    bRe += 4;
    // d = 1 / (a d + b)
    const tRe = a * dRe + bRe;
    const tIm = a * dIm + bIm;
    den = tRe * tRe + tIm * tIm;
    dRe = tRe / den;
    dIm = -tIm / den;
    // cc = b + a / cc
    const cden = ccRe * ccRe + ccIm * ccIm;
    ccRe = bRe + (a * ccRe) / cden;
    ccIm = bIm - (a * ccIm) / cden;
    // del = cc d; h *= del
    const delRe = ccRe * dRe - ccIm * dIm;
    const delIm = ccRe * dIm + ccIm * dRe;
    const nhRe = hRe * delRe - hIm * delIm;
    hIm = hRe * delIm + hIm * delRe;
    hRe = nhRe;
    if (Math.abs(delRe - 1) + Math.abs(delIm) <= EPS) {
      break;
    }
  }
  // h *= (x − i x)
  const h2Re = x * (hRe + hIm);
  const h2Im = x * (hIm - hRe);
  // w = 1 − exp(i pix2/2) h
  const [eRe, eIm] = cosSinHalfPiSquare(x);
  const wRe = 1 - (eRe * h2Re - eIm * h2Im);
  const wIm = -(eRe * h2Im + eIm * h2Re);
  // (0.5 + 0.5 i) w
  return [0.5 * (wRe - wIm), 0.5 * (wRe + wIm)];
}

/**
 * cos and sin of πx²/2 with the phase reduced exactly: x² is split into a
 * double-double hi + lo (Dekker's product), hi is reduced modulo 4 (exact),
 * and only the small remainder is multiplied by π/2. Computing π·x·x/2
 * directly would lose ~x²·1e-16 rad of phase (1e-8 rad at x = 1e4).
 */
function cosSinHalfPiSquare(x: number): [number, number] {
  const SPLIT = 134217729; // 2^27 + 1
  const p = SPLIT * x;
  const xh = p - (p - x);
  const xl = x - xh;
  const hi = x * x;
  const lo = xh * xh - hi + 2 * xh * xl + xl * xl;
  const r = hi - 4 * Math.round(hi / 4);
  const phase = (Math.PI / 2) * (r + lo);
  return [Math.cos(phase), Math.sin(phase)];
}
