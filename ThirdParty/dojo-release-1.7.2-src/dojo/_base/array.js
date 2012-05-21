define(["./kernel", "../has", "./lang"], function(dojo, has, lang){
	// module:
	//		dojo/_base/array
	// summary:
	//		This module defines the Javascript v1.6 array extensions.

	/*=====
	dojo.indexOf = function(arr, value, fromIndex, findLast){
		// summary:
		//		locates the first index of the provided value in the
		//		passed array. If the value is not found, -1 is returned.
		// description:
		//		This method corresponds to the JavaScript 1.6 Array.indexOf method, with one difference: when
		//		run over sparse arrays, the Dojo function invokes the callback for every index whereas JavaScript
		//		1.6's indexOf skips the holes in the sparse array.
		//		For details on this method, see:
		//			https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/indexOf
		// arr: Array
		// value: Object
		// fromIndex: Integer?
		// findLast: Boolean?
		// returns: Number
	};
	dojo.lastIndexOf = function(arr, value, fromIndex){
		// summary:
		//		locates the last index of the provided value in the passed
		//		array. If the value is not found, -1 is returned.
		// description:
		//		This method corresponds to the JavaScript 1.6 Array.lastIndexOf method, with one difference: when
		//		run over sparse arrays, the Dojo function invokes the callback for every index whereas JavaScript
		//		1.6's lastIndexOf skips the holes in the sparse array.
		//		For details on this method, see:
		//			https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/lastIndexOf
		//	arr: Array,
		//	value: Object,
		//	fromIndex: Integer?
		//	returns: Number
	};
	dojo.forEach = function(arr, callback, thisObject){
		//	summary:
		//		for every item in arr, callback is invoked. Return values are ignored.
		//		If you want to break out of the loop, consider using dojo.every() or dojo.some().
		//		forEach does not allow breaking out of the loop over the items in arr.
		//	arr:
		//		the array to iterate over. If a string, operates on individual characters.
		//	callback:
		//		a function is invoked with three arguments: item, index, and array
		//	thisObject:
		//		may be used to scope the call to callback
		//	description:
		//		This function corresponds to the JavaScript 1.6 Array.forEach() method, with one difference: when
		//		run over sparse arrays, this implementation passes the "holes" in the sparse array to
		//		the callback function with a value of undefined. JavaScript 1.6's forEach skips the holes in the sparse array.
		//		For more details, see:
		//			https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/forEach
		//	example:
		//	| // log out all members of the array:
		//	| dojo.forEach(
		//	|		[ "thinger", "blah", "howdy", 10 ],
		//	|		function(item){
		//	|			console.log(item);
		//	|		}
		//	| );
		//	example:
		//	| // log out the members and their indexes
		//	| dojo.forEach(
		//	|		[ "thinger", "blah", "howdy", 10 ],
		//	|		function(item, idx, arr){
		//	|			console.log(item, "at index:", idx);
		//	|		}
		//	| );
		//	example:
		//	| // use a scoped object member as the callback
		//	|
		//	| var obj = {
		//	|		prefix: "logged via obj.callback:",
		//	|		callback: function(item){
		//	|			console.log(this.prefix, item);
		//	|		}
		//	| };
		//	|
		//	| // specifying the scope function executes the callback in that scope
		//	| dojo.forEach(
		//	|		[ "thinger", "blah", "howdy", 10 ],
		//	|		obj.callback,
		//	|		obj
		//	| );
		//	|
		//	| // alternately, we can accomplish the same thing with dojo.hitch()
		//	| dojo.forEach(
		//	|		[ "thinger", "blah", "howdy", 10 ],
		//	|		dojo.hitch(obj, "callback")
		//	| );
		//	arr: Array|String
		//	callback: Function|String
		//	thisObject: Object?
	};
	dojo.every = function(arr, callback, thisObject){
		// summary:
		//		Determines whether or not every item in arr satisfies the
		//		condition implemented by callback.
		// arr: Array|String
		//		the array to iterate on. If a string, operates on individual characters.
		// callback: Function|String
		//		a function is invoked with three arguments: item, index,
		//		and array and returns true if the condition is met.
		// thisObject: Object?
		//		may be used to scope the call to callback
		// returns: Boolean
		// description:
		//		This function corresponds to the JavaScript 1.6 Array.every() method, with one difference: when
		//		run over sparse arrays, this implementation passes the "holes" in the sparse array to
		//		the callback function with a value of undefined. JavaScript 1.6's every skips the holes in the sparse array.
		//		For more details, see:
		//			https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/every
		// example:
		//	| // returns false
		//	| dojo.every([1, 2, 3, 4], function(item){ return item>1; });
		// example:
		//	| // returns true
		//	| dojo.every([1, 2, 3, 4], function(item){ return item>0; });
	};
	dojo.some = function(arr, callback, thisObject){
		// summary:
		//		Determines whether or not any item in arr satisfies the
		//		condition implemented by callback.
		// arr: Array|String
		//		the array to iterate over. If a string, operates on individual characters.
		// callback: Function|String
		//		a function is invoked with three arguments: item, index,
		//		and array and returns true if the condition is met.
		// thisObject: Object?
		//		may be used to scope the call to callback
		// returns: Boolean
		// description:
		//		This function corresponds to the JavaScript 1.6 Array.some() method, with one difference: when
		//		run over sparse arrays, this implementation passes the "holes" in the sparse array to
		//		the callback function with a value of undefined. JavaScript 1.6's some skips the holes in the sparse array.
		//		For more details, see:
		//			https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/some
		// example:
		//	| // is true
		//	| dojo.some([1, 2, 3, 4], function(item){ return item>1; });
		// example:
		//	| // is false
		//	| dojo.some([1, 2, 3, 4], function(item){ return item<1; });
	};
	dojo.map = function(arr, callback, thisObject){
		// summary:
		//		applies callback to each element of arr and returns
		//		an Array with the results
		// arr: Array|String
		//		the array to iterate on. If a string, operates on
		//		individual characters.
		// callback: Function|String
		//		a function is invoked with three arguments, (item, index,
		//		array),	 and returns a value
		// thisObject: Object?
		//		may be used to scope the call to callback
		// returns: Array
		// description:
		//		This function corresponds to the JavaScript 1.6 Array.map() method, with one difference: when
		//		run over sparse arrays, this implementation passes the "holes" in the sparse array to
		//		the callback function with a value of undefined. JavaScript 1.6's map skips the holes in the sparse array.
		//		For more details, see:
		//			https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/map
		// example:
		//	| // returns [2, 3, 4, 5]
		//	| dojo.map([1, 2, 3, 4], function(item){ return item+1 });
	};
	dojo.filter = function(arr, callback, thisObject){
		// summary:
		//		Returns a new Array with those items from arr that match the
		//		condition implemented by callback.
		// arr: Array
		//		the array to iterate over.
		// callback: Function|String
		//		a function that is invoked with three arguments (item,
		//		index, array). The return of this function is expected to
		//		be a boolean which determines whether the passed-in item
		//		will be included in the returned array.
		// thisObject: Object?
		//		may be used to scope the call to callback
		// returns: Array
		// description:
		//		This function corresponds to the JavaScript 1.6 Array.filter() method, with one difference: when
		//		run over sparse arrays, this implementation passes the "holes" in the sparse array to
		//		the callback function with a value of undefined. JavaScript 1.6's filter skips the holes in the sparse array.
		//		For more details, see:
		//			https://developer.mozilla.org/en/Core_JavaScript_1.5_Reference/Objects/Array/filter
		// example:
		//	| // returns [2, 3, 4]
		//	| dojo.filter([1, 2, 3, 4], function(item){ return item>1; });
	};
	=====*/

	// our old simple function builder stuff
	var cache = {}, u, array; // the export object

	function clearCache(){
		cache = {};
	}

	function buildFn(fn){
		return cache[fn] = new Function("item", "index", "array", fn); // Function
	}
	// magic snippet: if(typeof fn == "string") fn = cache[fn] || buildFn(fn);

	// every & some

	function everyOrSome(some){
		var every = !some;
		return function(a, fn, o){
			var i = 0, l = a && a.length || 0, result;
			if(l && typeof a == "string") a = a.split("");
			if(typeof fn == "string") fn = cache[fn] || buildFn(fn);
			if(o){
				for(; i < l; ++i){
					result = !fn.call(o, a[i], i, a);
					if(some ^ result){
						return !result;
					}
				}
			}else{
				for(; i < l; ++i){
					result = !fn(a[i], i, a);
					if(some ^ result){
						return !result;
					}
				}
			}
			return every; // Boolean
		}
	}
	// var every = everyOrSome(false), some = everyOrSome(true);

	// indexOf, lastIndexOf

	function index(up){
		var delta = 1, lOver = 0, uOver = 0;
		if(!up){
			delta = lOver = uOver = -1;
		}
		return function(a, x, from, last){
			if(last && delta > 0){
				// TODO: why do we use a non-standard signature? why do we need "last"?
				return array.lastIndexOf(a, x, from);
			}
			var l = a && a.length || 0, end = up ? l + uOver : lOver, i;
			if(from === u){
				i = up ? lOver : l + uOver;
			}else{
				if(from < 0){
					i = l + from;
					if(i < 0){
						i = lOver;
					}
				}else{
					i = from >= l ? l + uOver : from;
				}
			}
			if(l && typeof a == "string") a = a.split("");
			for(; i != end; i += delta){
				if(a[i] == x){
					return i; // Number
				}
			}
			return -1; // Number
		}
	}
	// var indexOf = index(true), lastIndexOf = index(false);

	function forEach(a, fn, o){
		var i = 0, l = a && a.length || 0;
		if(l && typeof a == "string") a = a.split("");
		if(typeof fn == "string") fn = cache[fn] || buildFn(fn);
		if(o){
			for(; i < l; ++i){
				fn.call(o, a[i], i, a);
			}
		}else{
			for(; i < l; ++i){
				fn(a[i], i, a);
			}
		}
	}

	function map(a, fn, o, Ctr){
		// TODO: why do we have a non-standard signature here? do we need "Ctr"?
		var i = 0, l = a && a.length || 0, out = new (Ctr || Array)(l);
		if(l && typeof a == "string") a = a.split("");
		if(typeof fn == "string") fn = cache[fn] || buildFn(fn);
		if(o){
			for(; i < l; ++i){
				out[i] = fn.call(o, a[i], i, a);
			}
		}else{
			for(; i < l; ++i){
				out[i] = fn(a[i], i, a);
			}
		}
		return out; // Array
	}

	function filter(a, fn, o){
		// TODO: do we need "Ctr" here like in map()?
		var i = 0, l = a && a.length || 0, out = [], value;
		if(l && typeof a == "string") a = a.split("");
		if(typeof fn == "string") fn = cache[fn] || buildFn(fn);
		if(o){
			for(; i < l; ++i){
				value = a[i];
				if(fn.call(o, value, i, a)){
					out.push(value);
				}
			}
		}else{
			for(; i < l; ++i){
				value = a[i];
				if(fn(value, i, a)){
					out.push(value);
				}
			}
		}
		return out; // Array
	}

	array = {
		every:       everyOrSome(false),
		some:        everyOrSome(true),
		indexOf:     index(true),
		lastIndexOf: index(false),
		forEach:     forEach,
		map:         map,
		filter:      filter,
		clearCache:  clearCache
	};

	has("extend-dojo") && lang.mixin(dojo, array);

	/*===== return dojo.array; =====*/
	return array;
});
