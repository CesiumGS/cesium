define([
	"dojo/_base/declare", // declare
	"dojo/Deferred",
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/lang", // lang.mixin
	"dojo/store/util/QueryResults",
	"./_AutoCompleterMixin",
	"./_ComboBoxMenu",
	"../_HasDropDown",
	"dojo/text!./templates/DropDownBox.html"
], function(declare, Deferred, kernel, lang, QueryResults, _AutoCompleterMixin, _ComboBoxMenu, _HasDropDown, template){


	// module:
	//		dijit/form/ComboBoxMixin

	return declare("dijit.form.ComboBoxMixin", [_HasDropDown, _AutoCompleterMixin], {
		// summary:
		//		Provides main functionality of ComboBox widget

		// dropDownClass: [protected extension] Function String
		//		Dropdown widget class used to select a date/time.
		//		Subclasses should specify this.
		dropDownClass: _ComboBoxMenu,

		// hasDownArrow: Boolean
		//		Set this textbox to have a down arrow button, to display the drop down list.
		//		Defaults to true.
		hasDownArrow: true,

		templateString: template,

		baseClass: "dijitTextBox dijitComboBox",

		/*=====
		// store: [const] dojo/store/api/Store|dojo/data/api/Read
		//		Reference to data provider object used by this ComboBox.
		//
		//		Should be dojo/store/api/Store, but dojo/data/api/Read supported
		//		for backwards compatibility.
		store: null,
		=====*/

		// Set classes like dijitDownArrowButtonHover depending on
		// mouse action over button node
		cssStateNodes: {
			"_buttonNode": "dijitDownArrowButton"
		},

		_setHasDownArrowAttr: function(/*Boolean*/ val){
			this._set("hasDownArrow", val);
			this._buttonNode.style.display = val ? "" : "none";
		},

		_showResultList: function(){
			// hide the tooltip
			this.displayMessage("");
			this.inherited(arguments);
		},

		_setStoreAttr: function(store){
			// For backwards-compatibility, accept dojo.data store in addition to dojo/store/api/Store.  Remove in 2.0.
			if(!store.get){
				lang.mixin(store, {
					_oldAPI: true,
					get: function(id){
						// summary:
						//		Retrieves an object by it's identity. This will trigger a fetchItemByIdentity.
						//		Like dojo/store/DataStore.get() except returns native item.
						var deferred = new Deferred();
						this.fetchItemByIdentity({
							identity: id,
							onItem: function(object){
								deferred.resolve(object);
							},
							onError: function(error){
								deferred.reject(error);
							}
						});
						return deferred.promise;
					},
					query: function(query, options){
						// summary:
						//		Queries the store for objects.   Like dojo/store/DataStore.query()
						//		except returned Deferred contains array of native items.
						var deferred = new Deferred(function(){ fetchHandle.abort && fetchHandle.abort(); });
						deferred.total = new Deferred();
						var fetchHandle = this.fetch(lang.mixin({
							query: query,
							onBegin: function(count){
								deferred.total.resolve(count);
							},
							onComplete: function(results){
								deferred.resolve(results);
							},
							onError: function(error){
								deferred.reject(error);
							}
						}, options));
						return QueryResults(deferred);
					}
				});
			}
			this._set("store", store);
		},

		postMixInProperties: function(){
			// Since _setValueAttr() depends on this.store, _setStoreAttr() needs to execute first.
			// Unfortunately, without special code, it ends up executing second.
			var store = this.params.store || this.store;
			if(store){
				this._setStoreAttr(store);
			}

			this.inherited(arguments);

			// User may try to access this.store.getValue() etc.  in a custom labelFunc() function.
			// It's not available with the new data store for handling inline <option> tags, so add it.
			if(!this.params.store && this.store && !this.store._oldAPI){
				var clazz = this.declaredClass;
				lang.mixin(this.store, {
					getValue: function(item, attr){
						kernel.deprecated(clazz + ".store.getValue(item, attr) is deprecated for builtin store.  Use item.attr directly", "", "2.0");
						return item[attr];
					},
					getLabel: function(item){
						kernel.deprecated(clazz + ".store.getLabel(item) is deprecated for builtin store.  Use item.label directly", "", "2.0");
						return item.name;
					},
					fetch: function(args){
						kernel.deprecated(clazz + ".store.fetch() is deprecated for builtin store.", "Use store.query()", "2.0");
						var shim = ["dojo/data/ObjectStore"];	// indirection so it doesn't get rolled into a build
						require(shim, lang.hitch(this, function(ObjectStore){
							new ObjectStore({objectStore: this}).fetch(args);
						}));
					}
				});
			}
		},

		buildRendering: function(){
			this.inherited(arguments);

			this.focusNode.setAttribute("aria-autocomplete", this.autoComplete ? "both" : "list");
		}
	});
});
