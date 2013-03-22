// AMD-ID "dojox/math/BigInteger"
define(["dojo", "dojox"], function(dojo, dojox) {

	dojo.getObject("math.BigInteger", true, dojox);
	dojo.experimental("dojox.math.BigInteger");

// Contributed under CLA by Tom Wu <tjw@cs.Stanford.EDU>
// See http://www-cs-students.stanford.edu/~tjw/jsbn/ for details.

// Basic JavaScript BN library - subset useful for RSA encryption.
// The API for dojox.math.BigInteger closely resembles that of the java.math.BigInteger class in Java.

	// Bits per digit
	var dbits;

	// JavaScript engine analysis
	var canary = 0xdeadbeefcafe;
	var j_lm = ((canary&0xffffff)==0xefcafe);

	// (public) Constructor
	function BigInteger(a,b,c) {
	  if(a != null)
		if("number" == typeof a) this._fromNumber(a,b,c);
		else if(!b && "string" != typeof a) this._fromString(a,256);
		else this._fromString(a,b);
	}

	// return new, unset BigInteger
	function nbi() { return new BigInteger(null); }

	// am: Compute w_j += (x*this_i), propagate carries,
	// c is initial carry, returns final carry.
	// c < 3*dvalue, x < 2*dvalue, this_i < dvalue
	// We need to select the fastest one that works in this environment.

	// am1: use a single mult and divide to get the high bits,
	// max digit bits should be 26 because
	// max internal value = 2*dvalue^2-2*dvalue (< 2^53)
	function am1(i,x,w,j,c,n) {
	  while(--n >= 0) {
		var v = x*this[i++]+w[j]+c;
		c = Math.floor(v/0x4000000);
		w[j++] = v&0x3ffffff;
	  }
	  return c;
	}
	// am2 avoids a big mult-and-extract completely.
	// Max digit bits should be <= 30 because we do bitwise ops
	// on values up to 2*hdvalue^2-hdvalue-1 (< 2^31)
	function am2(i,x,w,j,c,n) {
	  var xl = x&0x7fff, xh = x>>15;
	  while(--n >= 0) {
		var l = this[i]&0x7fff;
		var h = this[i++]>>15;
		var m = xh*l+h*xl;
		l = xl*l+((m&0x7fff)<<15)+w[j]+(c&0x3fffffff);
		c = (l>>>30)+(m>>>15)+xh*h+(c>>>30);
		w[j++] = l&0x3fffffff;
	  }
	  return c;
	}
	// Alternately, set max digit bits to 28 since some
	// browsers slow down when dealing with 32-bit numbers.
	function am3(i,x,w,j,c,n) {
	  var xl = x&0x3fff, xh = x>>14;
	  while(--n >= 0) {
		var l = this[i]&0x3fff;
		var h = this[i++]>>14;
		var m = xh*l+h*xl;
		l = xl*l+((m&0x3fff)<<14)+w[j]+c;
		c = (l>>28)+(m>>14)+xh*h;
		w[j++] = l&0xfffffff;
	  }
	  return c;
	}
	if(j_lm && (navigator.appName == "Microsoft Internet Explorer")) {
	  BigInteger.prototype.am = am2;
	  dbits = 30;
	}
	else if(j_lm && (navigator.appName != "Netscape")) {
	  BigInteger.prototype.am = am1;
	  dbits = 26;
	}
	else { // Mozilla/Netscape seems to prefer am3
	  BigInteger.prototype.am = am3;
	  dbits = 28;
	}

	var BI_FP = 52;

	// Digit conversions
	var BI_RM = "0123456789abcdefghijklmnopqrstuvwxyz";
	var BI_RC = [];
	var rr,vv;
	rr = "0".charCodeAt(0);
	for(vv = 0; vv <= 9; ++vv) BI_RC[rr++] = vv;
	rr = "a".charCodeAt(0);
	for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;
	rr = "A".charCodeAt(0);
	for(vv = 10; vv < 36; ++vv) BI_RC[rr++] = vv;

	function int2char(n) { return BI_RM.charAt(n); }
	function intAt(s,i) {
	  var c = BI_RC[s.charCodeAt(i)];
	  return (c==null)?-1:c;
	}

	// (protected) copy this to r
	function bnpCopyTo(r) {
	  for(var i = this.t-1; i >= 0; --i) r[i] = this[i];
	  r.t = this.t;
	  r.s = this.s;
	}

	// (protected) set from integer value x, -DV <= x < DV
	function bnpFromInt(x) {
	  this.t = 1;
	  this.s = (x<0)?-1:0;
	  if(x > 0) this[0] = x;
	  else if(x < -1) this[0] = x+_DV;
	  else this.t = 0;
	}

	// return bigint initialized to value
	function nbv(i) { var r = nbi(); r._fromInt(i); return r; }

	// (protected) set from string and radix
	function bnpFromString(s,b) {
	  var k;
	  if(b == 16) k = 4;
	  else if(b == 8) k = 3;
	  else if(b == 256) k = 8; // byte array
	  else if(b == 2) k = 1;
	  else if(b == 32) k = 5;
	  else if(b == 4) k = 2;
	  else { this._fromRadix(s,b); return; }
	  this.t = 0;
	  this.s = 0;
	  var i = s.length, mi = false, sh = 0;
	  while(--i >= 0) {
		var x = (k==8)?s[i]&0xff:intAt(s,i);
		if(x < 0) {
		  if(s.charAt(i) == "-") mi = true;
		  continue;
		}
		mi = false;
		if(sh == 0)
		  this[this.t++] = x;
		else if(sh+k > this._DB) {
		  this[this.t-1] |= (x&((1<<(this._DB-sh))-1))<<sh;
		  this[this.t++] = (x>>(this._DB-sh));
		}
		else
		  this[this.t-1] |= x<<sh;
		sh += k;
		if(sh >= this._DB) sh -= this._DB;
	  }
	  if(k == 8 && (s[0]&0x80) != 0) {
		this.s = -1;
		if(sh > 0) this[this.t-1] |= ((1<<(this._DB-sh))-1)<<sh;
	  }
	  this._clamp();
	  if(mi) BigInteger.ZERO._subTo(this,this);
	}

	// (protected) clamp off excess high words
	function bnpClamp() {
	  var c = this.s&this._DM;
	  while(this.t > 0 && this[this.t-1] == c) --this.t;
	}

	// (public) return string representation in given radix
	function bnToString(b) {
	  if(this.s < 0) return "-"+this.negate().toString(b);
	  var k;
	  if(b == 16) k = 4;
	  else if(b == 8) k = 3;
	  else if(b == 2) k = 1;
	  else if(b == 32) k = 5;
	  else if(b == 4) k = 2;
	  else return this._toRadix(b);
	  var km = (1<<k)-1, d, m = false, r = "", i = this.t;
	  var p = this._DB-(i*this._DB)%k;
	  if(i-- > 0) {
		if(p < this._DB && (d = this[i]>>p) > 0) { m = true; r = int2char(d); }
		while(i >= 0) {
		  if(p < k) {
			d = (this[i]&((1<<p)-1))<<(k-p);
			d |= this[--i]>>(p+=this._DB-k);
		  }
		  else {
			d = (this[i]>>(p-=k))&km;
			if(p <= 0) { p += this._DB; --i; }
		  }
		  if(d > 0) m = true;
		  if(m) r += int2char(d);
		}
	  }
	  return m?r:"0";
	}

	// (public) -this
	function bnNegate() { var r = nbi(); BigInteger.ZERO._subTo(this,r); return r; }

	// (public) |this|
	function bnAbs() { return (this.s<0)?this.negate():this; }

	// (public) return + if this > a, - if this < a, 0 if equal
	function bnCompareTo(a) {
	  var r = this.s-a.s;
	  if(r) return r;
	  var i = this.t;
	  r = i-a.t;
	  if(r) return r;
	  while(--i >= 0) if((r = this[i] - a[i])) return r;
	  return 0;
	}

	// returns bit length of the integer x
	function nbits(x) {
	  var r = 1, t;
	  if((t=x>>>16)) { x = t; r += 16; }
	  if((t=x>>8)) { x = t; r += 8; }
	  if((t=x>>4)) { x = t; r += 4; }
	  if((t=x>>2)) { x = t; r += 2; }
	  if((t=x>>1)) { x = t; r += 1; }
	  return r;
	}

	// (public) return the number of bits in "this"
	function bnBitLength() {
	  if(this.t <= 0) return 0;
	  return this._DB*(this.t-1)+nbits(this[this.t-1]^(this.s&this._DM));
	}

	// (protected) r = this << n*DB
	function bnpDLShiftTo(n,r) {
	  var i;
	  for(i = this.t-1; i >= 0; --i) r[i+n] = this[i];
	  for(i = n-1; i >= 0; --i) r[i] = 0;
	  r.t = this.t+n;
	  r.s = this.s;
	}

	// (protected) r = this >> n*DB
	function bnpDRShiftTo(n,r) {
	  for(var i = n; i < this.t; ++i) r[i-n] = this[i];
	  r.t = Math.max(this.t-n,0);
	  r.s = this.s;
	}

	// (protected) r = this << n
	function bnpLShiftTo(n,r) {
	  var bs = n%this._DB;
	  var cbs = this._DB-bs;
	  var bm = (1<<cbs)-1;
	  var ds = Math.floor(n/this._DB), c = (this.s<<bs)&this._DM, i;
	  for(i = this.t-1; i >= 0; --i) {
		r[i+ds+1] = (this[i]>>cbs)|c;
		c = (this[i]&bm)<<bs;
	  }
	  for(i = ds-1; i >= 0; --i) r[i] = 0;
	  r[ds] = c;
	  r.t = this.t+ds+1;
	  r.s = this.s;
	  r._clamp();
	}

	// (protected) r = this >> n
	function bnpRShiftTo(n,r) {
	  r.s = this.s;
	  var ds = Math.floor(n/this._DB);
	  if(ds >= this.t) { r.t = 0; return; }
	  var bs = n%this._DB;
	  var cbs = this._DB-bs;
	  var bm = (1<<bs)-1;
	  r[0] = this[ds]>>bs;
	  for(var i = ds+1; i < this.t; ++i) {
		r[i-ds-1] |= (this[i]&bm)<<cbs;
		r[i-ds] = this[i]>>bs;
	  }
	  if(bs > 0) r[this.t-ds-1] |= (this.s&bm)<<cbs;
	  r.t = this.t-ds;
	  r._clamp();
	}

	// (protected) r = this - a
	function bnpSubTo(a,r) {
	  var i = 0, c = 0, m = Math.min(a.t,this.t);
	  while(i < m) {
		c += this[i]-a[i];
		r[i++] = c&this._DM;
		c >>= this._DB;
	  }
	  if(a.t < this.t) {
		c -= a.s;
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
		  c -= a[i];
		  r[i++] = c&this._DM;
		  c >>= this._DB;
		}
		c -= a.s;
	  }
	  r.s = (c<0)?-1:0;
	  if(c < -1) r[i++] = this._DV+c;
	  else if(c > 0) r[i++] = c;
	  r.t = i;
	  r._clamp();
	}

	// (protected) r = this * a, r != this,a (HAC 14.12)
	// "this" should be the larger one if appropriate.
	function bnpMultiplyTo(a,r) {
	  var x = this.abs(), y = a.abs();
	  var i = x.t;
	  r.t = i+y.t;
	  while(--i >= 0) r[i] = 0;
	  for(i = 0; i < y.t; ++i) r[i+x.t] = x.am(0,y[i],r,i,0,x.t);
	  r.s = 0;
	  r._clamp();
	  if(this.s != a.s) BigInteger.ZERO._subTo(r,r);
	}

	// (protected) r = this^2, r != this (HAC 14.16)
	function bnpSquareTo(r) {
	  var x = this.abs();
	  var i = r.t = 2*x.t;
	  while(--i >= 0) r[i] = 0;
	  for(i = 0; i < x.t-1; ++i) {
		var c = x.am(i,x[i],r,2*i,0,1);
		if((r[i+x.t]+=x.am(i+1,2*x[i],r,2*i+1,c,x.t-i-1)) >= x._DV) {
		  r[i+x.t] -= x._DV;
		  r[i+x.t+1] = 1;
		}
	  }
	  if(r.t > 0) r[r.t-1] += x.am(i,x[i],r,2*i,0,1);
	  r.s = 0;
	  r._clamp();
	}

	// (protected) divide this by m, quotient and remainder to q, r (HAC 14.20)
	// r != q, this != m.  q or r may be null.
	function bnpDivRemTo(m,q,r) {
	  var pm = m.abs();
	  if(pm.t <= 0) return;
	  var pt = this.abs();
	  if(pt.t < pm.t) {
		if(q != null) q._fromInt(0);
		if(r != null) this._copyTo(r);
		return;
	  }
	  if(r == null) r = nbi();
	  var y = nbi(), ts = this.s, ms = m.s;
	  var nsh = this._DB-nbits(pm[pm.t-1]);	// normalize modulus
	  if(nsh > 0) { pm._lShiftTo(nsh,y); pt._lShiftTo(nsh,r); }
	  else { pm._copyTo(y); pt._copyTo(r); }
	  var ys = y.t;
	  var y0 = y[ys-1];
	  if(y0 == 0) return;
	  var yt = y0*(1<<this._F1)+((ys>1)?y[ys-2]>>this._F2:0);
	  var d1 = this._FV/yt, d2 = (1<<this._F1)/yt, e = 1<<this._F2;
	  var i = r.t, j = i-ys, t = (q==null)?nbi():q;
	  y._dlShiftTo(j,t);
	  if(r.compareTo(t) >= 0) {
		r[r.t++] = 1;
		r._subTo(t,r);
	  }
	  BigInteger.ONE._dlShiftTo(ys,t);
	  t._subTo(y,y);	// "negative" y so we can replace sub with am later
	  while(y.t < ys) y[y.t++] = 0;
	  while(--j >= 0) {
		// Estimate quotient digit
		var qd = (r[--i]==y0)?this._DM:Math.floor(r[i]*d1+(r[i-1]+e)*d2);
		if((r[i]+=y.am(0,qd,r,j,0,ys)) < qd) {	// Try it out
		  y._dlShiftTo(j,t);
		  r._subTo(t,r);
		  while(r[i] < --qd) r._subTo(t,r);
		}
	  }
	  if(q != null) {
		r._drShiftTo(ys,q);
		if(ts != ms) BigInteger.ZERO._subTo(q,q);
	  }
	  r.t = ys;
	  r._clamp();
	  if(nsh > 0) r._rShiftTo(nsh,r);	// Denormalize remainder
	  if(ts < 0) BigInteger.ZERO._subTo(r,r);
	}

	// (public) this mod a
	function bnMod(a) {
	  var r = nbi();
	  this.abs()._divRemTo(a,null,r);
	  if(this.s < 0 && r.compareTo(BigInteger.ZERO) > 0) a._subTo(r,r);
	  return r;
	}

	// Modular reduction using "classic" algorithm
	function Classic(m) { this.m = m; }
	function cConvert(x) {
	  if(x.s < 0 || x.compareTo(this.m) >= 0) return x.mod(this.m);
	  else return x;
	}
	function cRevert(x) { return x; }
	function cReduce(x) { x._divRemTo(this.m,null,x); }
	function cMulTo(x,y,r) { x._multiplyTo(y,r); this.reduce(r); }
	function cSqrTo(x,r) { x._squareTo(r); this.reduce(r); }

	dojo.extend(Classic, {
		convert:	cConvert,
		revert:		cRevert,
		reduce:		cReduce,
		mulTo:		cMulTo,
		sqrTo:		cSqrTo
	});

	// (protected) return "-1/this % 2^DB"; useful for Mont. reduction
	// justification:
	// xy == 1 (mod m)
	// xy =  1+km
	// xy(2-xy) = (1+km)(1-km)
	// x[y(2-xy)] = 1-k^2m^2
	// x[y(2-xy)] == 1 (mod m^2)
	// if y is 1/x mod m, then y(2-xy) is 1/x mod m^2
	// should reduce x and y(2-xy) by m^2 at each step to keep size bounded.
	// JS multiply "overflows" differently from C/C++, so care is needed here.
	function bnpInvDigit() {
	  if(this.t < 1) return 0;
	  var x = this[0];
	  if((x&1) == 0) return 0;
	  var y = x&3;		// y == 1/x mod 2^2
	  y = (y*(2-(x&0xf)*y))&0xf;	// y == 1/x mod 2^4
	  y = (y*(2-(x&0xff)*y))&0xff;	// y == 1/x mod 2^8
	  y = (y*(2-(((x&0xffff)*y)&0xffff)))&0xffff;	// y == 1/x mod 2^16
	  // last step - calculate inverse mod DV directly;
	  // assumes 16 < DB <= 32 and assumes ability to handle 48-bit ints
	  y = (y*(2-x*y%this._DV))%this._DV;		// y == 1/x mod 2^dbits
	  // we really want the negative inverse, and -DV < y < DV
	  return (y>0)?this._DV-y:-y;
	}

	// Montgomery reduction
	function Montgomery(m) {
	  this.m = m;
	  this.mp = m._invDigit();
	  this.mpl = this.mp&0x7fff;
	  this.mph = this.mp>>15;
	  this.um = (1<<(m._DB-15))-1;
	  this.mt2 = 2*m.t;
	}

	// xR mod m
	function montConvert(x) {
	  var r = nbi();
	  x.abs()._dlShiftTo(this.m.t,r);
	  r._divRemTo(this.m,null,r);
	  if(x.s < 0 && r.compareTo(BigInteger.ZERO) > 0) this.m._subTo(r,r);
	  return r;
	}

	// x/R mod m
	function montRevert(x) {
	  var r = nbi();
	  x._copyTo(r);
	  this.reduce(r);
	  return r;
	}

	// x = x/R mod m (HAC 14.32)
	function montReduce(x) {
	  while(x.t <= this.mt2)	// pad x so am has enough room later
		x[x.t++] = 0;
	  for(var i = 0; i < this.m.t; ++i) {
		// faster way of calculating u0 = x[i]*mp mod DV
		var j = x[i]&0x7fff;
		var u0 = (j*this.mpl+(((j*this.mph+(x[i]>>15)*this.mpl)&this.um)<<15))&x._DM;
		// use am to combine the multiply-shift-add into one call
		j = i+this.m.t;
		x[j] += this.m.am(0,u0,x,i,0,this.m.t);
		// propagate carry
		while(x[j] >= x._DV) { x[j] -= x._DV; x[++j]++; }
	  }
	  x._clamp();
	  x._drShiftTo(this.m.t,x);
	  if(x.compareTo(this.m) >= 0) x._subTo(this.m,x);
	}

	// r = "x^2/R mod m"; x != r
	function montSqrTo(x,r) { x._squareTo(r); this.reduce(r); }

	// r = "xy/R mod m"; x,y != r
	function montMulTo(x,y,r) { x._multiplyTo(y,r); this.reduce(r); }

	dojo.extend(Montgomery, {
		convert:	montConvert,
		revert:		montRevert,
		reduce:		montReduce,
		mulTo:		montMulTo,
		sqrTo:		montSqrTo
	});

	// (protected) true iff this is even
	function bnpIsEven() { return ((this.t>0)?(this[0]&1):this.s) == 0; }

	// (protected) this^e, e < 2^32, doing sqr and mul with "r" (HAC 14.79)
	function bnpExp(e,z) {
	  if(e > 0xffffffff || e < 1) return BigInteger.ONE;
	  var r = nbi(), r2 = nbi(), g = z.convert(this), i = nbits(e)-1;
	  g._copyTo(r);
	  while(--i >= 0) {
		z.sqrTo(r,r2);
		if((e&(1<<i)) > 0) z.mulTo(r2,g,r);
		else { var t = r; r = r2; r2 = t; }
	  }
	  return z.revert(r);
	}

	// (public) this^e % m, 0 <= e < 2^32
	function bnModPowInt(e,m) {
	  var z;
	  if(e < 256 || m._isEven()) z = new Classic(m); else z = new Montgomery(m);
	  return this._exp(e,z);
	}

	dojo.extend(BigInteger, {
		// protected, not part of the official API
		_DB:	dbits,
		_DM:	(1 << dbits) - 1,
		_DV:	1 << dbits,

		_FV:	Math.pow(2, BI_FP),
		_F1:	BI_FP - dbits,
		_F2:	2 * dbits-BI_FP,

		// protected
		_copyTo:		bnpCopyTo,
		_fromInt:		bnpFromInt,
		_fromString:	bnpFromString,
		_clamp:			bnpClamp,
		_dlShiftTo:		bnpDLShiftTo,
		_drShiftTo:		bnpDRShiftTo,
		_lShiftTo:		bnpLShiftTo,
		_rShiftTo:		bnpRShiftTo,
		_subTo:			bnpSubTo,
		_multiplyTo:	bnpMultiplyTo,
		_squareTo:		bnpSquareTo,
		_divRemTo:		bnpDivRemTo,
		_invDigit:		bnpInvDigit,
		_isEven:		bnpIsEven,
		_exp:			bnpExp,

		// public
		toString:		bnToString,
		negate:			bnNegate,
		abs:			bnAbs,
		compareTo:		bnCompareTo,
		bitLength:		bnBitLength,
		mod:			bnMod,
		modPowInt:		bnModPowInt
	});

	dojo._mixin(BigInteger, {
		// "constants"
		ZERO:	nbv(0),
		ONE:	nbv(1),

		// internal functions
		_nbi: nbi,
		_nbv: nbv,
		_nbits: nbits,

		// internal classes
		_Montgomery: Montgomery
	});

	// export to DojoX
	dojox.math.BigInteger = BigInteger;

	return dojox.math.BigInteger;
});
