dojo.provide("dojox.wire.TreeAdapter");

dojo.require("dojox.wire.CompositeWire");

dojo.declare("dojox.wire.TreeAdapter", dojox.wire.CompositeWire, {
	//	summary:
	//		A composite Wire for tree nodes
	//	description:
	//		This class has multiple child Wires for tree nodes, their title and
	//		child nodes.
	//		The root object for this class must be an array.
	//		'node' Wires in 'nodes' property is used to identify an object
	//		representing a node.
	//		'title' Wires in 'nodes' property is used to get the title string
	//		of a node.
	//		'children' Wires in 'nodes' property is used to iterate over child
	//		node objects.
	//		The node values are returned in an array as follows:
	//			[
	//				{title: title1,
	//		  	 	children: [
	//					{title: title2,
	//					 child: ...},
	//					{title: title3,
	//					 child: ...},
	//					...
	//				]},
	//				...
	//			]
	//		This class only supports getValue(), but not setValue().
	
	_wireClass: "dojox.wire.TreeAdapter",
	
	constructor: function(/*Object*/args){
		//	summary:
		//		Initialize properties
		//	description:
		//		If object properties ('node', 'title' and 'children') of array
		//		elements specified in 'nodes' property are not Wires, Wires are
		//		created from them as arguments, with 'parent' property set to
		//		this Wire instance.
		//	args:
		//		Arguments to initialize properties
		//		nodes:
		//			An array containing objects for child Wires for node values
		this._initializeChildren(this.nodes);
	},
	_getValue: function(/*Array*/object){
		//	summary:
		//		Return an array of tree node values
		//	description:
		//		This method iterates over an array specified to 'object'
		//		argument and calls getValue() method of 'node' Wires with each
		//		element of the array to get object(s) that represetns nodes.
		//		(If 'node' Wires are omitted, the array element is used for
		//		further processing.)
		//		Then, getValue() method of 'title' Wires are called to get
		//		title strings for nodes.
		//		(If 'title' Wires are omitted, the objects representing nodes
		//		are used as title strings.)
		//		And if an array of objects with 'node' and 'title' Wires is
		//		specified to 'children', it is used to gather child nodes and
		//		their title strings in the same way recursively.
		//		Finally, an array of the top-level node objects are retuned.
		//	object:
		//		A root array
		//	returns:
		//		An array of tree node values
		if(!object || !this.nodes){
			return object; //Array
		}

		var array = object;
		if(!dojo.isArray(array)){
			array = [array];
		}

		var nodes = [];
		for(var i in array){
			for(var i2 in this.nodes){
				nodes = nodes.concat(this._getNodes(array[i], this.nodes[i2]));
			}
		}
		return nodes; //Array
	},

	_setValue: function(/*Array*/object, /*Array*/value){
		//	summary:
		//		Not supported
		throw new Error("Unsupported API: " + this._wireClass + "._setValue");
	},

	_initializeChildren: function(/*Array*/children){
		//	summary:
		//		Initialize child Wires
		//	description:
		//		If 'node' or 'title' properties of array elements specified in
		//		'children' argument are not Wires, Wires are created from them
		//		as arguments, with 'parent' property set to this Wire instance.
		//		If an array element has 'children' property, this method is
		//		called recursively with it.
		//	children:
		//		An array of objects containing child Wires
		if(!children){
			return; //undefined
		}

		for(var i in children){
			var child = children[i];
			if(child.node){
				child.node.parent = this;
				if(!dojox.wire.isWire(child.node)){
					child.node = dojox.wire.create(child.node);
				}
			}
			if(child.title){
				child.title.parent = this;
				if(!dojox.wire.isWire(child.title)){
					child.title = dojox.wire.create(child.title);
				}
			}
			if(child.children){
				this._initializeChildren(child.children);
			}
		}
	},

	_getNodes: function(/*Object*/object, /*Object*/child){
		//	summary:
		//		Return an array of tree node values
		//	description:
		//		This method calls getValue() method of 'node' Wires with
		//		'object' argument to get object(s) that represents nodes.
		//		(If 'node' Wires are omitted, 'object' is used for further
		//		processing.)
		//		Then, getValue() method of 'title' Wires are called to get
		//		title strings for nodes.
		//		(If 'title' Wires are omitted, the objects representing nodes
		//		are used as title strings.)
		//		And if an array of objects with 'node' and 'title' Wires is
		//		specified to 'children', it is used to gather child nodes and
		//		their title strings in the same way recursively.
		//		Finally, an array of node objects are returned.
		//	object:
		//		An object
		//	child:
		//		An object with child Wires
		//	returns:
		var array = null;
		if(child.node){
			array = child.node.getValue(object);
			if(!array){
				return [];
			}
			if(!dojo.isArray(array)){
				array = [array];
			}
		}else{
			array = [object];
		}

		var nodes = [];
		for(var i in array){
			object = array[i];
			var node = {};
			if(child.title){
				node.title = child.title.getValue(object);
			}else{
				node.title = object;
			}
			if(child.children){
				var children = [];
				for(var i2 in child.children){
					children = children.concat(this._getNodes(object, child.children[i2]));
				}
				if(children.length > 0){
					node.children = children;
				}
			}
			nodes.push(node);
		}
		return nodes; //Array
	}
});
