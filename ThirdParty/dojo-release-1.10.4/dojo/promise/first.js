define([
	"../_base/array",
	"../Deferred",
	"../when"
], function(array, Deferred, when){
	"use strict";

	// module:
	//		dojo/promise/first

	var forEach = array.forEach;

	return function first(objectOrArray){
		// summary:
		//		Takes multiple promises and returns a new promise that is fulfilled
		//		when the first of these promises is fulfilled.
		// description:
		//		Takes multiple promises and returns a new promise that is fulfilled
		//		when the first of these promises is fulfilled. Canceling the returned
		//		promise will *not* cancel any passed promises. The promise will be
		//		fulfilled with the value of the first fulfilled promise.
		// objectOrArray: Object|Array?
		//		The promises are taken from the array or object values. If no value
		//		is passed, the returned promise is resolved with an undefined value.
		// returns: dojo/promise/Promise

		var array;
		if(objectOrArray instanceof Array){
			array = objectOrArray;
		}else if(objectOrArray && typeof objectOrArray === "object"){
			array = [];
			for(var key in objectOrArray){
				if(Object.hasOwnProperty.call(objectOrArray, key)){
					array.push(objectOrArray[key]);
				}
			}
		}

		if(!array || !array.length){
			return new Deferred().resolve();
		}

		var deferred = new Deferred();
		forEach(array, function(valueOrPromise){
			when(valueOrPromise, deferred.resolve, deferred.reject);
		});
		return deferred.promise;	// dojo/promise/Promise
	};
});
