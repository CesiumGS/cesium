define([
	"dojo/_base/kernel", // dojo.experimental
	"dojo/_base/lang", // dojo.extend
	"./RSAKey",
	"../../math/BigInteger-ext"
], function(kernel, lang, RSAKey, BigInteger) {

	kernel.experimental("dojox.encoding.crypto.RSAKey-ext");

	// Undo PKCS#1 (type 2, random) padding and, if valid, return the plaintext
	function pkcs1unpad2(d, n){
		var b = d.toByteArray();
		for(var i = 0, len = b.length; i < len && !b[i]; ++i);
		if(b.length - i !== n - 1 || b[i] !== 2){
			return null;
		}
		for(++i; b[i];){
			if(++i >= len){
				return null;
			}
		}
		var ret = "";
		while(++i < len){
			ret += String.fromCharCode(b[i]);
		}
		return ret;
	}

	lang.extend(RSAKey, {
		setPrivate: function(N, E, D){
			// summary:
			//		Set the private key fields N, e, d and CRT params from hex strings
			if(N && E && N.length && E.length){
				this.n = new BigInteger(N, 16);
				this.e = parseInt(E, 16);
				this.d = new BigInteger(D, 16);
			}else{
				throw new Error("Invalid RSA private key");
			}
		},
		setPrivateEx: function(N, E, D, P, Q, DP, DQ, C) {
			// summary:
			//		Set the private key fields N, e, d and CRT params from hex strings
			if(N && E && N.length && E.length){
				this.n = new BigInteger(N, 16);
				this.e = parseInt(E, 16);
				this.d = new BigInteger(D, 16);
				this.p = new BigInteger(P, 16);
				this.q = new BigInteger(Q, 16);
				this.dmp1 = new BigInteger(DP, 16);
				this.dmq1 = new BigInteger(DQ, 16);
				this.coeff = new BigInteger(C, 16);
			}else{
				throw new Error("Invalid RSA private key");
			}
		},
		generate: function(B, E){
			// summary:
			//		Generate a new random private key B bits long, using public expt E
			var rng = this.rngf(), qs = B >> 1;
			this.e = parseInt(E, 16);
			var ee = new BigInteger(E, 16);
			for(;;) {
				for(;;) {
					this.p = new BigInteger(B - qs, 1, rng);
					if(!this.p.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) && this.p.isProbablePrime(10)){
						break;
					}
				}
				for(;;) {
					this.q = new BigInteger(qs, 1, rng);
					if(!this.q.subtract(BigInteger.ONE).gcd(ee).compareTo(BigInteger.ONE) && this.q.isProbablePrime(10)){
						break;
					}
				}
				if(this.p.compareTo(this.q) <= 0) {
					var t = this.p;
					this.p = this.q;
					this.q = t;
				}
				var p1 = this.p.subtract(BigInteger.ONE);
				var q1 = this.q.subtract(BigInteger.ONE);
				var phi = p1.multiply(q1);
				if(!phi.gcd(ee).compareTo(BigInteger.ONE)) {
					this.n = this.p.multiply(this.q);
					this.d = ee.modInverse(phi);
					this.dmp1 = this.d.mod(p1);
					this.dmq1 = this.d.mod(q1);
					this.coeff = this.q.modInverse(this.p);
					break;
				}
			}
			rng.destroy();
		},

		decrypt: function(ctext){
			// summary:
			//		Return the PKCS#1 RSA decryption of "ctext".
			// ctext: String
			//		an even-length hex string
			// returns:
			//		a plain string.
			var c = new BigInteger(ctext, 16), m;
			if(!this.p || !this.q){
				m = c.modPow(this.d, this.n);
			}else{
				// TODO: re-calculate any missing CRT params
				var cp = c.mod(this.p).modPow(this.dmp1, this.p),
					cq = c.mod(this.q).modPow(this.dmq1, this.q);
				while(cp.compareTo(cq) < 0){
					cp = cp.add(this.p);
				}
				m = cp.subtract(cq).multiply(this.coeff).mod(this.p).multiply(this.q).add(cq);
			}
			if(!m){
				return null;
			}
			return pkcs1unpad2(m, (this.n.bitLength() + 7) >> 3);
		}
	});
	
	return RSAKey;
});
