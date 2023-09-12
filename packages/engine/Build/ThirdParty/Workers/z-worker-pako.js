!function() {
  "use strict";
  const { Array: t, Object: e, Math: n, Error: s, Uint8Array: r, Uint16Array: a, Uint32Array: i, Int32Array: c, DataView: o, TextEncoder: l, crypto: h, postMessage: p } = globalThis, d = [];
  for (let t2 = 0; 256 > t2; t2++) {
    let e2 = t2;
    for (let t3 = 0; 8 > t3; t3++)
      1 & e2 ? e2 = e2 >>> 1 ^ 3988292384 : e2 >>>= 1;
    d[t2] = e2;
  }
  class u {
    constructor(t2) {
      this.crc = t2 || -1;
    }
    append(t2) {
      let e2 = 0 | this.crc;
      for (let n2 = 0, s2 = 0 | t2.length; s2 > n2; n2++)
        e2 = e2 >>> 8 ^ d[255 & (e2 ^ t2[n2])];
      this.crc = e2;
    }
    get() {
      return ~this.crc;
    }
  }
  const f = { concat(t2, e2) {
    if (0 === t2.length || 0 === e2.length)
      return t2.concat(e2);
    const n2 = t2[t2.length - 1], s2 = f.getPartial(n2);
    return 32 === s2 ? t2.concat(e2) : f._shiftRight(e2, s2, 0 | n2, t2.slice(0, t2.length - 1));
  }, bitLength(t2) {
    const e2 = t2.length;
    if (0 === e2)
      return 0;
    const n2 = t2[e2 - 1];
    return 32 * (e2 - 1) + f.getPartial(n2);
  }, clamp(t2, e2) {
    if (32 * t2.length < e2)
      return t2;
    const s2 = (t2 = t2.slice(0, n.ceil(e2 / 32))).length;
    return e2 &= 31, s2 > 0 && e2 && (t2[s2 - 1] = f.partial(e2, t2[s2 - 1] & 2147483648 >> e2 - 1, 1)), t2;
  }, partial: (t2, e2, n2) => 32 === t2 ? e2 : (n2 ? 0 | e2 : e2 << 32 - t2) + 1099511627776 * t2, getPartial: (t2) => n.round(t2 / 1099511627776) || 32, _shiftRight(t2, e2, n2, s2) {
    for (void 0 === s2 && (s2 = []); e2 >= 32; e2 -= 32)
      s2.push(n2), n2 = 0;
    if (0 === e2)
      return s2.concat(t2);
    for (let r3 = 0; r3 < t2.length; r3++)
      s2.push(n2 | t2[r3] >>> e2), n2 = t2[r3] << 32 - e2;
    const r2 = t2.length ? t2[t2.length - 1] : 0, a2 = f.getPartial(r2);
    return s2.push(f.partial(e2 + a2 & 31, e2 + a2 > 32 ? n2 : s2.pop(), 1)), s2;
  } }, g = { bytes: { fromBits(t2) {
    const e2 = f.bitLength(t2) / 8, n2 = new r(e2);
    let s2;
    for (let r2 = 0; e2 > r2; r2++)
      0 == (3 & r2) && (s2 = t2[r2 / 4]), n2[r2] = s2 >>> 24, s2 <<= 8;
    return n2;
  }, toBits(t2) {
    const e2 = [];
    let n2, s2 = 0;
    for (n2 = 0; n2 < t2.length; n2++)
      s2 = s2 << 8 | t2[n2], 3 == (3 & n2) && (e2.push(s2), s2 = 0);
    return 3 & n2 && e2.push(f.partial(8 * (3 & n2), s2)), e2;
  } } }, w = { sha1: function(t2) {
    t2 ? (this._h = t2._h.slice(0), this._buffer = t2._buffer.slice(0), this._length = t2._length) : this.reset();
  } };
  w.sha1.prototype = { blockSize: 512, reset: function() {
    const t2 = this;
    return t2._h = this._init.slice(0), t2._buffer = [], t2._length = 0, t2;
  }, update: function(t2) {
    const e2 = this;
    "string" == typeof t2 && (t2 = g.utf8String.toBits(t2));
    const n2 = e2._buffer = f.concat(e2._buffer, t2), r2 = e2._length, a2 = e2._length = r2 + f.bitLength(t2);
    if (a2 > 9007199254740991)
      throw new s("Cannot hash more than 2^53 - 1 bits");
    const c2 = new i(n2);
    let o2 = 0;
    for (let t3 = e2.blockSize + r2 - (e2.blockSize + r2 & e2.blockSize - 1); a2 >= t3; t3 += e2.blockSize)
      e2._block(c2.subarray(16 * o2, 16 * (o2 + 1))), o2 += 1;
    return n2.splice(0, 16 * o2), e2;
  }, finalize: function() {
    const t2 = this;
    let e2 = t2._buffer;
    const s2 = t2._h;
    e2 = f.concat(e2, [f.partial(1, 1)]);
    for (let t3 = e2.length + 2; 15 & t3; t3++)
      e2.push(0);
    for (e2.push(n.floor(t2._length / 4294967296)), e2.push(0 | t2._length); e2.length; )
      t2._block(e2.splice(0, 16));
    return t2.reset(), s2;
  }, _init: [1732584193, 4023233417, 2562383102, 271733878, 3285377520], _key: [1518500249, 1859775393, 2400959708, 3395469782], _f: (t2, e2, n2, s2) => t2 > 19 ? t2 > 39 ? t2 > 59 ? t2 > 79 ? void 0 : e2 ^ n2 ^ s2 : e2 & n2 | e2 & s2 | n2 & s2 : e2 ^ n2 ^ s2 : e2 & n2 | ~e2 & s2, _S: (t2, e2) => e2 << t2 | e2 >>> 32 - t2, _block: function(e2) {
    const s2 = this, r2 = s2._h, a2 = t(80);
    for (let t2 = 0; 16 > t2; t2++)
      a2[t2] = e2[t2];
    let i2 = r2[0], c2 = r2[1], o2 = r2[2], l2 = r2[3], h2 = r2[4];
    for (let t2 = 0; 79 >= t2; t2++) {
      16 > t2 || (a2[t2] = s2._S(1, a2[t2 - 3] ^ a2[t2 - 8] ^ a2[t2 - 14] ^ a2[t2 - 16]));
      const e3 = s2._S(5, i2) + s2._f(t2, c2, o2, l2) + h2 + a2[t2] + s2._key[n.floor(t2 / 20)] | 0;
      h2 = l2, l2 = o2, o2 = s2._S(30, c2), c2 = i2, i2 = e3;
    }
    r2[0] = r2[0] + i2 | 0, r2[1] = r2[1] + c2 | 0, r2[2] = r2[2] + o2 | 0, r2[3] = r2[3] + l2 | 0, r2[4] = r2[4] + h2 | 0;
  } };
  const y = { getRandomValues(t2) {
    const e2 = new i(t2.buffer), s2 = (t3) => {
      let e3 = 987654321;
      const s3 = 4294967295;
      return () => (e3 = 36969 * (65535 & e3) + (e3 >> 16) & s3, (((e3 << 16) + (t3 = 18e3 * (65535 & t3) + (t3 >> 16) & s3) & s3) / 4294967296 + 0.5) * (n.random() > 0.5 ? 1 : -1));
    };
    for (let r2, a2 = 0; a2 < t2.length; a2 += 4) {
      const t3 = s2(4294967296 * (r2 || n.random()));
      r2 = 987654071 * t3(), e2[a2 / 4] = 4294967296 * t3() | 0;
    }
    return t2;
  } }, _ = { importKey: (t2) => new _.hmacSha1(g.bytes.toBits(t2)), pbkdf2(t2, e2, n2, r2) {
    if (n2 = n2 || 1e4, 0 > r2 || 0 > n2)
      throw new s("invalid params to pbkdf2");
    const a2 = 1 + (r2 >> 5) << 2;
    let i2, c2, l2, h2, p2;
    const d2 = new ArrayBuffer(a2), u2 = new o(d2);
    let w2 = 0;
    const y2 = f;
    for (e2 = g.bytes.toBits(e2), p2 = 1; (a2 || 1) > w2; p2++) {
      for (i2 = c2 = t2.encrypt(y2.concat(e2, [p2])), l2 = 1; n2 > l2; l2++)
        for (c2 = t2.encrypt(c2), h2 = 0; h2 < c2.length; h2++)
          i2[h2] ^= c2[h2];
      for (l2 = 0; (a2 || 1) > w2 && l2 < i2.length; l2++)
        u2.setInt32(w2, i2[l2]), w2 += 4;
    }
    return d2.slice(0, r2 / 8);
  }, hmacSha1: class {
    constructor(t2) {
      const e2 = this, n2 = e2._hash = w.sha1, s2 = [[], []], r2 = n2.prototype.blockSize / 32;
      e2._baseHash = [new n2(), new n2()], t2.length > r2 && (t2 = n2.hash(t2));
      for (let e3 = 0; r2 > e3; e3++)
        s2[0][e3] = 909522486 ^ t2[e3], s2[1][e3] = 1549556828 ^ t2[e3];
      e2._baseHash[0].update(s2[0]), e2._baseHash[1].update(s2[1]), e2._resultHash = new n2(e2._baseHash[0]);
    }
    reset() {
      const t2 = this;
      t2._resultHash = new t2._hash(t2._baseHash[0]), t2._updated = false;
    }
    update(t2) {
      this._updated = true, this._resultHash.update(t2);
    }
    digest() {
      const t2 = this, e2 = t2._resultHash.finalize(), n2 = new t2._hash(t2._baseHash[1]).update(e2).finalize();
      return t2.reset(), n2;
    }
    encrypt(t2) {
      if (this._updated)
        throw new s("encrypt on already updated hmac called!");
      return this.update(t2), this.digest(t2);
    }
  } }, m = "Invalid pasword", b = 16, k = { name: "PBKDF2" }, v = e.assign({ hash: { name: "HMAC" } }, k), z = e.assign({ iterations: 1e3, hash: { name: "SHA-1" } }, k), C = ["deriveBits"], S = [8, 12, 16], B = [16, 24, 32], I = 10, D = [0, 0, 0, 0], V = void 0 !== h, H = V && void 0 !== h.subtle, K = g.bytes, A = class {
    constructor(t2) {
      const e2 = this;
      e2._tables = [[[], [], [], [], []], [[], [], [], [], []]], e2._tables[0][0][0] || e2._precompute();
      const n2 = e2._tables[0][4], r2 = e2._tables[1], a2 = t2.length;
      let i2, c2, o2, l2 = 1;
      if (4 !== a2 && 6 !== a2 && 8 !== a2)
        throw new s("invalid aes key size");
      for (e2._key = [c2 = t2.slice(0), o2 = []], i2 = a2; 4 * a2 + 28 > i2; i2++) {
        let t3 = c2[i2 - 1];
        (i2 % a2 == 0 || 8 === a2 && i2 % a2 == 4) && (t3 = n2[t3 >>> 24] << 24 ^ n2[t3 >> 16 & 255] << 16 ^ n2[t3 >> 8 & 255] << 8 ^ n2[255 & t3], i2 % a2 == 0 && (t3 = t3 << 8 ^ t3 >>> 24 ^ l2 << 24, l2 = l2 << 1 ^ 283 * (l2 >> 7))), c2[i2] = c2[i2 - a2] ^ t3;
      }
      for (let t3 = 0; i2; t3++, i2--) {
        const e3 = c2[3 & t3 ? i2 : i2 - 4];
        o2[t3] = 4 >= i2 || 4 > t3 ? e3 : r2[0][n2[e3 >>> 24]] ^ r2[1][n2[e3 >> 16 & 255]] ^ r2[2][n2[e3 >> 8 & 255]] ^ r2[3][n2[255 & e3]];
      }
    }
    encrypt(t2) {
      return this._crypt(t2, 0);
    }
    decrypt(t2) {
      return this._crypt(t2, 1);
    }
    _precompute() {
      const t2 = this._tables[0], e2 = this._tables[1], n2 = t2[4], s2 = e2[4], r2 = [], a2 = [];
      let i2, c2, o2, l2;
      for (let t3 = 0; 256 > t3; t3++)
        a2[(r2[t3] = t3 << 1 ^ 283 * (t3 >> 7)) ^ t3] = t3;
      for (let h2 = i2 = 0; !n2[h2]; h2 ^= c2 || 1, i2 = a2[i2] || 1) {
        let a3 = i2 ^ i2 << 1 ^ i2 << 2 ^ i2 << 3 ^ i2 << 4;
        a3 = a3 >> 8 ^ 255 & a3 ^ 99, n2[h2] = a3, s2[a3] = h2, l2 = r2[o2 = r2[c2 = r2[h2]]];
        let p2 = 16843009 * l2 ^ 65537 * o2 ^ 257 * c2 ^ 16843008 * h2, d2 = 257 * r2[a3] ^ 16843008 * a3;
        for (let n3 = 0; 4 > n3; n3++)
          t2[n3][h2] = d2 = d2 << 24 ^ d2 >>> 8, e2[n3][a3] = p2 = p2 << 24 ^ p2 >>> 8;
      }
      for (let n3 = 0; 5 > n3; n3++)
        t2[n3] = t2[n3].slice(0), e2[n3] = e2[n3].slice(0);
    }
    _crypt(t2, e2) {
      if (4 !== t2.length)
        throw new s("invalid aes block size");
      const n2 = this._key[e2], r2 = n2.length / 4 - 2, a2 = [0, 0, 0, 0], i2 = this._tables[e2], c2 = i2[0], o2 = i2[1], l2 = i2[2], h2 = i2[3], p2 = i2[4];
      let d2, u2, f2, g2 = t2[0] ^ n2[0], w2 = t2[e2 ? 3 : 1] ^ n2[1], y2 = t2[2] ^ n2[2], _2 = t2[e2 ? 1 : 3] ^ n2[3], m2 = 4;
      for (let t3 = 0; r2 > t3; t3++)
        d2 = c2[g2 >>> 24] ^ o2[w2 >> 16 & 255] ^ l2[y2 >> 8 & 255] ^ h2[255 & _2] ^ n2[m2], u2 = c2[w2 >>> 24] ^ o2[y2 >> 16 & 255] ^ l2[_2 >> 8 & 255] ^ h2[255 & g2] ^ n2[m2 + 1], f2 = c2[y2 >>> 24] ^ o2[_2 >> 16 & 255] ^ l2[g2 >> 8 & 255] ^ h2[255 & w2] ^ n2[m2 + 2], _2 = c2[_2 >>> 24] ^ o2[g2 >> 16 & 255] ^ l2[w2 >> 8 & 255] ^ h2[255 & y2] ^ n2[m2 + 3], m2 += 4, g2 = d2, w2 = u2, y2 = f2;
      for (let t3 = 0; 4 > t3; t3++)
        a2[e2 ? 3 & -t3 : t3] = p2[g2 >>> 24] << 24 ^ p2[w2 >> 16 & 255] << 16 ^ p2[y2 >> 8 & 255] << 8 ^ p2[255 & _2] ^ n2[m2++], d2 = g2, g2 = w2, w2 = y2, y2 = _2, _2 = d2;
      return a2;
    }
  }, R = class {
    constructor(t2, e2) {
      this._prf = t2, this._initIv = e2, this._iv = e2;
    }
    reset() {
      this._iv = this._initIv;
    }
    update(t2) {
      return this.calculate(this._prf, t2, this._iv);
    }
    incWord(t2) {
      if (255 == (t2 >> 24 & 255)) {
        let e2 = t2 >> 16 & 255, n2 = t2 >> 8 & 255, s2 = 255 & t2;
        255 === e2 ? (e2 = 0, 255 === n2 ? (n2 = 0, 255 === s2 ? s2 = 0 : ++s2) : ++n2) : ++e2, t2 = 0, t2 += e2 << 16, t2 += n2 << 8, t2 += s2;
      } else
        t2 += 1 << 24;
      return t2;
    }
    incCounter(t2) {
      0 === (t2[0] = this.incWord(t2[0])) && (t2[1] = this.incWord(t2[1]));
    }
    calculate(t2, e2, n2) {
      let s2;
      if (!(s2 = e2.length))
        return [];
      const r2 = f.bitLength(e2);
      for (let r3 = 0; s2 > r3; r3 += 4) {
        this.incCounter(n2);
        const s3 = t2.encrypt(n2);
        e2[r3] ^= s3[0], e2[r3 + 1] ^= s3[1], e2[r3 + 2] ^= s3[2], e2[r3 + 3] ^= s3[3];
      }
      return f.clamp(e2, r2);
    }
  }, W = _.hmacSha1;
  class T {
    constructor(t2, n2, s2) {
      e.assign(this, { password: t2, signed: n2, strength: s2 - 1, pendingInput: new r(0) });
    }
    async append(e2) {
      const n2 = this;
      if (n2.password) {
        const r2 = E(e2, 0, S[n2.strength] + 2);
        await (async (t2, e3, n3) => {
          await L(t2, n3, E(e3, 0, S[t2.strength]));
          const r3 = E(e3, S[t2.strength]), a2 = t2.keys.passwordVerification;
          if (a2[0] != r3[0] || a2[1] != r3[1])
            throw new s(m);
        })(n2, r2, n2.password), n2.password = null, n2.aesCtrGladman = new R(new A(n2.keys.key), t.from(D)), n2.hmac = new W(n2.keys.authentication), e2 = E(e2, S[n2.strength] + 2);
      }
      return G(n2, e2, new r(e2.length - I - (e2.length - I) % b), 0, I, true);
    }
    flush() {
      const t2 = this, e2 = t2.pendingInput, n2 = E(e2, 0, e2.length - I), s2 = E(e2, e2.length - I);
      let a2 = new r(0);
      if (n2.length) {
        const e3 = K.toBits(n2);
        t2.hmac.update(e3);
        const s3 = t2.aesCtrGladman.update(e3);
        a2 = K.fromBits(s3);
      }
      let i2 = true;
      if (t2.signed) {
        const e3 = E(K.fromBits(t2.hmac.digest()), 0, I);
        for (let t3 = 0; I > t3; t3++)
          e3[t3] != s2[t3] && (i2 = false);
      }
      return { valid: i2, data: a2 };
    }
  }
  class U {
    constructor(t2, n2) {
      e.assign(this, { password: t2, strength: n2 - 1, pendingInput: new r(0) });
    }
    async append(e2) {
      const n2 = this;
      let s2 = new r(0);
      n2.password && (s2 = await (async (t2, e3) => {
        const n3 = (s3 = new r(S[t2.strength]), V && "function" == typeof h.getRandomValues ? h.getRandomValues(s3) : y.getRandomValues(s3));
        var s3;
        return await L(t2, e3, n3), P(n3, t2.keys.passwordVerification);
      })(n2, n2.password), n2.password = null, n2.aesCtrGladman = new R(new A(n2.keys.key), t.from(D)), n2.hmac = new W(n2.keys.authentication));
      const a2 = new r(s2.length + e2.length - e2.length % b);
      return a2.set(s2, 0), G(n2, e2, a2, s2.length, 0);
    }
    flush() {
      const t2 = this;
      let e2 = new r(0);
      if (t2.pendingInput.length) {
        const n3 = t2.aesCtrGladman.update(K.toBits(t2.pendingInput));
        t2.hmac.update(n3), e2 = K.fromBits(n3);
      }
      const n2 = E(K.fromBits(t2.hmac.digest()), 0, I);
      return { data: P(e2, n2), signature: n2 };
    }
  }
  function G(t2, e2, n2, s2, a2, i2) {
    const c2 = e2.length - a2;
    let o2;
    for (t2.pendingInput.length && (e2 = P(t2.pendingInput, e2), n2 = ((t3, e3) => {
      if (e3 && e3 > t3.length) {
        const n3 = t3;
        (t3 = new r(e3)).set(n3, 0);
      }
      return t3;
    })(n2, c2 - c2 % b)), o2 = 0; c2 - b >= o2; o2 += b) {
      const r2 = K.toBits(E(e2, o2, o2 + b));
      i2 && t2.hmac.update(r2);
      const a3 = t2.aesCtrGladman.update(r2);
      i2 || t2.hmac.update(a3), n2.set(K.fromBits(a3), o2 + s2);
    }
    return t2.pendingInput = E(e2, o2), n2;
  }
  async function L(t2, n2, s2) {
    const a2 = ((t3) => {
      if (void 0 === l) {
        const e2 = new r((t3 = unescape(encodeURIComponent(t3))).length);
        for (let n3 = 0; n3 < e2.length; n3++)
          e2[n3] = t3.charCodeAt(n3);
        return e2;
      }
      return new l().encode(t3);
    })(n2), i2 = await ((t3, e2, n3, s3, r2) => V && H && "function" == typeof h.subtle.importKey ? h.subtle.importKey("raw", e2, n3, false, r2) : _.importKey(e2))(0, a2, v, 0, C), c2 = await (async (t3, e2, n3) => V && H && "function" == typeof h.subtle.deriveBits ? await h.subtle.deriveBits(t3, e2, n3) : _.pbkdf2(e2, t3.salt, z.iterations, n3))(e.assign({ salt: s2 }, z), i2, 8 * (2 * B[t2.strength] + 2)), o2 = new r(c2);
    t2.keys = { key: K.toBits(E(o2, 0, B[t2.strength])), authentication: K.toBits(E(o2, B[t2.strength], 2 * B[t2.strength])), passwordVerification: E(o2, 2 * B[t2.strength]) };
  }
  function P(t2, e2) {
    let n2 = t2;
    return t2.length + e2.length && (n2 = new r(t2.length + e2.length), n2.set(t2, 0), n2.set(e2, t2.length)), n2;
  }
  function E(t2, e2, n2) {
    return t2.subarray(e2, n2);
  }
  class M {
    constructor(t2, n2) {
      e.assign(this, { password: t2, passwordVerification: n2 }), O(this, t2);
    }
    append(t2) {
      const e2 = this;
      if (e2.password) {
        const n2 = x(e2, t2.subarray(0, 12));
        if (e2.password = null, n2[11] != e2.passwordVerification)
          throw new s(m);
        t2 = t2.subarray(12);
      }
      return x(e2, t2);
    }
    flush() {
      return { valid: true, data: new r(0) };
    }
  }
  class j {
    constructor(t2, n2) {
      e.assign(this, { password: t2, passwordVerification: n2 }), O(this, t2);
    }
    append(t2) {
      const e2 = this;
      let n2, s2;
      if (e2.password) {
        e2.password = null;
        const a2 = h.getRandomValues(new r(12));
        a2[11] = e2.passwordVerification, n2 = new r(t2.length + a2.length), n2.set(F(e2, a2), 0), s2 = 12;
      } else
        n2 = new r(t2.length), s2 = 0;
      return n2.set(F(e2, t2), s2), n2;
    }
    flush() {
      return { data: new r(0) };
    }
  }
  function x(t2, e2) {
    const n2 = new r(e2.length);
    for (let s2 = 0; s2 < e2.length; s2++)
      n2[s2] = J(t2) ^ e2[s2], q(t2, n2[s2]);
    return n2;
  }
  function F(t2, e2) {
    const n2 = new r(e2.length);
    for (let s2 = 0; s2 < e2.length; s2++)
      n2[s2] = J(t2) ^ e2[s2], q(t2, e2[s2]);
    return n2;
  }
  function O(t2, e2) {
    t2.keys = [305419896, 591751049, 878082192], t2.crcKey0 = new u(t2.keys[0]), t2.crcKey2 = new u(t2.keys[2]);
    for (let n2 = 0; n2 < e2.length; n2++)
      q(t2, e2.charCodeAt(n2));
  }
  function q(t2, e2) {
    t2.crcKey0.append([e2]), t2.keys[0] = ~t2.crcKey0.get(), t2.keys[1] = Q(t2.keys[1] + N(t2.keys[0])), t2.keys[1] = Q(n.imul(t2.keys[1], 134775813) + 1), t2.crcKey2.append([t2.keys[1] >>> 24]), t2.keys[2] = ~t2.crcKey2.get();
  }
  function J(t2) {
    const e2 = 2 | t2.keys[2];
    return N(n.imul(e2, 1 ^ e2) >>> 8);
  }
  function N(t2) {
    return 255 & t2;
  }
  function Q(t2) {
    return 4294967295 & t2;
  }
  const X = "deflate", Y = "inflate", Z = "Invalid signature";
  class $ {
    constructor(t2, { signature: n2, password: s2, signed: r2, compressed: a2, zipCrypto: i2, passwordVerification: c2, encryptionStrength: o2 }, { chunkSize: l2 }) {
      const h2 = !!s2;
      e.assign(this, { signature: n2, encrypted: h2, signed: r2, compressed: a2, inflate: a2 && new t2({ chunkSize: l2 }), crc32: r2 && new u(), zipCrypto: i2, decrypt: h2 && i2 ? new M(s2, c2) : new T(s2, r2, o2) });
    }
    async append(t2) {
      const e2 = this;
      return e2.encrypted && t2.length && (t2 = await e2.decrypt.append(t2)), e2.compressed && t2.length && (t2 = await e2.inflate.append(t2)), (!e2.encrypted || e2.zipCrypto) && e2.signed && t2.length && e2.crc32.append(t2), t2;
    }
    async flush() {
      const t2 = this;
      let e2, n2 = new r(0);
      if (t2.encrypted) {
        const e3 = t2.decrypt.flush();
        if (!e3.valid)
          throw new s(Z);
        n2 = e3.data;
      }
      if ((!t2.encrypted || t2.zipCrypto) && t2.signed) {
        const n3 = new o(new r(4).buffer);
        if (e2 = t2.crc32.get(), n3.setUint32(0, e2), t2.signature != n3.getUint32(0, false))
          throw new s(Z);
      }
      return t2.compressed && (n2 = await t2.inflate.append(n2) || new r(0), await t2.inflate.flush()), { data: n2, signature: e2 };
    }
  }
  class tt {
    constructor(t2, { encrypted: n2, signed: s2, compressed: r2, level: a2, zipCrypto: i2, password: c2, passwordVerification: o2, encryptionStrength: l2 }, { chunkSize: h2 }) {
      e.assign(this, { encrypted: n2, signed: s2, compressed: r2, deflate: r2 && new t2({ level: a2 || 5, chunkSize: h2 }), crc32: s2 && new u(), zipCrypto: i2, encrypt: n2 && i2 ? new j(c2, o2) : new U(c2, l2) });
    }
    async append(t2) {
      const e2 = this;
      let n2 = t2;
      return e2.compressed && t2.length && (n2 = await e2.deflate.append(t2)), e2.encrypted && n2.length && (n2 = await e2.encrypt.append(n2)), (!e2.encrypted || e2.zipCrypto) && e2.signed && t2.length && e2.crc32.append(t2), n2;
    }
    async flush() {
      const t2 = this;
      let e2, n2 = new r(0);
      if (t2.compressed && (n2 = await t2.deflate.flush() || new r(0)), t2.encrypted) {
        n2 = await t2.encrypt.append(n2);
        const s2 = t2.encrypt.flush();
        e2 = s2.signature;
        const a2 = new r(n2.length + s2.data.length);
        a2.set(n2, 0), a2.set(s2.data, n2.length), n2 = a2;
      }
      return t2.encrypted && !t2.zipCrypto || !t2.signed || (e2 = t2.crc32.get()), { data: n2, signature: e2 };
    }
  }
  const et = { init(t2) {
    t2.scripts && t2.scripts.length && importScripts.apply(void 0, t2.scripts);
    const e2 = t2.options;
    let n2;
    self.initCodec && self.initCodec(), e2.codecType.startsWith(X) ? n2 = self.Deflate : e2.codecType.startsWith(Y) && (n2 = self.Inflate), nt = ((t3, e3, n3) => e3.codecType.startsWith(X) ? new tt(t3, e3, n3) : e3.codecType.startsWith(Y) ? new $(t3, e3, n3) : void 0)(n2, e2, t2.config);
  }, append: async (t2) => ({ data: await nt.append(t2.data) }), flush: () => nt.flush() };
  let nt;
  function st(t2, n2, s2) {
    return class {
      constructor(a3) {
        const i2 = this;
        i2.codec = new t2(e.assign({}, n2, a3)), s2(i2.codec, (t3) => {
          if (i2.pendingData) {
            const e2 = i2.pendingData;
            i2.pendingData = new r(e2.length + t3.length), i2.pendingData.set(e2, 0), i2.pendingData.set(t3, e2.length);
          } else
            i2.pendingData = new r(t3);
        });
      }
      append(t3) {
        return this.codec.push(t3), a2(this);
      }
      flush() {
        return this.codec.push(new r(0), true), a2(this);
      }
    };
    function a2(t3) {
      if (t3.pendingData) {
        const e2 = t3.pendingData;
        return t3.pendingData = null, e2;
      }
      return new r(0);
    }
  }
  addEventListener("message", async (t2) => {
    const e2 = t2.data, n2 = e2.type, s2 = et[n2];
    if (s2)
      try {
        e2.data && (e2.data = new r(e2.data));
        const t3 = await s2(e2) || {};
        if (t3.type = n2, t3.data)
          try {
            t3.data = t3.data.buffer, p(t3, [t3.data]);
          } catch (e3) {
            p(t3);
          }
        else
          p(t3);
      } catch (t3) {
        p({ type: n2, error: { message: t3.message, stack: t3.stack } });
      }
  }), self.initCodec = () => {
    const { Deflate: t2, Inflate: e2 } = ((t3, e3 = {}, n2) => ({ Deflate: st(t3.Deflate, e3.deflate, n2), Inflate: st(t3.Inflate, e3.inflate, n2) }))(pako, { deflate: { raw: true }, inflate: { raw: true } }, (t3, e3) => t3.onData = e3);
    self.Deflate = t2, self.Inflate = e2;
  };
}();
