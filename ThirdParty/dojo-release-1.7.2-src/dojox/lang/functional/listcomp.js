dojo.provide("dojox.lang.functional.listcomp");

// This module adds high-level functions and related constructs:
//	- list comprehensions similar to JavaScript 1.7

// Notes:
//	- listcomp() produces functions, which after the compilation step are
//		as fast as regular JS functions (at least theoretically).

(function(){
	var g_re = /\bfor\b|\bif\b/gm;

	var listcomp = function(/*String*/ s){
		var frag = s.split(g_re), act = s.match(g_re),
			head = ["var r = [];"], tail = [], i = 0, l = act.length;
		while(i < l){
			var a = act[i], f = frag[++i];
			if(a == "for" && !/^\s*\(\s*(;|var)/.test(f)){
				f = f.replace(/^\s*\(/, "(var ");
			}
			head.push(a, f, "{");
			tail.push("}");
		}
		return head.join("") + "r.push(" + frag[0] + ");" + tail.join("") + "return r;";	// String
	};

	dojo.mixin(dojox.lang.functional, {
		buildListcomp: function(/*String*/ s){
			// summary: builds a function from a text snippet, which represents a valid
			//	JS 1.7 list comprehension, returns a string, which represents the function.
			// description: This method returns a textual representation of a function
			//	built from the list comprehension text snippet (conformant to JS 1.7).
			//	It is meant to be evaled in the proper context, so local variable can be
			//	pulled from the environment.
			return "function(){" + listcomp(s) + "}";	// String
		},
		compileListcomp: function(/*String*/ s){
			// summary: builds a function from a text snippet, which represents a valid
			//	JS 1.7 list comprehension, returns a function object.
			// description: This method returns a function built from the list
			//	comprehension text snippet (conformant to JS 1.7). It is meant to be
			//	reused several times.
			return new Function([], listcomp(s));	// Function
		},
		listcomp: function(/*String*/ s){
			// summary: executes the list comprehension building an array.
			return (new Function([], listcomp(s)))();	// Array
		}
	});
})();
