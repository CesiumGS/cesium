define(["../../_base/array", "../../_base/lang", "../../when"
], function(array, lang, when){

// module:
//		dojo/store/util/QueryResults

var QueryResults = function(results){
	// summary:
	//		A function that wraps the results of a store query with additional
	//		methods.
	// description:
	//		QueryResults is a basic wrapper that allows for array-like iteration
	//		over any kind of returned data from a query.  While the simplest store
	//		will return a plain array of data, other stores may return deferreds or
	//		promises; this wrapper makes sure that *all* results can be treated
	//		the same.
	//
	//		Additional methods include `forEach`, `filter` and `map`.
	// results: Array|dojo/promise/Promise
	//		The result set as an array, or a promise for an array.
	// returns:
	//		An array-like object that can be used for iterating over.
	// example:
	//		Query a store and iterate over the results.
	//
	//	|	store.query({ prime: true }).forEach(function(item){
	//	|		//	do something
	//	|	});

	if(!results){
		return results;
	}

	var isPromise = !!results.then;
	// if it is a promise it may be frozen
	if(isPromise){
		results = lang.delegate(results);
	}
	function addIterativeMethod(method){
		// Always add the iterative methods so a QueryResults is
		// returned whether the environment is ES3 or ES5
		results[method] = function(){
			var args = arguments;
			var result = when(results, function(results){
				Array.prototype.unshift.call(args, results);
				return QueryResults(array[method].apply(array, args));
			});
			// forEach should only return the result of when()
			// when we're wrapping a promise
			if(method !== "forEach" || isPromise){
				return result;
			}
		};
	}

	addIterativeMethod("forEach");
	addIterativeMethod("filter");
	addIterativeMethod("map");
	if(results.total == null){
		results.total = when(results, function(results){
			return results.length;
		});
	}
	return results; // Object
};

lang.setObject("dojo.store.util.QueryResults", QueryResults);

return QueryResults;

});
