define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"../../math/BigInteger",
	"../../math/random/Simple"
], function(kernel, declare, BigInteger, Simple) {

	kernel.experimental("dojox.encoding.crypto.RSAKey");

// Copyright (c) 2005  Tom Wu
// All Rights Reserved.
// See "LICENSE-BigInteger" in dojox.math for details.

	var defaultRngf = function(){ return new Simple(); };

	// PKCS#1 (type 2, random) pad input string s to n bytes, and return a bigint
	function pkcs1pad2(s, n, rngf) {
		if(n < s.length + 11) {
			throw new Error("Message too long for RSA");
		}
		var ba = new Array(n);
		var i = s.length;
		while(i && n) ba[--n] = s.charCodeAt(--i);
		ba[--n] = 0;
		var rng = rngf();
		var x = [0];
		while(n > 2) { // random non-zero pad
			x[0] = 0;
			while(x[0] == 0) rng.nextBytes(x);
			ba[--n] = x[0];
		}
		ba[--n] = 2;
		ba[--n] = 0;
		rng.destroy();
		return new BigInteger(ba);
	}

	return declare("dojox.encoding.crypto.RSAKey", null, {
		constructor: function(rngf){
			// summary:
			//		"empty" RSA key constructor
			// rndf: Function?
			//		function that returns an instance of a random number generator
			//		(see dojox.math.random for details)
			this.rngf = rngf || defaultRngf;
			this.e = 0;
			this.n = this.d = this.p = this.q = this.dmp1 = this.dmq1 = this.coeff = null;
		},

		setPublic: function(N, E){
			// summary:
			//		Set the public key fields N and e from hex strings
			if(N && E && N.length && E.length) {
				this.n = new BigInteger(N, 16);
				this.e = parseInt(E, 16);
			}else{
				throw new Error("Invalid RSA public key");
			}
		},

		encrypt: function(text){
			var m = pkcs1pad2(text, (this.n.bitLength() + 7) >> 3, this.rngf);
			if(!m){
				return null;
			}
			var c = m.modPowInt(this.e, this.n);
			if(!c){
				return null;
			}
			var h = c.toString(16);
			return h.length % 2 ? "0" + h : h;
		}
	});
});
