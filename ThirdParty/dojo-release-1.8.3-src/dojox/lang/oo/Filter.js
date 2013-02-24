dojo.provide("dojox.lang.oo.Filter");

(function(){
	var oo = dojox.lang.oo,

	F = oo.Filter = function(bag, filter){
		// summary:
		//		Filter to control mixing in objects by skipping
		//		properties and renaming them.
		// description:
		//		This object is used as a holder of an original object
		//		(whose properties are to be copied), and a filter
		//		function used while copying by dojox.lang.oo.mixin.
		// bag: Object
		//		object to be filtered
		// filter: Function|Object
		//		a function to handle the name filtering,
		//		or an object with exec() method
		this.bag = bag;
		this.filter = typeof filter == "object" ?
			function(){ return filter.exec.apply(filter, arguments); } : filter;
	},

	// the default map-based filter object
	MapFilter = function(map){
		this.map = map;
	};

	MapFilter.prototype.exec = function(name){
		return this.map.hasOwnProperty(name) ? this.map[name] : name;
	};

	oo.filter = function(bag, map){
		// summary:
		//		creates a simple filter object
		// bag: Object
		//		object to be filtered
		// map: Object
		//		the dictionary for renaming/removing while copying
		// returns:
		//		new dojox.lang.oo.Filter object
		return new F(bag, new MapFilter(map));
	};
})();
