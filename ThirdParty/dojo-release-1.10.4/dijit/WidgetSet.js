define([
	"dojo/_base/array", // array.forEach array.map
	"dojo/_base/declare", // declare
	"dojo/_base/kernel", // kernel.global
	"./registry"	// to add functions to dijit.registry
], function(array, declare, kernel, registry){

	// module:
	//		dijit/WidgetSet

	var WidgetSet = declare("dijit.WidgetSet", null, {
		// summary:
		//		A set of widgets indexed by id.
		//		Deprecated, will be removed in 2.0.
		//
		// example:
		//		Create a small list of widgets:
		//		|	require(["dijit/WidgetSet", "dijit/registry"],
		//		|		function(WidgetSet, registry){
		//		|		var ws = new WidgetSet();
		//		|		ws.add(registry.byId("one"));
		//		|		ws.add(registry.byId("two"));
		//		|		// destroy both:
		//		|		ws.forEach(function(w){ w.destroy(); });
		//		|	});

		constructor: function(){
			this._hash = {};
			this.length = 0;
		},

		add: function(/*dijit/_WidgetBase*/ widget){
			// summary:
			//		Add a widget to this list. If a duplicate ID is detected, a error is thrown.
			//
			// widget: dijit/_WidgetBase
			//		Any dijit/_WidgetBase subclass.
			if(this._hash[widget.id]){
				throw new Error("Tried to register widget with id==" + widget.id + " but that id is already registered");
			}
			this._hash[widget.id] = widget;
			this.length++;
		},

		remove: function(/*String*/ id){
			// summary:
			//		Remove a widget from this WidgetSet. Does not destroy the widget; simply
			//		removes the reference.
			if(this._hash[id]){
				delete this._hash[id];
				this.length--;
			}
		},

		forEach: function(/*Function*/ func, /* Object? */thisObj){
			// summary:
			//		Call specified function for each widget in this set.
			//
			// func:
			//		A callback function to run for each item. Is passed the widget, the index
			//		in the iteration, and the full hash, similar to `array.forEach`.
			//
			// thisObj:
			//		An optional scope parameter
			//
			// example:
			//		Using the default `dijit.registry` instance:
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		registry.forEach(function(widget){
			//		|			console.log(widget.declaredClass);
			//		|		});
			//		|	});
			//
			// returns:
			//		Returns self, in order to allow for further chaining.

			thisObj = thisObj || kernel.global;
			var i = 0, id;
			for(id in this._hash){
				func.call(thisObj, this._hash[id], i++, this._hash);
			}
			return this;	// dijit/WidgetSet
		},

		filter: function(/*Function*/ filter, /* Object? */thisObj){
			// summary:
			//		Filter down this WidgetSet to a smaller new WidgetSet
			//		Works the same as `array.filter` and `NodeList.filter`
			//
			// filter:
			//		Callback function to test truthiness. Is passed the widget
			//		reference and the pseudo-index in the object.
			//
			// thisObj: Object?
			//		Option scope to use for the filter function.
			//
			// example:
			//		Arbitrary: select the odd widgets in this list
			//		|	
			//		|		
			//		|	
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		registry.filter(function(w, i){
			//		|			return i % 2 == 0;
			//		|		}).forEach(function(w){ /* odd ones */ });
			//		|	});

			thisObj = thisObj || kernel.global;
			var res = new WidgetSet(), i = 0, id;
			for(id in this._hash){
				var w = this._hash[id];
				if(filter.call(thisObj, w, i++, this._hash)){
					res.add(w);
				}
			}
			return res; // dijit/WidgetSet
		},

		byId: function(/*String*/ id){
			// summary:
			//		Find a widget in this list by it's id.
			// example:
			//		Test if an id is in a particular WidgetSet
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		var ws = new WidgetSet();
			//		|		ws.add(registry.byId("bar"));
			//		|		var t = ws.byId("bar") // returns a widget
			//		|		var x = ws.byId("foo"); // returns undefined
			//		|	});

			return this._hash[id];	// dijit/_WidgetBase
		},

		byClass: function(/*String*/ cls){
			// summary:
			//		Reduce this widgetset to a new WidgetSet of a particular `declaredClass`
			//
			// cls: String
			//		The Class to scan for. Full dot-notated string.
			//
			// example:
			//		Find all `dijit.TitlePane`s in a page:
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		registry.byClass("dijit.TitlePane").forEach(function(tp){ tp.close(); });
			//		|	});

			var res = new WidgetSet(), id, widget;
			for(id in this._hash){
				widget = this._hash[id];
				if(widget.declaredClass == cls){
					res.add(widget);
				}
			 }
			 return res; // dijit/WidgetSet
		},

		toArray: function(){
			// summary:
			//		Convert this WidgetSet into a true Array
			//
			// example:
			//		Work with the widget .domNodes in a real Array
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		array.map(registry.toArray(), function(w){ return w.domNode; });
			//		|	});


			var ar = [];
			for(var id in this._hash){
				ar.push(this._hash[id]);
			}
			return ar;	// dijit/_WidgetBase[]
		},

		map: function(/* Function */func, /* Object? */thisObj){
			// summary:
			//		Create a new Array from this WidgetSet, following the same rules as `array.map`
			// example:
			//		|	require(["dijit/WidgetSet", "dijit/registry"],
			//		|		function(WidgetSet, registry){
			//		|		var nodes = registry.map(function(w){ return w.domNode; });
			//		|	});
			//
			// returns:
			//		A new array of the returned values.
			return array.map(this.toArray(), func, thisObj); // Array
		},

		every: function(func, thisObj){
			// summary:
			//		A synthetic clone of `array.every` acting explicitly on this WidgetSet
			//
			// func: Function
			//		A callback function run for every widget in this list. Exits loop
			//		when the first false return is encountered.
			//
			// thisObj: Object?
			//		Optional scope parameter to use for the callback

			thisObj = thisObj || kernel.global;
			var x = 0, i;
			for(i in this._hash){
				if(!func.call(thisObj, this._hash[i], x++, this._hash)){
					return false; // Boolean
				}
			}
			return true; // Boolean
		},

		some: function(func, thisObj){
			// summary:
			//		A synthetic clone of `array.some` acting explicitly on this WidgetSet
			//
			// func: Function
			//		A callback function run for every widget in this list. Exits loop
			//		when the first true return is encountered.
			//
			// thisObj: Object?
			//		Optional scope parameter to use for the callback

			thisObj = thisObj || kernel.global;
			var x = 0, i;
			for(i in this._hash){
				if(func.call(thisObj, this._hash[i], x++, this._hash)){
					return true; // Boolean
				}
			}
			return false; // Boolean
		}

	});

	// Add in 1.x compatibility methods to dijit/registry.
	// These functions won't show up in the API doc but since they are deprecated anyway,
	// that's probably for the best.
	array.forEach(["forEach", "filter", "byClass", "map", "every", "some"], function(func){
		registry[func] = WidgetSet.prototype[func];
	});


	return WidgetSet;
});
