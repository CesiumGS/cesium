define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/when",
	"./getStateful",
	"./ModelRefController"
], function(declare, lang, when, getStateful, ModelRefController){
	return declare("dojox.mvc.StoreRefController", ModelRefController, {
		// summary:
		//		A child class of dojox.mvc.ModelRefController, which keeps a reference to Dojo Object Store (in store property).
		// description:
		//		Has several methods to work with the store:
		//
		//		- queryStore(): Runs query() against the store, and creates a data model from retrieved data
		//		- getStore(): Runs get() against the store, and creates a data model from retrieved data
		//		- putStore(): Runs put() against the store
		//		- addStore(): Runs add() against the store
		//		- removeStore(): Runs remove() against the store
		//
		//		dojo.Stateful get()/set()/watch() interfaces in dojox.mvc.StoreRefController will work with the data model from queryStore() or getStore().
		//
		//		NOTE - If this class is used with a widget by data-dojo-mixins, make sure putting the widget in data-dojo-type and putting this class to data-dojo-mixins.
		// example:
		//		The text box refers to "value" property in the controller (with "ctrl" ID).
		//		The controller provides the "value" property, from the data coming from data store ("store" property in the controller).
		//		Two seconds later, the text box changes from "Foo" to "Bar" as the controller gets new data from data store.
		// |		<html>
		// |			<head>
		// |				<script src="/path/to/dojo-toolkit/dojo/dojo.js" type="text/javascript" data-dojo-config="parseOnLoad: 0"></script>
		// |				<script type="text/javascript">
		// |					require([
		// |						"dojo/parser", "dojo/when", "dojo/store/Memory", "dijit/registry", "dojo/domReady!"
		// |					], function(parser, when, Memory, registry){
		// |						store = new Memory({data: [{id: "Foo", value: "Foo"}, {id: "Bar", value: "Bar"}]});
		// |						when(parser.parse(), function(){
		// |							registry.byId("ctrl").getStore("Foo");
		// |							setTimeout(function(){ registry.byId("ctrl").getStore("Bar"); }, 2000);
		// |						});
		// |					});
		// |				</script>
		// |			</head>
		// |			<body>
		// |				<script type="dojo/require">at: "dojox/mvc/at"</script>
		// |				<span id="ctrl" data-dojo-type="dojox.mvc.StoreRefController" data-dojo-props="store: store"></span>
		// |				<input type="text" data-dojo-type="dijit/form/TextBox" data-dojo-props="value: at('widget:ctrl', 'value')">
		// |			</body>
		// |		</html>

		// store: dojo/store/*
		//		The Dojo Object Store in use.
		store: null,

		// getStatefulOptions: dojox.mvc.getStatefulOptions
		//		The options to get stateful object from plain value.
		getStatefulOptions: null,

		// _refSourceModelProp: String
		//		The property name for the data model, that serves as the data source.
		_refSourceModelProp: "model",

		queryStore: function(/*Object*/ query, /*dojo/store/api/Store.QueryOptions?*/ options){
			// summary:
			//		Queries the store for objects.
			// query: Object
			//		The query to use for retrieving objects from the store.
			// options: dojo/store/api/Store.QueryOptions?
			//		The optional arguments to apply to the resultset.
			// returns: dojo/store/api/Store.QueryResults
			//		The results of the query, extended with iterative methods.

			if(!(this.store || {}).query){ return; }
			if(this._queryObserveHandle){ this._queryObserveHandle.cancel(); }

			var _self = this,
			 queryResult = this.store.query(query, options),
			 result = when(queryResult, function(results){
				if(_self._beingDestroyed){ return; }
				results = getStateful(results, _self.getStatefulOptions);
				_self.set(_self._refSourceModelProp, results);
				return results;
			});
			// For dojo/store/Observable, which adds a function to query result
			for(var s in queryResult){
				if(isNaN(s) && queryResult.hasOwnProperty(s) && lang.isFunction(queryResult[s])){
					result[s] = queryResult[s];
				}
			}
			return result;
		},

		getStore: function(/*Number*/ id, /*Object*/ options){
			// summary:
			//		Retrieves an object by its identity.
			// id: Number
			//		The identity to use to lookup the object.
			// options: Object
			//		The options for dojo/store.*.get().
			// returns: Object
			//		The object in the store that matches the given id.

			if(!(this.store || {}).get){ return; }
			if(this._queryObserveHandle){ this._queryObserveHandle.cancel(); }
			var _self = this;
			result = when(this.store.get(id, options), function(result){
				if(_self._beingDestroyed){ return; }
				result = getStateful(result, _self.getStatefulOptions);
				_self.set(_self._refSourceModelProp, result);
				return result;
			});
			return result;
		},

		putStore: function(/*Object*/ object, /*dojo/store/api/Store.PutDirectives?*/ options){
			// summary:
			//		Stores an object.
			// object: Object
			//		The object to store.
			// options: dojo/store/api/Store.PutDirectives?
			//		Additional metadata for storing the data.  Includes an "id" property if a specific id is to be used.
			// returns: Number

			if(!(this.store || {}).put){ return; }
			return this.store.put(object, options);
		},

		addStore: function(object, options){
			// summary:
			//		Creates an object, throws an error if the object already exists.
			// object: Object
			//		The object to store.
			// options: dojo/store/api/Store.PutDirectives?
			//		Additional metadata for storing the data.  Includes an "id" property if a specific id is to be used.
			// returns: Number

			if(!(this.store || {}).add){ return; }
			return this.store.add(object, options);
		},

		removeStore: function(/*Number*/ id, /*Object*/ options){
			// summary:
			//		Deletes an object by its identity
			// id: Number
			//		The identity to use to delete the object
			// options: Object
			//		The options for dojo/store/*.remove().
			// returns: Boolean
			//		Returns true if an object was removed, falsy (undefined) if no object matched the id.

			if(!(this.store || {}).remove){ return; }
			return this.store.remove(id, options);
		}
	});
});
