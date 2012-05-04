dojo.provide("dojox.wire.ml.DataStore");

dojo.require("dijit._Widget");
dojo.require("dojox.wire._base");

dojo.declare("dojox.wire.ml.DataStore", dijit._Widget, {
	//	summary:
	//		A widget for a data store
	//	description:
	//		This widget represents a data store of 'storeClass' attribute.
	//	storeClass:
	//		A class name of a data store
	storeClass: "",

	postCreate: function(){
		//	summary:
		//		Call _createStore()
		//	description:
		//		See _createStore().
		this.store = this._createStore();
	},

	_createStore: function(){
		//	summary:
		//		Create a data store
		//	desription:
		//		A data store of 'storeClass' is created with arguments
		//		specified with attributes.
		//	returns:
		//		A data store
		if(!this.storeClass){
			return null; //null
		}
		var storeClass = dojox.wire._getClass(this.storeClass);
		if(!storeClass){
			return null; //null
		}
		var args = {};
		var attributes = this.domNode.attributes;
		for(var i = 0; i < attributes.length; i++){
			var a = attributes.item(i);
			if(a.specified && !this[a.nodeName]){
				args[a.nodeName] = a.nodeValue;
			}
		}
		return new storeClass(args); //Object
	},

	getFeatures: function(){
		//	summary:
		//		Call getFeatures() method of a data store
		//	description:
		//		See dojo.data.api.Read.getFeatures().
		//	returns:
		//		A features object
		return this.store.getFeatures(); //Object
	},

	fetch: function(/*Object*/request){
		//	summary:
		//		Call fetch() method of a data store
		//	description:
		//		See dojo.data.api.Read.fetch().
		//	request:
		//		A request object
		//	returns:
		//		A request object
		return this.store.fetch(request); //Object
	},

	save: function(/*Object*/args){
		//	summary:
		//		Call save() method of a data store
		//	description:
		//		See dojo.data.api.Write.save().
		//	args:
		//		A save arguments object
		this.store.save(args);
	},

	newItem: function(/*Object*/args){
		//	summary:
		//		Call newItem() method of a data store
		//	description:
		//		See dojo.data.api.Write.newItem().
		//	args:
		//		A new item arguments object
		//	returns:
		//		A new item
		return this.store.newItem(args); //Object
	},

	deleteItem: function(/*Object*/item){
		//	summary:
		//		Call deleteItem() method of a data store
		//	description:
		//		See dojo.data.api.Write.deleteItem().
		//	returns:
		//		A boolean
		return this.store.deleteItem(item); //Boolean
	},

	revert: function(){
		//	summary:
		//		Call revert() method of a data store
		//	description:
		//		See dojo.data.api.Write.revert().
		//	returns:
		//		A boolean
		return this.store.revert(); //Boolean
	}
});
