// AMD-ID "dojox/math/random/prng4"
define(["dojo", "dojox"], function(dojo, dojox) {
	
	dojo.getObject("math.random.prng4", true, dojox);

// Copyright (c) 2005  Tom Wu
// All Rights Reserved.
// See "LICENSE-BigInteger" for details.

	// prng4.js - uses Arcfour as a PRNG

	function Arcfour() {
		this.i = 0;
		this.j = 0;
		this.S = new Array(256);
	}

	dojo.extend(Arcfour, {
		init: function(key){
			// summary:
			//		Initialize arcfour context
			// key: int[]
			//		an array of ints, each from [0..255]
			var i, j, t, S = this.S, len = key.length;
			for(i = 0; i < 256; ++i){
				S[i] = i;
			}
			j = 0;
			for(i = 0; i < 256; ++i){
				j = (j + S[i] + key[i % len]) & 255;
				t = S[i];
				S[i] = S[j];
				S[j] = t;
			}
			this.i = 0;
			this.j = 0;
		},

		next: function(){
			var t, i, j, S = this.S;
			this.i = i = (this.i + 1) & 255;
			this.j = j = (this.j + S[i]) & 255;
			t = S[i];
			S[i] = S[j];
			S[j] = t;
			return S[(t + S[i]) & 255];
		}
	});

	dojox.math.random.prng4 = function(){
		return new Arcfour();
	};

	// Pool size must be a multiple of 4 and greater than 32.
	// An array of bytes the size of the pool will be passed to init()
	dojox.math.random.prng4.size = 256;
	
	return dojox.math.random.prng4;
});
