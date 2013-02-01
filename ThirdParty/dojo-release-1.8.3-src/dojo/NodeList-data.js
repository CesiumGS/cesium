define([
	"./_base/kernel", "./query", "./_base/lang", "./_base/array", "./dom-attr"
], function(dojo, query, lang, array, attr){

	// module:
	//		dojo/NodeList-data

	/*=====
	return function(){
		// summary:
		//		Adds data() and removeData() methods to NodeList, and returns NodeList constructor.
	};
	=====*/

	var NodeList = query.NodeList;

	var dataCache = {}, x = 0, dataattr = "data-dojo-dataid",
		dopid = function(node){
			// summary:
			//		Return a uniqueish ID for the passed node reference
			var pid = attr.get(node, dataattr);
			if(!pid){
				pid = "pid" + (x++);
				attr.set(node, dataattr, pid);
			}
			return pid;
		}
	;

	//>>excludeStart("debugging", true);
	// An alias to the private dataCache for NodeList-data. NEVER USE THIS!
	// This private is only exposed for the benefit of unit testing, and is
	// removed during the build process.
	dojo._nodeDataCache = dataCache;
	//>>excludeEnd("debugging");

	var dodata = dojo._nodeData = function(node, key, value){
		// summary:
		//		Private helper for dojo/NodeList.data for single node data access. Refer to NodeList.data
		//		documentation for more information.
		//
		// node: String|DomNode
		//		The node to associate data with
		//
		// key: Object|String?
		//		If an object, act as a setter and iterate over said object setting data items as defined.
		//		If a string, and `value` present, set the data for defined `key` to `value`
		//		If a string, and `value` absent, act as a getter, returning the data associated with said `key`
		//
		// value: Anything?
		//		The value to set for said `key`, provided `key` is a string (and not an object)
		//
		var pid = dopid(node), r;
		if(!dataCache[pid]){ dataCache[pid] = {}; }

		// API discrepency: calling with only a node returns the whole object. $.data throws
		if(arguments.length == 1){ r = dataCache[pid]; }
		if(typeof key == "string"){
			// either getter or setter, based on `value` presence
			if(arguments.length > 2){
				dataCache[pid][key] = value;
			}else{
				r = dataCache[pid][key];
			}
		}else{
			// must be a setter, mix `value` into data hash
			// API discrepency: using object as setter works here
			r = lang.mixin(dataCache[pid], key);
		}

		return r; // Object|Anything|Nothing
	};

	var removeData = dojo._removeNodeData = function(node, key){
		// summary:
		//		Remove some data from this node
		// node: String|DomNode
		//		The node reference to remove data from
		// key: String?
		//		If omitted, remove all data in this dataset.
		//		If passed, remove only the passed `key` in the associated dataset
		var pid = dopid(node);
		if(dataCache[pid]){
			if(key){
				delete dataCache[pid][key];
			}else{
				delete dataCache[pid];
			}
		}
	};

	dojo._gcNodeData = function(){
		// summary:
		//		super expensive: GC all data in the data for nodes that no longer exist in the dom.
		// description:
		//		super expensive: GC all data in the data for nodes that no longer exist in the dom.
		//		MUCH safer to do this yourself, manually, on a per-node basis (via `NodeList.removeData()`)
		//		provided as a stop-gap for exceptionally large/complex applications with constantly changing
		//		content regions (eg: a dijit/layout/ContentPane with replacing data)
		//		There is NO automatic GC going on. If you dojo.destroy() a node, you should _removeNodeData
		//		prior to destruction.
		var livePids = query("[" + dataattr + "]").map(dopid);
		for(var i in dataCache){
			if(array.indexOf(livePids, i) < 0){ delete dataCache[i]; }
		}
	};

	// make nodeData and removeNodeData public on dojo/NodeList:
	lang.extend(NodeList, {
		data: NodeList._adaptWithCondition(dodata, function(a){
			return a.length === 0 || a.length == 1 && (typeof a[0] == "string");
		}),
		removeData: NodeList._adaptAsForEach(removeData)
	});

	/*=====
	 lang.extend(NodeList, {
		 data: function(key, value){
			 // summary:
			 //		stash or get some arbitrary data on/from these nodes.
			 //
			 // description:
			 //		Stash or get some arbitrary data on/from these nodes. This private _data function is
			 //		exposed publicly on `dojo/NodeList`, eg: as the result of a `dojo.query` call.
			 //		DIFFERS from jQuery.data in that when used as a getter, the entire list is ALWAYS
			 //		returned. EVEN WHEN THE LIST IS length == 1.
			 //
			 //		A single-node version of this function is provided as `dojo._nodeData`, which follows
			 //		the same signature, though expects a String ID or DomNode reference in the first
			 //		position, before key/value arguments.
			 //
			 // node: String|DomNode
			 //		The node to associate data with
			 //
			 // key: Object|String?
			 //		If an object, act as a setter and iterate over said object setting data items as defined.
			 //		If a string, and `value` present, set the data for defined `key` to `value`
			 //		If a string, and `value` absent, act as a getter, returning the data associated with said `key`
			 //
			 // value: Anything?
			 //		The value to set for said `key`, provided `key` is a string (and not an object)
			 //
			 // example:
			 //		Set a key `bar` to some data, then retrieve it.
			 //	|	dojo.query(".foo").data("bar", "touched");
			 //	|	var touched = dojo.query(".foo").data("bar");
			 //	|	if(touched[0] == "touched"){ alert('win'); }
			 //
			 // example:
			 //		Get all the data items for a given node.
			 //	|	var list = dojo.query(".foo").data();
			 //	|	var first = list[0];
			 //
			 // example:
			 //		Set the data to a complex hash. Overwrites existing keys with new value
			 //	|	dojo.query(".foo").data({ bar:"baz", foo:"bar" });
			 //		Then get some random key:
			 //	|	dojo.query(".foo").data("foo"); // returns [`bar`]
			 //
			 // returns: Object|Anything|Nothing
			 //		When used as a setter via `dojo/NodeList`, a NodeList instance is returned
			 //		for further chaining. When used as a getter via `dojo/NodeList` an ARRAY
			 //		of items is returned. The items in the array correspond to the elements
			 //		in the original list. This is true even when the list length is 1, eg:
			 //		when looking up a node by ID (#foo)
		 },

		 removeData: function(key){
			 // summary:
			 //		Remove the data associated with these nodes.
			 // key: String?
			 //		If omitted, clean all data for this node.
			 //		If passed, remove the data item found at `key`
		 }
	 });
	 =====*/

// TODO: this is the basic implementation of adaptWithCondtionAndWhenMappedConsiderLength, for lack of a better API name
// it conflicts with the the `dojo/NodeList` way: always always return an arrayLike thinger. Consider for 2.0:
//
//	NodeList.prototype.data = function(key, value){
//		var a = arguments, r;
//		if(a.length === 0 || a.length == 1 && (typeof a[0] == "string")){
//			r = this.map(function(node){
//				return d._data(node, key);
//			});
//			if(r.length == 1){ r = r[0]; } // the offending line, and the diff on adaptWithCondition
//		}else{
//			r = this.forEach(function(node){
//				d._data(node, key, value);
//			});
//		}
//		return r; // NodeList|Array|SingleItem
//	};

	return NodeList;

});
