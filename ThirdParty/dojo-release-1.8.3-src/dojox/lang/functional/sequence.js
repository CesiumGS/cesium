define(["dojo/_base/kernel", "dojo/_base/lang", "./lambda"], function(kernel, lang, df){

// This module adds high-level functions and related constructs:
//	- sequence generators

// If you want more general sequence builders check out listcomp.js and
// unfold() (in fold.js).

// Defined methods:
//	- take any valid lambda argument as the functional argument

	lang.mixin(df, {
		// sequence generators
		repeat: function(/*Number*/ n, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary:
			//		builds an array by repeatedly applying a unary function N times
			//		with a seed value Z. N should be greater than 0.
			o = o || kernel.global; f = df.lambda(f);
			var t = new Array(n), i = 1;
			t[0] = z;
			for(; i < n; t[i] = z = f.call(o, z), ++i);
			return t;	// Array
		},
		until: function(/*Function|String|Array*/ pr, /*Function|String|Array*/ f, /*Object*/ z, /*Object?*/ o){
			// summary:
			//		builds an array by repeatedly applying a unary function with
			//		a seed value Z until the predicate is satisfied.
			o = o || kernel.global; f = df.lambda(f); pr = df.lambda(pr);
			var t = [];
			for(; !pr.call(o, z); t.push(z), z = f.call(o, z));
			return t;	// Array
		}
	});
	
	return df;
});
