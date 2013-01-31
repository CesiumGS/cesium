// AMD-ID "dojox/math/_base"
define(["dojo", "dojox"], function(dojo, dojox) {
	dojo.getObject("math", true, dojox);

	var m = dojox.math;
	dojo.mixin(dojox.math, {
		toRadians: function(/* Number */n){
			// summary:
			//		Convert the passed number to radians.
			return (n*Math.PI)/180;	// Number
		},
		toDegrees: function(/* Number */n){
			// summary:
			//		Convert the passed number to degrees.
			return (n*180)/Math.PI;	// Number
		},
		degreesToRadians: function(/* Number */n){
			// summary:
			//		Deprecated.  Use dojox.math.toRadians.
			return m.toRadians(n);	// Number
		},
		radiansToDegrees: function(/* Number */n){
			// summary:
			//		Deprecated.  Use dojox.math.toDegrees.
			return m.toDegrees(n);	// Number
		},

		_gamma: function(z){
			// summary:
			//		Compute the gamma function for the passed number.
			//		Approximately 14 digits of precision with non-integers.
			var answer = 1; // 0!
			// gamma(n+1) = n * gamma(n)
			while (--z >= 1){
				answer *= z;
			}
			if(z == 0){ return answer; } // normal integer quick return
			if(Math.floor(z) == z){ return NaN; } // undefined at nonpositive integers since sin() below will return 0
			// assert: z < 1, remember this z is really z-1
			if(z == -0.5){ return Math.sqrt(Math.PI); } // popular gamma(1/2)
			if(z < -0.5){ // remember this z is really z-1
				return Math.PI / (Math.sin(Math.PI * (z + 1)) * this._gamma(-z)); // reflection
			}
			// assert: -0.5 < z < 1
			// Spouge approximation algorithm
			var a = 13;
			// c[0] = sqrt(2*PI) / exp(a)
			// var kfact = 1
			// for (var k=1; k < a; k++){
			//		c[k] = pow(-k + a, k - 0.5) * exp(-k) / kfact
			//		kfact *= -k  // (-1)^(k-1) * (k-1)!
			// }
			var c = [ // precomputed from the above algorithm
					 5.6658056015186327e-6,
					 1.2743717663379679,
					-4.9374199093155115,
					 7.8720267032485961,
					-6.6760503749436087,
					 3.2525298444485167,
					-9.1852521441026269e-1,
					 1.4474022977730785e-1,
					-1.1627561382389853e-2,
					 4.0117980757066622e-4,
					-4.2652458386405744e-6,
					 6.6651913290336086e-9,
					-1.5392547381874824e-13
				];
			var sum = c[0];
			for (var k=1; k < a; k++){
				sum += c[k] / (z + k);
			}
			return answer * Math.pow(z + a, z + 0.5) / Math.exp(z) * sum;
		},

		factorial: function(/* Number */n){
			// summary:
			//		Return the factorial of n
			return this._gamma(n+1);	// Number
		},

		permutations: function(/* Number */n, /* Number */k){
			// summary:
			//		TODO
			if(n==0 || k==0){
				return 1; 	// Number
			}
			return this.factorial(n) / this.factorial(n-k);
		},

		combinations: function(/* Number */n, /* Number */r){
			// summary:
			//		TODO
			if(n==0 || r==0){
				return 1; 	// Number
			}
			return this.factorial(n) / (this.factorial(n-r) * this.factorial(r));	// Number
		},

		bernstein: function(/* Number */t, /* Number */n, /* Number */ i){
			// summary:
			//		TODO
			return this.combinations(n, i) * Math.pow(t, i) * Math.pow(1-t, n-i);	// Number
		},

		gaussian: function(){
			// summary:
			//		Return a random number based on the Gaussian algo.
			var k=2;
			do{
				var i=2*Math.random()-1;
				var j=2*Math.random()-1;
				k = i*i+j*j;
			}while(k>=1);
			return i * Math.sqrt((-2*Math.log(k))/k);	// Number
		},

		// create a range of numbers
		range: function(/* Number */a, /* Number? */b, /* Number? */step){
			// summary:
			//		Create a range of numbers based on the parameters.
			if(arguments.length<2){
				b=a,a=0;
			}
			var range=[], s=step||1, i;
			if(s>0){
				for(i=a; i<b; i+=s){
					range.push(i);
				}
			}else{
				if(s<0){
					for(i=a; i>b; i+=s){
						range.push(i);
					}
				}else{
					throw new Error("dojox.math.range: step must not be zero.");
				}
			}
			return range; 	// Array
		},

		distance: function(/* Array */a, /* Array */b){
			// summary:
			//		Calculate the distance between point A and point B
			return Math.sqrt(Math.pow(b[0]-a[0],2)+Math.pow(b[1]-a[1],2));	// Number
		},

		midpoint: function(/* Array */a, /* Array */b){
			// summary:
			//		Calculate the midpoint between points A and B.  A and B may be multidimensional.
			if(a.length!=b.length){
				console.error("dojox.math.midpoint: Points A and B are not the same dimensionally.", a, b);
			}
			var m=[];
			for(var i=0; i<a.length; i++){
				m[i]=(a[i]+b[i])/2;
			}
			return m;	// Array
		}
	});

	return dojox.math;
});
