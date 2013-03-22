define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/when",
	"./getPlainValue",
	"./EditModelRefController",
	"./StoreRefController"
], function(declare, lang, when, getPlainValue, EditModelRefController, StoreRefController){
	return declare("dojox.mvc.EditStoreRefController", [StoreRefController, EditModelRefController], {
		// summary:
		//		A child class of dojox/mvc/StoreRefController, managing edits.
		// description:
		//		In addition to what dojox/mvc/StoreRefController does, the commit() method sends the data model as well as the removed entries in array to the data store.
		//		NOTE - If this class is used with a widget by data-dojo-mixins, make sure putting the widget in data-dojo-type and putting this class to data-dojo-mixins.
		// example:
		//		The check box refers to "value" property in the controller (with "ctrl" ID).
		//		The controller provides the "value" property, from the data coming from data store ("store" property in the controller), using the first one in array.
		//		Two seconds later, the check box changes from unchecked to checked.
		//		The change is committed to the data store, which is reflected to dojo/store/Observable callback. 
		// |		<html>
		// |			<head>
		// |				<script src="/path/to/dojo-toolkit/dojo/dojo.js" type="text/javascript" data-dojo-config="parseOnLoad: 0"></script>
		// |				<script type="text/javascript">
		// |					require([
		// |						"dojo/dom", "dojo/parser", "dojo/when", "dojo/store/Observable", "dojo/store/Memory", "dijit/registry", "dojo/domReady!"
		// |					], function(ddom, parser, when, Observable, Memory, registry){
		// |						store = Observable(new Memory({data: [{id: "Foo", value: false}]}));
		// |						when(parser.parse(), function(){
		// |							registry.byId("ctrl").queryStore().observe(function(object, previousIndex, newIndex){
		// |								alert("ID: " + object.id + ", value: " + object.value);
		// |							}, true);
		// |							var count = 0;
		// |							var h = setInterval(function(){
		// |								ddom.byId("check").click();
		// |								registry.byId("ctrl").commit();
		// |								if(++count >= 2){ clearInterval(h); }
		// |							}, 2000);
		// |						});
		// |					});
		// |				</script>
		// |			</head>
		// |			<body>
		// |				<script type="dojo/require">at: "dojox/mvc/at"</script>
		// |				<span id="ctrl" data-dojo-type="dojox/mvc/EditStoreRefController" data-dojo-mixins="dojox/mvc/ListController"
		// |				 data-dojo-props="store: store, cursorIndex: 0"></span>
		// |				<input id="check" type="checkbox" data-dojo-type="dijit/form/CheckBox" data-dojo-props="checked: at('widget:ctrl', 'value')">
		// |			</body>
		// |		</html>

		// getPlainValueOptions: dojox/mvc/getPlainValueOptions
		//		The options to get plain value from stateful object.
		getPlainValueOptions: null,

		// _removals: Object[]
		//		The list of removed elements.
		_removals: [],

		// _resultsWatchHandle: dojox/mvc/StatefulArray.watchElements.handle
		//		The watch handle for model array elements.
		_resultsWatchHandle: null,

		// _refSourceModelProp: String
		//		The property name for the data model, that serves as the data source.
		_refSourceModelProp: "sourceModel",

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
			if(this._resultsWatchHandle){ this._resultsWatchHandle.unwatch(); }
			this._removals = [];
			var _self = this;
			return when(this.inherited(arguments), function(results){
				if(_self._beingDestroyed){ return; }
				if(lang.isArray(results)){
					_self._resultsWatchHandle = results.watchElements(function(idx, removals, adds){
						[].push.apply(_self._removals, removals);
					});
				}
				return results;
			});
		},

		getStore: function(/*Number*/ id, /*Object*/ options){
			// summary:
			//		Retrieves an object by its identity.
			// id: Number
			//		The identity to use to lookup the object.
			// options: Object
			//		The options for dojo/store/*/get().
			// returns: Object
			//		The object in the store that matches the given id.

			if(this._resultsWatchHandle){ this._resultsWatchHandle.unwatch(); }
			return this.inherited(arguments);
		},

		commit: function(){
			// summary:
			//		Send the change back to the data source.

			if(this._removals){
				for(var i = 0; i < this._removals.length; i++){
					this.store.remove(this.store.getIdentity(this._removals[i]));
				}
				this._removals = [];
			}
			var data = getPlainValue(this.get(this._refEditModelProp), this.getPlainValueOptions);
			if(lang.isArray(data)){
				for(var i = 0; i < data.length; i++){
					this.store.put(data[i]);
				}
			}else{
				this.store.put(data);
			}
			this.inherited(arguments);
		},

		reset: function(){
			// summary:
			//		Change the model back to its original state.

			this.inherited(arguments);
			this._removals = [];
		},

		destroy: function(){
			// summary:
			//		Clean up model watch handle as this object is destroyed.

			if(this._resultsWatchHandle){ this._resultsWatchHandle.unwatch(); }
			this.inherited(arguments);
		}
	});
});
