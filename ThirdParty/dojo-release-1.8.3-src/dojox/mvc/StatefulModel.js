define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/Stateful",
	"./getStateful",
	"./getPlainValue",
	"./StatefulArray"
], function(kernel, lang, array, declare, Stateful, getStateful, getPlainValue, StatefulArray){

	kernel.deprecated("dojox/mvc/StatefulModel", "Use dojox/mvc/getStateful, dojox/mvc/getPlainValue, dojox/mvc/StatefulArray or one of the dojox/mvc/*RefControllers instead");

	var StatefulModel = declare("dojox.mvc.StatefulModel", [Stateful], {
		// summary:
		//		Deprecated.  Use dojox/mvc/getStateful, dojox/mvc/getPlainValue, dojox/mvc/StatefulArray or one of the dojox/mvc/*RefControllers instead.
		//		The first-class native JavaScript data model based on dojo/Stateful
		//		that wraps any data structure(s) that may be relevant for a view,
		//		a view portion, a dijit or any custom view layer component.
		//
		// description:
		//		A data model is effectively instantiated with a plain JavaScript
		//		object which specifies the initial data structure for the model.
		//
		//		|	var struct = {
		//		|		order	: "abc123",
		//		|		shipto	: {
		//		|			address	: "123 Example St, New York, NY",
		//		|			phone	: "212-000-0000"
		//		|		},
		//		|		items : [
		//		|			{ part : "x12345", num : 1 },
		//		|			{ part : "n09876", num : 3 }
		//		|		]
		//		|	};
		//		|
		//		|	var model = dojox/mvc.newStatefulModel({ data : struct });
		//
		//		The simple example above shows an inline plain JavaScript object
		//		illustrating the data structure to prime the model with, however
		//		the underlying data may be made available by other means, such as
		//		from the results of a dojo/store or dojo/data query.
		//
		//		To deal with stores providing immediate values or Promises, a
		//		factory method for model instantiation is provided. This method
		//		will either return an immediate model or a model Promise depending
		//		on the nature of the store.
		//
		//		|	var model = mvc.newStatefulModel({ store: someStore });
		//
		//		The created data model has the following properties:
		//
		//		- It enables dijits or custom components in the view to "bind" to
		//		  data within the model. A bind creates a bi-directional update
		//		  mechanism between the bound view and the underlying data:
		//
		//		a) The data model is "live" data i.e. it maintains any updates
		//		driven by the view on the underlying data.
		//
		//		b) The data model issues updates to portions of the view if the
		//		data they bind to is updated in the model. For example, if two
		//		dijits are bound to the same part of a data model, updating the
		//		value of one in the view will cause the data model to issue an
		//		update to the other containing the new value.
		//
		//		- The data model internally creates a tree of dojo/Stateful
		//		  objects that matches the input, which is effectively a plain
		//		  JavaScript object i.e. "pure data". This tree allows dijits or
		//		  other view components to bind to any node within the data model.
		//		  Typically, dijits with simple values bind to leaf nodes of the
		//		  datamodel, whereas containers bind to internal nodes of the
		//		  datamodel. For example, a datamodel created using the object below
		//		  will generate the dojo/Stateful tree as shown:
		//
		//		|	var model = dojox/mvc/newStatefulModel({ data : {
		//		|		prop1	: "foo",
		//		|		prop2	: {
		//		|			leaf1	: "bar",
		//		|			leaf2	: "baz"
		//		|		}
		//		|	}});
		//		|
		//		|	// The created dojo/Stateful tree is illustrated below (all nodes are dojo/Stateful objects)
		//		|	//
		//		|	//		            o  (root node)
		//		|	//		           / \
		//		|	//	 (prop1 node) o   o (prop2 node)
		//		|	//		             / \
		//		|	//	   (leaf1 node)	o   o (leaf2 node)
		//		|	//
		//		|	// The root node is accessed using the expression "model" (the var name above). The prop1
		//		|	// node is accessed using the expression "model.prop1", the leaf2 node is accessed using
		//		|	// the expression "model.prop2.leaf2" and so on.
		//
		//		- Each of the dojo/Stateful nodes in the model may store data as well
		//		  as associated "meta-data", which includes things such as whether
		//		  the data is required or readOnly etc. This meta-data differs from
		//		  that maintained by, for example, an individual dijit in that this
		//		  is maintained by the datamodel and may therefore be affected by
		//		  datamodel-level constraints that span multiple dijits or even
		//		  additional criteria such as server-side computations.
		//
		//		- When the model is backed by a dojo/store or dojo/data query, the
		//		  client-side updates can be persisted once the client is ready to
		//		  "submit" the changes (which may include both value changes or
		//		  structural changes - adds/deletes). The datamodel allows control
		//		  over when the underlying data is persisted i.e. this can be more
		//		  incremental or batched per application needs.
		//
		//		There need not be a one-to-one association between a datamodel and
		//		a view or portion thereof. For example, multiple datamodels may
		//		back the dijits in a view. Indeed, this may be useful where the
		//		binding data comes from a number of data sources or queries, for
		//		example. Just as well, dijits from multiple portions of the view
		//		may be bound to a single datamodel.
		//
		//		Finally, requiring this class also enables all dijits to become data
		//		binding aware. The data binding is commonly specified declaratively
		//		via the "ref" property in the "data-dojo-props" attribute value.
		//
		//		To illustrate, the following is the "Hello World" of such data-bound
		//		widget examples:
		//
		//
		//		|	<script>
		//		|		var model;
		//		|		require(["dojox/mvc", "dojo/parser"], function(mvc, parser){
		//		|			model = mvc.newStatefulModel({ data : {
		//		|				hello : "Hello World"
		//		|			}});
		//		|			parser.parse();
		//		|		});
		//		|	</script>
		//		|
		//		|	<input id="helloInput" data-dojo-type="dijit/form/TextBox"
		//		|		data-dojo-props="ref: 'model.hello'">
		//
		//		Such data binding awareness for dijits is added by extending the
		//		dijit/_WidgetBase class to include data binding capabilities
		//		provided by dojox/mvc/_DataBindingMixin, and this class declares a
		//		dependency on dojox/mvc/_DataBindingMixin.
		//
		//		The presence of a data model and the data-binding capabilities
		//		outlined above support the flexible development of a number of MVC
		//		patterns on the client. As an example, CRUD operations can be
		//		supported with minimal application code.
		//
		// tags:
		//		deprecated
	
		// data: Object
		//		The plain JavaScript object / data structure used to initialize
		//		this model. At any point in time, it holds the lasted saved model
		//		state.
		//		Either data or store property must be provided.
		data: null,

		// store: dojo/store/DataStore
		//		The data store from where to retrieve initial data for this model.
		//		An optional query may also be provided along with this store.
		//		Either data or store property must be provided.
		store: null,
	
		// valid: boolean
		//		Whether this model deems the associated data to be valid.
		valid: true,

		// value: Object
		//		The associated value (if this is a leaf node). The value of
		//		intermediate nodes in the model is not defined.
		value: "",

		//////////////////////// PUBLIC METHODS / API ////////////////////////

		reset: function(){
			// summary:
			//		Resets this data model values to its original state.
			//		Structural changes to the data model (such as adds or removes)
			//		are not restored.
			if(lang.isObject(this.data) && !(this.data instanceof Date) && !(this.data instanceof RegExp)){	
				for(var x in this){
					if(this[x] && lang.isFunction(this[x].reset)){
						this[x].reset();
					}
				}
			}else{
				this.set("value", this.data);
			}
		},

		commit: function(/*"dojo/store/DataStore?"*/ store){
			// summary:
			//		Commits this data model:
			//
			//		- Saves the current state such that a subsequent reset will not
			//		  undo any prior changes.
			//		- Persists client-side changes to the data store, if a store
			//		  has been supplied as a parameter or at instantiation.
			// store:
			//		dojo/store/DataStore
			//		Optional dojo/store/DataStore to use for this commit, if none
			//		provided but one was provided at instantiation time, that store
			//		will be used instead.
			this._commit();
			var ds = store || this.store;
			if(ds){
				this._saveToStore(ds);
			}
		},

		toPlainObject: function(){
			// summary:
			//		Produces a plain JavaScript object representation of the data
			//		currently within this data model.
			// returns:
			//		Object
			//		The plain JavaScript object representation of the data in this
			//		model.
			return getPlainValue(this, StatefulModel.getPlainValueOptions);
		},

		splice: function(/*Number*/ idx, /*Number*/ n){
			// summary:
			//		Removes and then adds some elements to this array.
			//		Updates the removed/added elements, as well as the length, as stateful.
			// idx: Number
			//		The index where removal/addition should be done.
			// n: Number
			//		How many elements to be removed at idx.
			// varargs: Anything[]
			//		The elements to be added to idx.
			// returns: dojox/mvc/StatefulArray
			//		The removed elements.

			var a = (new StatefulArray([])).splice.apply(this, lang._toArray(arguments));
			for(var i = 0; i < a.length; i++){
				(this._removals = this._removals || []).push(a[i].toPlainObject());
			}
			return a;
		},

		add: function(/*String*/ name, /*dojo/Stateful*/ stateful){
			// summary:
			//		Adds a dojo/Stateful tree represented by the given
			//		dojox/mvc/StatefulModel at the given property name.
			// name:
			//		The property name to use whose value will become the given
			//		dijit/Stateful tree.
			// stateful:
			//		The dojox/mvc/StatefulModel to insert.
			// description:
			//		In case of arrays, the property names are indices passed
			//		as Strings. An addition of such a dojo/Stateful node
			//		results in right-shifting any trailing sibling nodes.

			if(typeof this.get("length") === "number" && /^[0-9]+$/.test(name.toString())){
				if(this.get("length") < (name - 0)){
					throw new Error("Out of bounds insert attempted, must be contiguous.");
				}
				this.splice(name - 0, 0, stateful);
			}else{
				this.set(name, stateful);
			}
		},

		remove: function(/*String*/ name){
			// summary:
			//		Removes the dojo/Stateful tree at the given property name.
			// name:
			//		The property name from where the tree will be removed.
			// description:
			//		In case of arrays, the property names are indices passed
			//		as Strings. A removal of such a dojo/Stateful node
			//		results in left-shifting any trailing sibling nodes.
			if(typeof this.get("length") === "number" && /^[0-9]+$/.test(name.toString())){
				if(!this.get(name)){
					throw new Error("Out of bounds delete attempted - no such index: " + n);
				}else{
					this.splice(name - 0, 1);
				}
			}else{
				var elem = this.get(name);
				if(!elem){
					throw new Error("Illegal delete attempted - no such property: " + name);
				}else{
					this._removals = this._removals || [];
					this._removals.push(elem.toPlainObject());
					this.set(name, undefined);
					delete this[name];
				}
			}
		},

		valueOf: function(){
			// summary:
			//		Returns the value representation of the data currently within this data model.
			// returns:
			//		Object
			//		The object representation of the data in this model.
			return this.toPlainObject();
		},

		toString: function(){
			// summary:
			//		Returns the string representation of the data currently within this data model.
			// returns:
			//		String
			//		The object representation of the data in this model.
			return this.value === "" && this.data ? this.data.toString() : this.value.toString();
		},

		//////////////////////// PRIVATE INITIALIZATION METHOD ////////////////////////

		constructor: function(/*Object*/ args){
			// summary:
			//		Instantiates a new data model that view components may bind to.
			//		This is a private constructor, use the factory method
			//		instead: dojox/mvc/newStatefulModel(args)
			// args:
			//		The mixin properties.
			// description:
			//		Creates a tree of dojo/Stateful objects matching the initial
			//		data structure passed as input. The mixin property "data" is
			//		used to provide a plain JavaScript object directly representing
			//		the data structure.
			// tags:
			//		private
			var data = (args && "data" in args) ? args.data : this.data;
			this._createModel(data);
		},

		//////////////////////// PRIVATE METHODS ////////////////////////

		_createModel: function(/*Object*/ data){
			// summary:
			//		Create this data model from provided input data.
			//	obj:
			//		The input for the model, as a plain JavaScript object.
			// tags:
			//		private

			if(data != null){
				data = getStateful(data, StatefulModel.getStatefulOptions);
				if(lang.isArray(data)){
					// Some consumers of dojox/mvc/StatefulModel inherits it via dojo/declare(), where we cannot use array inheritance technique
					// (dojo/declare() does not support return value in constructor)
					this.length = 0;
					[].splice.apply(this, data);
				}else if(lang.isObject(data)){
					for(var s in data){
						if(data.hasOwnProperty(s)){
							this[s] = data[s];
						}
					}
				}else{
					this.set("value", data);
				}
			}
		},

		_commit: function(){
			// summary:
			//		Commits this data model, saves the current state into data to become the saved state, 
			//		so a reset will not undo any prior changes.  
			// tags:
			//		private
			for(var x in this){
				if(this[x] && lang.isFunction(this[x]._commit)){
					this[x]._commit();
				}
			}
			this.data = this.toPlainObject();
		},

		_saveToStore: function(/*"dojo/store/DataStore"*/ store){
			// summary:
			//		Commit the current values to the data store:
			//
			//		- remove() any deleted entries
			//		- put() any new or updated entries
			// store:
			//		dojo/store/DataStore to use for this commit.
			// tags:
			//		private
			if(this._removals){
				array.forEach(this._removals, function(d){
					store.remove(store.getIdentity(d));
				}, this);
				delete this._removals;
			}
			var dataToCommit = this.toPlainObject();
			if(lang.isArray(dataToCommit)){
				array.forEach(dataToCommit, function(d){
					store.put(d);
				}, this);
			}else{
				store.put(dataToCommit);
			}
		}
	});

	lang.mixin(StatefulModel, {
		getStatefulOptions: {
			// summary:
			//		An object that defines how model object should be created from plain object hierarchy.

			getType: function(/*Anything*/ v){
				// summary:
				//		Returns the type of the given value.
				// v: Anything
				//		The value.

				return lang.isArray(v) ? "array" : v != null && {}.toString.call(v) == "[object Object]" ? "object" : "value"; // String
			},

			getStatefulArray: function(/*Anything[]*/ a){
				// summary:
				//		Create a stateful array from a plain array.
				// a: Anything[]
				//		The plain array.

				var _self = this, statefularray = lang.mixin(new StatefulArray(array.map(a, function(item){ return getStateful(item, _self); })));
				for(var s in StatefulModel.prototype){
					if(s != "set"){ statefularray[s] = StatefulModel.prototype[s]; }
				}
				statefularray.data = a;
				return statefularray;
			},

			getStatefulObject: function(/*Object*/ o){
				// summary:
				//		Create a stateful object from a plain object.
				// o: Object
				//		The plain object.

				var object = new StatefulModel();
				object.data = o;
				for(var s in o){
					object.set(s, getStateful(o[s], this));
				}
				return object; // dojox/mvc/StatefulModel
			},

			getStatefulValue: function(/*Anything*/ v){
				// summary:
				//		Create a stateful value from a plain value.
				// v: Anything
				//		The plain value.

				var value = new StatefulModel();
				value.data = v;
				value.set("value", v);
				return value;
			}
		},

		getPlainValueOptions: {
			// summary:
			//		An object that defines how plain value should be created from model object.

			getType: function(/*Anything*/ v){
				// summary:
				//		Returns the type of the given value.
				// v: Anything
				//		The value.

				if(lang.isArray(v)){ return "array"; }
				if(lang.isObject(v)){ // Primitive values may have their own properties
					for(var s in v){
						if(v.hasOwnProperty(s) && s != "value" && (v[s] || {}).get && (v[s] || {}).watch){
							return "object";
						}
					}
				}
				return "value";
			},

			getPlainArray: function(/*dojox/mvc/StatefulArray*/ a){
				return array.map(a, function(item){ return getPlainValue(item, this); }, this);
			},

			getPlainObject: function(/*dojox/mvc/StatefulModel*/ o){
				var plain = {};
				for(var s in o){
					if(s == "_watchCallbacks" || (s in StatefulModel.prototype)){ continue; }
					plain[s] = getPlainValue(o[s], this);
				}
				return plain;
			},

			getPlainValue: function(/*Anything*/ v){
				return (v || {}).set && (v || {}).watch ? getPlainValue(v.value, this) : v;
			}
		}
	});

	return StatefulModel;
});
