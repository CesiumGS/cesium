// AMD-ID "dojox/math/random/Secure"
define(["dojo"], function(dojo) {

// Copyright (c) 2005  Tom Wu
// All Rights Reserved.
// See "LICENSE-BigInteger" for details.

// Random number generator - requires a PRNG backend, e.g. prng4.js

dojo.declare("dojox.math.random.Secure", null, {
	// summary:
	//		Super simple implementation of a random number generator,
	//		which relies on Math.random().

	constructor: function(prng, noEvents){
		// summary:
		//		Initializes an instance of a secure random generator.
		// prng: Function
		//		function that returns an instance of PRNG (pseudo random number generator)
		//		with two methods: init(array) and next(). It should have a property "size"
		//		to indicate the required pool size.
		// noEvents: Boolean?
		//		if false or absent, onclick and onkeypress event will be used to add
		//		"randomness", otherwise events will not be used.
		this.prng = prng;

		// Initialize the pool with junk if needed.
		var p = this.pool = new Array(prng.size);
		this.pptr = 0;
		for(var i = 0, len = prng.size; i < len;) {  // extract some randomness from Math.random()
			var t = Math.floor(65536 * Math.random());
			p[i++] = t >>> 8;
			p[i++] = t & 255;
		}
		this.seedTime();

		if(!noEvents){
			this.h = [
				dojo.connect(dojo.body(), "onclick",    this, "seedTime"),
				dojo.connect(dojo.body(), "onkeypress", this, "seedTime")
			];
		}
	},

	destroy: function(){
		// summary:
		//		Disconnects events, if any, preparing the object for GC.
		if(this.h){
			dojo.forEach(this.h, dojo.disconnect);
		}
	},

	nextBytes: function(/* Array */ byteArray){
		// summary:
		//		Fills in an array of bytes with random numbers
		// byteArray: Array
		//		array to be filled in with random numbers, only existing
		//		elements will be filled.

		var state = this.state;

		if(!state){
			this.seedTime();
			state = this.state = this.prng();
			state.init(this.pool);
			for(var p = this.pool, i = 0, len = p.length; i < len; p[i++] = 0);
			this.pptr = 0;
			//this.pool = null;
		}

		for(var i = 0, len = byteArray.length; i < len; ++i){
			byteArray[i] = state.next();
		}
	},

	seedTime: function() {
		// summary:
		//		Mix in the current time (w/milliseconds) into the pool
		this._seed_int(new Date().getTime());
	},

	_seed_int: function(x) {
		// summary:
		//		Mix in a 32-bit integer into the pool
		var p = this.pool, i = this.pptr;
		p[i++] ^= x & 255;
		p[i++] ^= (x >> 8) & 255;
		p[i++] ^= (x >> 16) & 255;
		p[i++] ^= (x >> 24) & 255;
		if(i >= this.prng.size){
			i -= this.prng.size;
		}
		this.pptr = i;
	}
});

return dojox.math.random.Secure;
});
