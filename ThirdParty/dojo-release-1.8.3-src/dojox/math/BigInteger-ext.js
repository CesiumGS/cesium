// AMD-ID "dojox/math/BigInteger-ext"
define(["dojo", "dojox", "dojox/math/BigInteger"], function(dojo, dojox) {
	dojo.experimental("dojox.math.BigInteger-ext");

// Contributed under CLA by Tom Wu

// Extended JavaScript BN functions, required for RSA private ops.
	var BigInteger = dojox.math.BigInteger,
		nbi = BigInteger._nbi, nbv = BigInteger._nbv,
		nbits = BigInteger._nbits,
		Montgomery = BigInteger._Montgomery;

	// (public)
	function bnClone() { var r = nbi(); this._copyTo(r); return r; }

	// (public) return value as integer
	function bnIntValue() {
	  if(this.s < 0) {
		if(this.t == 1) return this[0]-this._DV;
		else if(this.t == 0) return -1;
	  }
	  else if(this.t == 1) return this[0];
	  else if(this.t == 0) return 0;
	  // assumes 16 < DB < 32
	  return ((this[1]&((1<<(32-this._DB))-1))<<this._DB)|this[0];
	}

	// (public) return value as byte
	function bnByteValue() { return (this.t==0)?this.s:(this[0]<<24)>>24; }

	// (public) return value as short (assumes DB>=16)
	function bnShortValue() { return (this.t==0)?this.s:(this[0]<<16)>>16; }

	// (protected) return x s.t. r^x < DV
	function bnpChunkSize(r) { return Math.floor(Math.LN2*this._DB/Math.log(r)); }

	// (public) 0 if this == 0, 1 if this > 0
	function bnSigNum() {
	  if(this.s < 0) return -1;
	  else if(this.t <= 0 || (this.t == 1 && this[0] <= 0)) return 0;
	  else return 1;
	}

	// (protected) convert to radix string
	function bnpToRadix(b) {
	  if(b == null) b = 10;
	  if(this.signum() == 0 || b < 2 || b > 36) return "0";
	  var cs = this._chunkSize(b);
	  var a = Math.pow(b,cs);
	  var d = nbv(a), y = nbi(), z = nbi(), r = "";
	  this._divRemTo(d,y,z);
	  while(y.signum() > 0) {
		r = (a+z.intValue()).toString(b).substr(1) + r;
		y._divRemTo(d,y,z);
	  }
	  return z.intValue().toString(b) + r;
	}

	// (protected) convert from radix string
	function bnpFromRadix(s,b) {
	  this._fromInt(0);
	  if(b == null) b = 10;
	  var cs = this._chunkSize(b);
	  var d = Math.pow(b,cs), mi = false, j = 0, w = 0;
	  for(var i = 0; i < s.length; ++i) {
		var x = intAt(s,i);
		if(x < 0) {
		  if(s.charAt(i) == "-" && this.signum() == 0) mi = true;
		  continue;
		}
		w = b*w+x;
		if(++j >= cs) {
		  this._dMultiply(d);
		  this._dAddOffset(w,0);
		  j = 0;
		  w = 0;
		}
	  }
	  if(j > 0) {
		this._dMultiply(Math.pow(b,j));
		this._dAddOffset(w,0);
	  }
	  if(mi) BigInteger.ZERO._subTo(this,this);
	}

	// (protected) alternate constructor
	function bnpFromNumber(a,b,c) {
	  if("number" == typeof b) {
		// new BigInteger(int,int,RNG)
		if(a < 2) this._fromInt(1);
		else {
		  this._fromNumber(a,c);
		  if(!this.testBit(a-1))	// force MSB set
			this._bitwiseTo(BigInteger.ONE.shiftLeft(a-1),op_or,this);
		  if(this._isEven()) this._dAddOffset(1,0); // force odd
		  while(!this.isProbablePrime(b)) {
			this._dAddOffset(2,0);
			if(this.bitLength() > a) this._subTo(BigInteger.ONE.shiftLeft(a-1),this);
		  }
		}
	  }
	  else {
		// new BigInteger(int,RNG)
		var x = [], t = a&7;
		x.length = (a>>3)+1;
		b.nextBytes(x);
		if(t > 0) x[0] &= ((1<<t)-1); else x[0] = 0;
		this._fromString(x,256);
	  }
	}

	// (public) convert to bigendian byte array
	function bnToByteArray() {
	  var i = this.t, r = [];
	  r[0] = this.s;
	  var p = this._DB-(i*this._DB)%8, d, k = 0;
	  if(i-- > 0) {
		if(p < this._DB && (d = this[i]>>p) != (this.s&this._DM)>>p)
		  r[k++] = d|(this.s<<(this._DB-p));
		while(i >= 0) {
		  if(p < 8) {
			d = (this[i]&((1<<p)-1))<<(8-p);
			d |= this[--i]>>(p+=this._DB-8);
		  }
		  else {
			d = (this[i]>>(p-=8))&0xff;
			if(p <= 0) { p += this._DB; --i; }
		  }
		  if((d&0x80) != 0) d |= -256;
		  if(k == 0 && (this.s&0x80) != (d&0x80)) ++k;
		  if(k > 0 || d != this.s) r[k++] = d;
		}
	  }
	  return r;
	}

	function bnEquals(a) { return(this.compareTo(a)==0); }
	function bnMin(a) { return(this.compareTo(a)<0)?this:a; }
	function bnMax(a) { return(this.compareTo(a)>0)?this:a; }

	// (protected) r = this op a (bitwise)
	function bnpBitwiseTo(a,op,r) {
	  var i, f, m = Math.min(a.t,this.t);
	  for(i = 0; i < m; ++i) r[i] = op(this[i],a[i]);
	  if(a.t < this.t) {
		f = a.s&this._DM;
		for(i = m; i < this.t; ++i) r[i] = op(this[i],f);
		r.t = this.t;
	  }
	  else {
		f = this.s&this._DM;
		for(i = m; i < a.t; ++i) r[i] = op(f,a[i]);
		r.t = a.t;
	  }
	  r.s = op(this.s,a.s);
	  r._clamp();
	}

	// (public) this & a
	function op_and(x,y) { return x&y; }
	function bnAnd(a) { var r = nbi(); this._bitwiseTo(a,op_and,r); return r; }

	// (public) this | a
	function op_or(x,y) { return x|y; }
	function bnOr(a) { var r = nbi(); this._bitwiseTo(a,op_or,r); return r; }

	// (public) this ^ a
	function op_xor(x,y) { return x^y; }
	function bnXor(a) { var r = nbi(); this._bitwiseTo(a,op_xor,r); return r; }

	// (public) this & ~a
	function op_andnot(x,y) { return x&~y; }
	function bnAndNot(a) { var r = nbi(); this._bitwiseTo(a,op_andnot,r); return r; }

	// (public) ~this
	function bnNot() {
	  var r = nbi();
	  for(var i = 0; i < this.t; ++i) r[i] = this._DM&~this[i];
	  r.t = this.t;
	  r.s = ~this.s;
	  return r;
	}

	// (public) this << n
	function bnShiftLeft(n) {
	  var r = nbi();
	  if(n < 0) this._rShiftTo(-n,r); else this._lShiftTo(n,r);
	  return r;
	}

	// (public) this >> n
	function bnShiftRight(n) {
	  var r = nbi();
	  if(n < 0) this._lShiftTo(-n,r); else this._rShiftTo(n,r);
	  return r;
	}

	// return index of lowest 1-bit in x, x < 2^31
	function lbit(x) {
	  if(x == 0) return -1;
	  var r = 0;
	  if((x&0xffff) == 0) { x >>= 16; r += 16; }
	  if((x&0xff) == 0) { x >>= 8; r += 8; }
	  if((x&0xf) == 0) { x >>= 4; r += 4; }
	  if((x&3) == 0) { x >>= 2; r += 2; }
	  if((x&1) == 0) ++r;
	  return r;
	}

	// (public) returns index of lowest 1-bit (or -1 if none)
	function bnGetLowestSetBit() {
	  for(var i = 0; i < this.t; ++i)
		if(this[i] != 0) return i*this._DB+lbit(this[i]);
	  if(this.s < 0) return this.t*this._DB;
	  return -1;
	}

	// return number of 1 bits in x
	function cbit(x) {
	  var r = 0;
	  while(x != 0) { x &= x-1; ++r; }
	  return r;
	}

	// (public) return number of set bits
	function bnBitCount() {
	  var r = 0, x = this.s&this._DM;
	  for(var i = 0; i < this.t; ++i) r += cbit(this[i]^x);
	  return r;
	}

	// (public) true iff nth bit is set
	function bnTestBit(n) {
	  var j = Math.floor(n/this._DB);
	  if(j >= this.t) return(this.s!=0);
	  return((this[j]&(1<<(n%this._DB)))!=0);
	}

	// (protected) this op (1<<n)
	function bnpChangeBit(n,op) {
	  var r = BigInteger.ONE.shiftLeft(n);
	  this._bitwiseTo(r,op,r);
	  return r;
	}

	// (public) this | (1<<n)
	function bnSetBit(n) { return this._changeBit(n,op_or); }

	// (public) this & ~(1<<n)
	function bnClearBit(n) { return this._changeBit(n,op_andnot); }

	// (public) this ^ (1<<n)
	function bnFlipBit(n) { return this._changeBit(n,op_xor); }

	// (protected) r = this + a
	function bnpAddTo(a,r) {
	  var i = 0, c = 0, m = Math.min(a.t,this.t);
	  while(i < m) {
		c += this[i]+a[i];
		r[i++] = c&this._DM;
		c >>= this._DB;
	  }
	  if(a.t < this.t) {
		c += a.s;
		while(i < this.t) {
		  c += this[i];
		  r[i++] = c&this._DM;
		  c >>= this._DB;
		}
		c += this.s;
	  }
	  else {
		c += this.s;
		while(i < a.t) {
		  c += a[i];
		  r[i++] = c&this._DM;
		  c >>= this._DB;
		}
		c += a.s;
	  }
	  r.s = (c<0)?-1:0;
	  if(c > 0) r[i++] = c;
	  else if(c < -1) r[i++] = this._DV+c;
	  r.t = i;
	  r._clamp();
	}

	// (public) this + a
	function bnAdd(a) { var r = nbi(); this._addTo(a,r); return r; }

	// (public) this - a
	function bnSubtract(a) { var r = nbi(); this._subTo(a,r); return r; }

	// (public) this * a
	function bnMultiply(a) { var r = nbi(); this._multiplyTo(a,r); return r; }

	// (public) this / a
	function bnDivide(a) { var r = nbi(); this._divRemTo(a,r,null); return r; }

	// (public) this % a
	function bnRemainder(a) { var r = nbi(); this._divRemTo(a,null,r); return r; }

	// (public) [this/a,this%a]
	function bnDivideAndRemainder(a) {
	  var q = nbi(), r = nbi();
	  this._divRemTo(a,q,r);
	  return [q, r];
	}

	// (protected) this *= n, this >= 0, 1 < n < DV
	function bnpDMultiply(n) {
	  this[this.t] = this.am(0,n-1,this,0,0,this.t);
	  ++this.t;
	  this._clamp();
	}

	// (protected) this += n << w words, this >= 0
	function bnpDAddOffset(n,w) {
	  while(this.t <= w) this[this.t++] = 0;
	  this[w] += n;
	  while(this[w] >= this._DV) {
		this[w] -= this._DV;
		if(++w >= this.t) this[this.t++] = 0;
		++this[w];
	  }
	}

	// A "null" reducer
	function NullExp() {}
	function nNop(x) { return x; }
	function nMulTo(x,y,r) { x._multiplyTo(y,r); }
	function nSqrTo(x,r) { x._squareTo(r); }

	NullExp.prototype.convert = nNop;
	NullExp.prototype.revert = nNop;
	NullExp.prototype.mulTo = nMulTo;
	NullExp.prototype.sqrTo = nSqrTo;

	// (public) this^e
	function bnPow(e) { return this._exp(e,new NullExp()); }

	// (protected) r = lower n words of "this * a", a.t <= n
	// "this" should be the larger one if appropriate.
	function bnpMultiplyLowerTo(a,n,r) {
	  var i = Math.min(this.t+a.t,n);
	  r.s = 0; // assumes a,this >= 0
	  r.t = i;
	  while(i > 0) r[--i] = 0;
	  var j;
	  for(j = r.t-this.t; i < j; ++i) r[i+this.t] = this.am(0,a[i],r,i,0,this.t);
	  for(j = Math.min(a.t,n); i < j; ++i) this.am(0,a[i],r,i,0,n-i);
	  r._clamp();
	}

	// (protected) r = "this * a" without lower n words, n > 0
	// "this" should be the larger one if appropriate.
	function bnpMultiplyUpperTo(a,n,r) {
	  --n;
	  var i = r.t = this.t+a.t-n;
	  r.s = 0; // assumes a,this >= 0
	  while(--i >= 0) r[i] = 0;
	  for(i = Math.max(n-this.t,0); i < a.t; ++i)
		r[this.t+i-n] = this.am(n-i,a[i],r,0,0,this.t+i-n);
	  r._clamp();
	  r._drShiftTo(1,r);
	}

	// Barrett modular reduction
	function Barrett(m) {
	  // setup Barrett
	  this.r2 = nbi();
	  this.q3 = nbi();
	  BigInteger.ONE._dlShiftTo(2*m.t,this.r2);
	  this.mu = this.r2.divide(m);
	  this.m = m;
	}

	function barrettConvert(x) {
	  if(x.s < 0 || x.t > 2*this.m.t) return x.mod(this.m);
	  else if(x.compareTo(this.m) < 0) return x;
	  else { var r = nbi(); x._copyTo(r); this.reduce(r); return r; }
	}

	function barrettRevert(x) { return x; }

	// x = x mod m (HAC 14.42)
	function barrettReduce(x) {
	  x._drShiftTo(this.m.t-1,this.r2);
	  if(x.t > this.m.t+1) { x.t = this.m.t+1; x._clamp(); }
	  this.mu._multiplyUpperTo(this.r2,this.m.t+1,this.q3);
	  this.m._multiplyLowerTo(this.q3,this.m.t+1,this.r2);
	  while(x.compareTo(this.r2) < 0) x._dAddOffset(1,this.m.t+1);
	  x._subTo(this.r2,x);
	  while(x.compareTo(this.m) >= 0) x._subTo(this.m,x);
	}

	// r = x^2 mod m; x != r
	function barrettSqrTo(x,r) { x._squareTo(r); this.reduce(r); }

	// r = x*y mod m; x,y != r
	function barrettMulTo(x,y,r) { x._multiplyTo(y,r); this.reduce(r); }

	Barrett.prototype.convert = barrettConvert;
	Barrett.prototype.revert = barrettRevert;
	Barrett.prototype.reduce = barrettReduce;
	Barrett.prototype.mulTo = barrettMulTo;
	Barrett.prototype.sqrTo = barrettSqrTo;

	// (public) this^e % m (HAC 14.85)
	function bnModPow(e,m) {
	  var i = e.bitLength(), k, r = nbv(1), z;
	  if(i <= 0) return r;
	  else if(i < 18) k = 1;
	  else if(i < 48) k = 3;
	  else if(i < 144) k = 4;
	  else if(i < 768) k = 5;
	  else k = 6;
	  if(i < 8)
		z = new Classic(m);
	  else if(m._isEven())
		z = new Barrett(m);
	  else
		z = new Montgomery(m);

	  // precomputation
	  var g = [], n = 3, k1 = k-1, km = (1<<k)-1;
	  g[1] = z.convert(this);
	  if(k > 1) {
		var g2 = nbi();
		z.sqrTo(g[1],g2);
		while(n <= km) {
		  g[n] = nbi();
		  z.mulTo(g2,g[n-2],g[n]);
		  n += 2;
		}
	  }

	  var j = e.t-1, w, is1 = true, r2 = nbi(), t;
	  i = nbits(e[j])-1;
	  while(j >= 0) {
		if(i >= k1) w = (e[j]>>(i-k1))&km;
		else {
		  w = (e[j]&((1<<(i+1))-1))<<(k1-i);
		  if(j > 0) w |= e[j-1]>>(this._DB+i-k1);
		}

		n = k;
		while((w&1) == 0) { w >>= 1; --n; }
		if((i -= n) < 0) { i += this._DB; --j; }
		if(is1) {	// ret == 1, don't bother squaring or multiplying it
		  g[w]._copyTo(r);
		  is1 = false;
		}
		else {
		  while(n > 1) { z.sqrTo(r,r2); z.sqrTo(r2,r); n -= 2; }
		  if(n > 0) z.sqrTo(r,r2); else { t = r; r = r2; r2 = t; }
		  z.mulTo(r2,g[w],r);
		}

		while(j >= 0 && (e[j]&(1<<i)) == 0) {
		  z.sqrTo(r,r2); t = r; r = r2; r2 = t;
		  if(--i < 0) { i = this._DB-1; --j; }
		}
	  }
	  return z.revert(r);
	}

	// (public) gcd(this,a) (HAC 14.54)
	function bnGCD(a) {
	  var x = (this.s<0)?this.negate():this.clone();
	  var y = (a.s<0)?a.negate():a.clone();
	  if(x.compareTo(y) < 0) { var t = x; x = y; y = t; }
	  var i = x.getLowestSetBit(), g = y.getLowestSetBit();
	  if(g < 0) return x;
	  if(i < g) g = i;
	  if(g > 0) {
		x._rShiftTo(g,x);
		y._rShiftTo(g,y);
	  }
	  while(x.signum() > 0) {
		if((i = x.getLowestSetBit()) > 0) x._rShiftTo(i,x);
		if((i = y.getLowestSetBit()) > 0) y._rShiftTo(i,y);
		if(x.compareTo(y) >= 0) {
		  x._subTo(y,x);
		  x._rShiftTo(1,x);
		}
		else {
		  y._subTo(x,y);
		  y._rShiftTo(1,y);
		}
	  }
	  if(g > 0) y._lShiftTo(g,y);
	  return y;
	}

	// (protected) this % n, n < 2^26
	function bnpModInt(n) {
	  if(n <= 0) return 0;
	  var d = this._DV%n, r = (this.s<0)?n-1:0;
	  if(this.t > 0)
		if(d == 0) r = this[0]%n;
		else for(var i = this.t-1; i >= 0; --i) r = (d*r+this[i])%n;
	  return r;
	}

	// (public) 1/this % m (HAC 14.61)
	function bnModInverse(m) {
	  var ac = m._isEven();
	  if((this._isEven() && ac) || m.signum() == 0) return BigInteger.ZERO;
	  var u = m.clone(), v = this.clone();
	  var a = nbv(1), b = nbv(0), c = nbv(0), d = nbv(1);
	  while(u.signum() != 0) {
		while(u._isEven()) {
		  u._rShiftTo(1,u);
		  if(ac) {
			if(!a._isEven() || !b._isEven()) { a._addTo(this,a); b._subTo(m,b); }
			a._rShiftTo(1,a);
		  }
		  else if(!b._isEven()) b._subTo(m,b);
		  b._rShiftTo(1,b);
		}
		while(v._isEven()) {
		  v._rShiftTo(1,v);
		  if(ac) {
			if(!c._isEven() || !d._isEven()) { c._addTo(this,c); d._subTo(m,d); }
			c._rShiftTo(1,c);
		  }
		  else if(!d._isEven()) d._subTo(m,d);
		  d._rShiftTo(1,d);
		}
		if(u.compareTo(v) >= 0) {
		  u._subTo(v,u);
		  if(ac) a._subTo(c,a);
		  b._subTo(d,b);
		}
		else {
		  v._subTo(u,v);
		  if(ac) c._subTo(a,c);
		  d._subTo(b,d);
		}
	  }
	  if(v.compareTo(BigInteger.ONE) != 0) return BigInteger.ZERO;
	  if(d.compareTo(m) >= 0) return d.subtract(m);
	  if(d.signum() < 0) d._addTo(m,d); else return d;
	  if(d.signum() < 0) return d.add(m); else return d;
	}

	var lowprimes = [2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53,59,61,67,71,73,79,83,89,97,101,103,107,109,113,127,131,137,139,149,151,157,163,167,173,179,181,191,193,197,199,211,223,227,229,233,239,241,251,257,263,269,271,277,281,283,293,307,311,313,317,331,337,347,349,353,359,367,373,379,383,389,397,401,409,419,421,431,433,439,443,449,457,461,463,467,479,487,491,499,503,509];
	var lplim = (1<<26)/lowprimes[lowprimes.length-1];

	// (public) test primality with certainty >= 1-.5^t
	function bnIsProbablePrime(t) {
	  var i, x = this.abs();
	  if(x.t == 1 && x[0] <= lowprimes[lowprimes.length-1]) {
		for(i = 0; i < lowprimes.length; ++i)
		  if(x[0] == lowprimes[i]) return true;
		return false;
	  }
	  if(x._isEven()) return false;
	  i = 1;
	  while(i < lowprimes.length) {
		var m = lowprimes[i], j = i+1;
		while(j < lowprimes.length && m < lplim) m *= lowprimes[j++];
		m = x._modInt(m);
		while(i < j) if(m%lowprimes[i++] == 0) return false;
	  }
	  return x._millerRabin(t);
	}

	// (protected) true if probably prime (HAC 4.24, Miller-Rabin)
	function bnpMillerRabin(t) {
	  var n1 = this.subtract(BigInteger.ONE);
	  var k = n1.getLowestSetBit();
	  if(k <= 0) return false;
	  var r = n1.shiftRight(k);
	  t = (t+1)>>1;
	  if(t > lowprimes.length) t = lowprimes.length;
	  var a = nbi();
	  for(var i = 0; i < t; ++i) {
		a._fromInt(lowprimes[i]);
		var y = a.modPow(r,this);
		if(y.compareTo(BigInteger.ONE) != 0 && y.compareTo(n1) != 0) {
		  var j = 1;
		  while(j++ < k && y.compareTo(n1) != 0) {
			y = y.modPowInt(2,this);
			if(y.compareTo(BigInteger.ONE) == 0) return false;
		  }
		  if(y.compareTo(n1) != 0) return false;
		}
	  }
	  return true;
	}

	dojo.extend(BigInteger, {
		// protected
		_chunkSize:			bnpChunkSize,
		_toRadix:			bnpToRadix,
		_fromRadix:			bnpFromRadix,
		_fromNumber:		bnpFromNumber,
		_bitwiseTo:			bnpBitwiseTo,
		_changeBit:			bnpChangeBit,
		_addTo:				bnpAddTo,
		_dMultiply:			bnpDMultiply,
		_dAddOffset:		bnpDAddOffset,
		_multiplyLowerTo:	bnpMultiplyLowerTo,
		_multiplyUpperTo:	bnpMultiplyUpperTo,
		_modInt:			bnpModInt,
		_millerRabin:		bnpMillerRabin,

		// public
		clone:				bnClone,
		intValue:			bnIntValue,
		byteValue:			bnByteValue,
		shortValue:			bnShortValue,
		signum:				bnSigNum,
		toByteArray:		bnToByteArray,
		equals:				bnEquals,
		min:				bnMin,
		max:				bnMax,
		and:				bnAnd,
		or:					bnOr,
		xor:				bnXor,
		andNot:				bnAndNot,
		not:				bnNot,
		shiftLeft:			bnShiftLeft,
		shiftRight:			bnShiftRight,
		getLowestSetBit:	bnGetLowestSetBit,
		bitCount:			bnBitCount,
		testBit:			bnTestBit,
		setBit:				bnSetBit,
		clearBit:			bnClearBit,
		flipBit:			bnFlipBit,
		add:				bnAdd,
		subtract:			bnSubtract,
		multiply:			bnMultiply,
		divide:				bnDivide,
		remainder:			bnRemainder,
		divideAndRemainder:	bnDivideAndRemainder,
		modPow:				bnModPow,
		modInverse:			bnModInverse,
		pow:				bnPow,
		gcd:				bnGCD,
		isProbablePrime:	bnIsProbablePrime
	});

	// BigInteger interfaces not implemented in jsbn:

	// BigInteger(int signum, byte[] magnitude)
	// double doubleValue()
	// float floatValue()
	// int hashCode()
	// long longValue()
	// static BigInteger valueOf(long val)

	return dojox.math.BigInteger;
});
