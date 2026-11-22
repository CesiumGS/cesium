// Error-free float32 arithmetic (Knuth's two-sum, Dekker's two-product by
// Veltkamp's split): a sum or product as the pair (rounded value, the exact
// rounding error). The cull kernel adds a placement's order-0 displacement
// (tens of kilometers, as hi and lo parts) to the camera-relative origin
// with them, so the two large terms cancel exactly (plan 13.26, the second
// review's flaw 3; cullTables.slang `drawnTranslation`).
//
// They need the compiler to keep the order of float operations. Where it
// reassociates (Dawn's relaxed math on Apple GPUs, common.slang's
// `SplitPosition`), each error term folds to 0 and the result is the plain
// float32 sum or product: no better than before, never worse.
module exactSum;

// a + b = value + error, exactly.
public float2 twoSum(float a, float b) {
  float s = a + b;
  float v = s - a;
  return float2(s, (a - (s - v)) + (b - v));
}

// The high half of `a` (12 bits), by Veltkamp's split: a - highHalf(a) is
// exact in the other 12.
float highHalf(float a) {
  float c = 4097.0 * a;
  return c - (c - a);
}

// a * b = value + error, exactly (no overflow: the operands are meters).
public float2 twoProd(float a, float b) {
  float p = a * b;
  float ah = highHalf(a);
  float al = a - ah;
  float bh = highHalf(b);
  float bl = b - bh;
  return float2(p, ((ah * bh - p) + ah * bl + al * bh) + al * bl);
}
