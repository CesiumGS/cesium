define([
	"dojo/_base/lang",
	"dojo/Stateful"
], function(lang, Stateful){
	function update(/*dojox/mvc/StatefulArray*/ a){
		// summary:
		//		Set all array elements as stateful so that watch function runs.
		// a: dojox/mvc/StatefulArray
		//		The array.

		// Notify change of elements.
		if(a._watchElementCallbacks){
			a._watchElementCallbacks();
		}

		return a; // dojox/mvc/StatefulArray
	}

	var StatefulArray = function(/*Anything[]*/ a){
		// summary:
		//		An inheritance of native JavaScript array, that adds dojo/Stateful capability.
		// description:
		//		Supported methods are:
		//
		//		- pop() - Stateful update is done for the removed element, as well as the length.
		//		- push() - Stateful update is done for the added element, as well as the length.
		//		- reverse() - Stateful update is done for the elements.
		//		- shift() - Stateful update is done for the removed element, as well as the length.
		//		- sort() - Stateful update is done for the elements.
		//		- splice() - Stateful update is done for the removed/added elements, as well as the length. Returns an instance of StatefulArray instead of the native array.
		//		- unshift() - Stateful update is done for the added element, as well as the length.
		//		- concat() - Returns an instance of StatefulArray instead of the native Array.
		//		- join() - The length as well as the elements are obtained via stateful getters, instead of direct access.
		//		- slice() - The length as well as the elements are obtained via stateful getters, instead of direct access.
		//		- Setting an element to this array via set() - Stateful update is done for the new element as well as the new length.
		//		- Setting a length to this array via set() - Stateful update is done for the removed/added elements as well as the new length.

		var array = lang._toArray(a);
		var ctor = StatefulArray;
		ctor._meta = {bases: [Stateful]}; // For isInstanceOf()
		array.constructor = ctor;
		return lang.mixin(array, {
			pop: function(){
				return this.splice(this.get("length") - 1, 1)[0];
			},
			push: function(){
				this.splice.apply(this, [this.get("length"), 0].concat(lang._toArray(arguments)));
				return this.get("length");
			},
			reverse: function(){
				return update([].reverse.apply(this, lang._toArray(arguments)));
			},
			shift: function(){
				return this.splice(0, 1)[0];
			},
			sort: function(){
				return update([].sort.apply(this, lang._toArray(arguments)));
			},
			splice: function(/*Number*/ idx, /*Number*/ n){
				// summary:
				//		Removes and then adds some elements to an array.
				//		Updates the removed/added elements, as well as the length, as stateful.
				// idx: Number
				//		The index where removal/addition should be done.
				// n: Number
				//		How many elements to be removed at idx.
				// varargs: Anything[]
				//		The elements to be added to idx.
				// returns: dojox/mvc/StatefulArray
				//		The removed elements.

				var l = this.get("length");

				idx += idx < 0 ? l : 0;

				var p = Math.min(idx, l),
				 removals = this.slice(idx, idx + n),
				 adds = lang._toArray(arguments).slice(2);

				// Do the modification in a native manner except for setting additions
				[].splice.apply(this, [idx, n].concat(new Array(adds.length)));

				// Set additions in a stateful manner
				for(var i = 0; i < adds.length; i++){
					this.set(p + i, adds[i]);
				}

				// Notify change of elements.
				if(this._watchElementCallbacks){
					this._watchElementCallbacks(idx, removals, adds);
				}

				// Notify change of length.
				// Not calling the setter for "length" though, given removal/addition of array automatically changes the length.
				if(this._watchCallbacks){
					this._watchCallbacks("length", l, l - removals.length + adds.length);
				}

				return removals; // dojox/mvc/StatefulArray
			},
			unshift: function(){
				this.splice.apply(this, [0, 0].concat(lang._toArray(arguments)));
				return this.get("length");
			},
			concat: function(/*Array*/ a){
				return new StatefulArray([].concat(this).concat(a));
			},
			join: function(/*String*/ sep){
				// summary:
				//		Returns a string joining string elements in a, with a separator.
				// sep: String
				//		The separator.

				var list = [];
				for(var l = this.get("length"), i = 0; i < l; i++){
					list.push(this.get(i));
				}
				return list.join(sep); // String
			},
			slice: function(/*Number*/ start, /*Number*/ end){
				// summary:
				//		Returns partial elements of an array.
				// start: Number
				//		The index to begin with.
				// end: Number
				//		The index to end at. (a[end] won't be picked up)

				var l = this.get("length");

				start += start < 0 ? l : 0;
				end = (end === void 0 ? l : end) + (end < 0 ? l : 0);

				var slice = [];
				for(var i = start || 0; i < Math.min(end, this.get("length")); i++){
					slice.push(this.get(i));
				}
				return new StatefulArray(slice); // dojox/mvc/StatefuArray
			},
			watchElements: function(/*Function*/ callback){
				// summary:
				//		Watch for change in array elements.
				// callback: Function
				//		The callback function, which should take: The array index, the removed elements, and the added elements.

				var callbacks = this._watchElementCallbacks, _self = this;
				if(!callbacks){
					callbacks = this._watchElementCallbacks = function(idx, removals, adds){
						for(var list = [].concat(callbacks.list), i = 0; i < list.length; i++){
							list[i].call(_self, idx, removals, adds);
						}
					};
					callbacks.list = [];
				}

				callbacks.list.push(callback);

				var h = {};
				h.unwatch = h.remove = function(){
					for(var list = callbacks.list, i = 0; i < list.length; i++){
						if(list[i] == callback){
							list.splice(i, 1);
							break;
						}
					}
				}; 
				return h; // dojo/handle
			}
		}, Stateful.prototype, {
			set: function(/*Number|String*/ name, /*Anything*/ value){
				// summary:
				//		Sets a new value to an array.
				// name: Number|String
				//		The property name.
				// value: Anything
				//		The new value.

				if(name == "length"){
					var old = this.get("length");
					if(old < value){
						this.splice.apply(this, [old, 0].concat(new Array(value - old)));
					}else if(value > old){
						this.splice.apply(this, [value, old - value]);
					}
					return this;
				}else{
					var oldLength = this.length;
					Stateful.prototype.set.call(this, name, value);
					if(oldLength != this.length){
						Stateful.prototype.set.call(this, "length", this.length);
					}
					return this;
				}
			}
		});
	};

	return lang.setObject("dojox.mvc.StatefulArray", StatefulArray);
});
