dojo.provide("dojox.lang.functional.zip");

// This module adds high-level functions and related constructs:
//	- zip combiners

// Defined methods:
//	- operate on dense arrays

(function(){
	var df = dojox.lang.functional;

	dojo.mixin(df, {
		// combiners
		zip: function(){
			// summary:
			//		returns an array of arrays, where the i-th array
			//		contains the i-th element from each of the argument arrays.
			// description:
			//		This is the venerable zip combiner (for example,
			//		see Python documentation for general details). The returned
			//		array is truncated to match the length of the shortest input
			//		array.
			var n = arguments[0].length, m = arguments.length, i = 1, t = new Array(n), j, p;
			for(; i < m; n = Math.min(n, arguments[i++].length));
			for(i = 0; i < n; ++i){
				p = new Array(m);
				for(j = 0; j < m; p[j] = arguments[j][i], ++j);
				t[i] = p;
			}
			return t;	// Array
		},
		unzip: function(/*Array*/ a){
			// summary:
			//		similar to dojox.lang.functional.zip(), but takes
			//		a single array of arrays as the input.
			// description:
			//		This function is similar to dojox.lang.functional.zip()
			//		and can be used to unzip objects packed by
			//		dojox.lang.functional.zip(). It is here mostly to provide
			//		a short-cut for the different method signature.
			return df.zip.apply(null, a);	// Array
		}
	});
})();
