define([
	"dojo/_base/array", // array.filter array.forEach array.map array.some
	"dojo/_base/Deferred",
	"dojo/aspect", // aspect.after
	"dojo/data/util/sorter", // util.sorter.createSortFunction
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.setSelectable
	"dojo/dom-class", // domClass.toggle
	"dojo/_base/kernel",	// _scopeName
	"dojo/_base/lang", // lang.delegate lang.isArray lang.isObject lang.hitch
	"dojo/query", // query
	"dojo/when",
	"dojo/store/util/QueryResults",
	"./_FormValueWidget"
], function(array, Deferred, aspect, sorter, declare, dom, domClass, kernel, lang, query, when,
			QueryResults, _FormValueWidget){

// module:
//		dijit/form/_FormSelectWidget

/*=====
var __SelectOption = {
	// value: String
	//		The value of the option.  Setting to empty (or missing) will
	//		place a separator at that location
	// label: String
	//		The label for our option.  It can contain html tags.
	// selected: Boolean
	//		Whether or not we are a selected option
	// disabled: Boolean
	//		Whether or not this specific option is disabled
};
=====*/

var _FormSelectWidget = declare("dijit.form._FormSelectWidget", _FormValueWidget, {
	// summary:
	//		Extends _FormValueWidget in order to provide "select-specific"
	//		values - i.e., those values that are unique to `<select>` elements.
	//		This also provides the mechanism for reading the elements from
	//		a store, if desired.

	// multiple: [const] Boolean
	//		Whether or not we are multi-valued
	multiple: false,

	// options: __SelectOption[]
	//		The set of options for our select item.  Roughly corresponds to
	//		the html `<option>` tag.
	options: null,

	// store: dojo/store/api/Store
	//		A store to use for getting our list of options - rather than reading them
	//		from the `<option>` html tags.   Should support getIdentity().
	//		For back-compat store can also be a dojo/data/api/Identity.
	store: null,

	// query: object
	//		A query to use when fetching items from our store
	query: null,

	// queryOptions: object
	//		Query options to use when fetching from the store
	queryOptions: null,

	// labelAttr: String?
	//		The entries in the drop down list come from this attribute in the dojo.store items.
	//		If ``store`` is set, labelAttr must be set too, unless store is an old-style
	//		dojo.data store rather than a new dojo/store.
	labelAttr: "",

	// onFetch: Function
	//		A callback to do with an onFetch - but before any items are actually
	//		iterated over (i.e. to filter even further what you want to add)
	onFetch: null,

	// sortByLabel: Boolean
	//		Flag to sort the options returned from a store by the label of
	//		the store.
	sortByLabel: true,


	// loadChildrenOnOpen: Boolean
	//		By default loadChildren is called when the items are fetched from the
	//		store.  This property allows delaying loadChildren (and the creation
	//		of the options/menuitems) until the user clicks the button to open the
	//		dropdown.
	loadChildrenOnOpen: false,

	// onLoadDeferred: [readonly] dojo.Deferred
	//		This is the `dojo.Deferred` returned by setStore().
	//		Calling onLoadDeferred.then() registers your
	//		callback to be called only once, when the prior setStore completes.
	onLoadDeferred: null,

	getOptions: function(/*anything*/ valueOrIdx){
		// summary:
		//		Returns a given option (or options).
		// valueOrIdx:
		//		If passed in as a string, that string is used to look up the option
		//		in the array of options - based on the value property.
		//		(See dijit/form/_FormSelectWidget.__SelectOption).
		//
		//		If passed in a number, then the option with the given index (0-based)
		//		within this select will be returned.
		//
		//		If passed in a dijit/form/_FormSelectWidget.__SelectOption, the same option will be
		//		returned if and only if it exists within this select.
		//
		//		If passed an array, then an array will be returned with each element
		//		in the array being looked up.
		//
		//		If not passed a value, then all options will be returned
		//
		// returns:
		//		The option corresponding with the given value or index.  null
		//		is returned if any of the following are true:
		//
		//		- A string value is passed in which doesn't exist
		//		- An index is passed in which is outside the bounds of the array of options
		//		- A dijit/form/_FormSelectWidget.__SelectOption is passed in which is not a part of the select

		// NOTE: the compare for passing in a dijit/form/_FormSelectWidget.__SelectOption checks
		//		if the value property matches - NOT if the exact option exists
		// NOTE: if passing in an array, null elements will be placed in the returned
		//		array when a value is not found.
		var lookupValue = valueOrIdx, opts = this.options || [], l = opts.length;

		if(lookupValue === undefined){
			return opts; // __SelectOption[]
		}
		if(lang.isArray(lookupValue)){
			return array.map(lookupValue, "return this.getOptions(item);", this); // __SelectOption[]
		}
		if(lang.isObject(valueOrIdx)){
			// We were passed an option - so see if it's in our array (directly),
			// and if it's not, try and find it by value.
			if(!array.some(this.options, function(o, idx){
				if(o === lookupValue ||
					(o.value && o.value === lookupValue.value)){
					lookupValue = idx;
					return true;
				}
				return false;
			})){
				lookupValue = -1;
			}
		}
		if(typeof lookupValue == "string"){
			for(var i=0; i<l; i++){
				if(opts[i].value === lookupValue){
					lookupValue = i;
					break;
				}
			}
		}
		if(typeof lookupValue == "number" && lookupValue >= 0 && lookupValue < l){
			return this.options[lookupValue]; // __SelectOption
		}
		return null; // null
	},

	addOption: function(/*__SelectOption|__SelectOption[]*/ option){
		// summary:
		//		Adds an option or options to the end of the select.  If value
		//		of the option is empty or missing, a separator is created instead.
		//		Passing in an array of options will yield slightly better performance
		//		since the children are only loaded once.
		if(!lang.isArray(option)){ option = [option]; }
		array.forEach(option, function(i){
			if(i && lang.isObject(i)){
				this.options.push(i);
			}
		}, this);
		this._loadChildren();
	},

	removeOption: function(/*String|__SelectOption|Number|Array*/ valueOrIdx){
		// summary:
		//		Removes the given option or options.  You can remove by string
		//		(in which case the value is removed), number (in which case the
		//		index in the options array is removed), or select option (in
		//		which case, the select option with a matching value is removed).
		//		You can also pass in an array of those values for a slightly
		//		better performance since the children are only loaded once.
		if(!lang.isArray(valueOrIdx)){ valueOrIdx = [valueOrIdx]; }
		var oldOpts = this.getOptions(valueOrIdx);
		array.forEach(oldOpts, function(i){
			// We can get null back in our array - if our option was not found.  In
			// that case, we don't want to blow up...
			if(i){
				this.options = array.filter(this.options, function(node){
					return (node.value !== i.value || node.label !== i.label);
				});
				this._removeOptionItem(i);
			}
		}, this);
		this._loadChildren();
	},

	updateOption: function(/*__SelectOption|__SelectOption[]*/ newOption){
		// summary:
		//		Updates the values of the given option.  The option to update
		//		is matched based on the value of the entered option.  Passing
		//		in an array of new options will yield better performance since
		//		the children will only be loaded once.
		if(!lang.isArray(newOption)){ newOption = [newOption]; }
		array.forEach(newOption, function(i){
			var oldOpt = this.getOptions(i), k;
			if(oldOpt){
				for(k in i){ oldOpt[k] = i[k]; }
			}
		}, this);
		this._loadChildren();
	},

	setStore: function(store,
						selectedValue,
						fetchArgs){
		// summary:
		//		Sets the store you would like to use with this select widget.
		//		The selected value is the value of the new store to set.  This
		//		function returns the original store, in case you want to reuse
		//		it or something.
		// store: dojo/store/api/Store
		//		The dojo.store you would like to use - it MUST implement getIdentity()
		//		and MAY implement observe().
		//		For backwards-compatibility this can also be a data.data store, in which case
		//		it MUST implement dojo/data/api/Identity,
		//		and MAY implement dojo/data/api/Notification.
		// selectedValue: anything?
		//		The value that this widget should set itself to *after* the store
		//		has been loaded
		// fetchArgs: Object?
		//		Hash of parameters to set filter on store, etc.
		//
		//		- query: new value for Select.query,
		//		- queryOptions: new value for Select.queryOptions,
		//		- onFetch: callback function for each item in data (Deprecated)
		var oStore = this.store;
		fetchArgs = fetchArgs || {};

		if(oStore !== store){
			// Our store has changed, so cancel any listeners on old store (remove for 2.0)
			var h;
			while((h = this._notifyConnections.pop())){ h.remove(); }

			// For backwards-compatibility, accept dojo.data store in addition to dojo.store.store.  Remove in 2.0.
			if(!store.get){
				lang.mixin(store, {
					_oldAPI: true,
					get: function(id){
						// summary:
						//		Retrieves an object by it's identity. This will trigger a fetchItemByIdentity.
						//		Like dojo.store.DataStore.get() except returns native item.
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
						var deferred = new Deferred(function(){ if(fetchHandle.abort){ fetchHandle.abort(); } } );
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
						return new QueryResults(deferred);
					}
				});

				if(store.getFeatures()["dojo.data.api.Notification"]){
					this._notifyConnections = [
						aspect.after(store, "onNew", lang.hitch(this, "_onNewItem"), true),
						aspect.after(store, "onDelete", lang.hitch(this, "_onDeleteItem"), true),
						aspect.after(store, "onSet", lang.hitch(this, "_onSetItem"), true)
					];
				}
			}
			this._set("store", store);			// Our store has changed, so update our notifications
		}

		// Remove existing options (if there are any)
		if(this.options && this.options.length){
			this.removeOption(this.options);
		}

		// Cancel listener for updates to old store
		if(this._queryRes && this._queryRes.close){
			this._queryRes.close();
		}

		// If user has specified new query and query options along with this new store, then use them.
		if(fetchArgs.query){
			this._set("query", fetchArgs.query);
			this._set("queryOptions", fetchArgs.queryOptions);
		}

		// Add our new options
		if(store){
			this._loadingStore = true;
			this.onLoadDeferred = new Deferred();

			// Run query
			// Save result in this._queryRes so we can cancel the listeners we register below
			this._queryRes = store.query(this.query, this.queryOptions);
			when(this._queryRes, lang.hitch(this, function(items){

				if(this.sortByLabel && !fetchArgs.sort && items.length){
					if(items[0].getValue){
						// Old dojo.data API to access items, remove for 2.0
						items.sort(sorter.createSortFunction([{
							attribute: store.getLabelAttributes(items[0])[0]
						}], store));
					}else{
						var labelAttr = this.labelAttr;
						items.sort(function(a, b){
							return a[labelAttr] > b[labelAttr] ? 1 :  b[labelAttr] > a[labelAttr] ? -1 : 0;
						});
					}
				}

				if(fetchArgs.onFetch){
						items = fetchArgs.onFetch.call(this, items, fetchArgs);
				}

				// TODO: Add these guys as a batch, instead of separately
				array.forEach(items, function(i){
					this._addOptionForItem(i);
				}, this);

				// Register listener for store updates
				if(this._queryRes.observe){
					this._queryRes.observe(lang.hitch(this, function(object, deletedFrom, insertedInto){
						if(deletedFrom == insertedInto){
							this._onSetItem(object);
						}else{
							if(deletedFrom != -1){
								this._onDeleteItem(object);
							}
							if(insertedInto != -1){
								this._onNewItem(object);
							}
						}
					}), true);
				}

				// Set our value (which might be undefined), and then tweak
				// it to send a change event with the real value
				this._loadingStore = false;
				this.set("value", "_pendingValue" in this ? this._pendingValue : selectedValue);
				delete this._pendingValue;

				if(!this.loadChildrenOnOpen){
					this._loadChildren();
				}else{
					this._pseudoLoadChildren(items);
				}
				this.onLoadDeferred.resolve(true);
				this.onSetStore();
			}), function(err){
					console.error('dijit.form.Select: ' + err.toString());
					this.onLoadDeferred.reject(err);
			});
		}
		return oStore;	// dojo/data/api/Identity
	},

	// TODO: implement set() and watch() for store and query, although not sure how to handle
	// setting them individually rather than together (as in setStore() above)

	_setValueAttr: function(/*anything*/ newValue, /*Boolean?*/ priorityChange){
		// summary:
		//		set the value of the widget.
		//		If a string is passed, then we set our value from looking it up.
		if(!this._onChangeActive){ priorityChange = null; }
		if(this._loadingStore){
			// Our store is loading - so save our value, and we'll set it when
			// we're done
			this._pendingValue = newValue;
			return;
		}
		var opts = this.getOptions() || [];
		if(!lang.isArray(newValue)){
			newValue = [newValue];
		}
		array.forEach(newValue, function(i, idx){
			if(!lang.isObject(i)){
				i = i + "";
			}
			if(typeof i === "string"){
				newValue[idx] = array.filter(opts, function(node){
					return node.value === i;
				})[0] || {value: "", label: ""};
			}
		}, this);

		// Make sure some sane default is set
		newValue = array.filter(newValue, function(i){ return i && i.value; });
		if(!this.multiple && (!newValue[0] || !newValue[0].value) && opts.length){
			newValue[0] = opts[0];
		}
		array.forEach(opts, function(i){
			i.selected = array.some(newValue, function(v){ return v.value === i.value; });
		});
		var	val = array.map(newValue, function(i){ return i.value; }),
			disp = array.map(newValue, function(i){ return i.label; });

		if(typeof val == "undefined" || typeof val[0] == "undefined"){ return; } // not fully initialized yet or a failed value lookup
		this._setDisplay(this.multiple ? disp : disp[0]);
		this.inherited(arguments, [ this.multiple ? val : val[0], priorityChange ]);
		this._updateSelection();
	},

	_getDisplayedValueAttr: function(){
		// summary:
		//		returns the displayed value of the widget
		var val = this.get("value");
		if(!lang.isArray(val)){
			val = [val];
		}
		var ret = array.map(this.getOptions(val), function(v){
			if(v && "label" in v){
				return v.label;
			}else if(v){
				return v.value;
			}
			return null;
		}, this);
		return this.multiple ? ret : ret[0];
	},

	_loadChildren: function(){
		// summary:
		//		Loads the children represented by this widget's options.
		//		reset the menu to make it populatable on the next click
		if(this._loadingStore){ return; }
		array.forEach(this._getChildren(), function(child){
			child.destroyRecursive();
		});
		// Add each menu item
		array.forEach(this.options, this._addOptionItem, this);

		// Update states
		this._updateSelection();
	},

	_updateSelection: function(){
		// summary:
		//		Sets the "selected" class on the item for styling purposes
		this._set("value", this._getValueFromOpts());
		var val = this.value;
		if(!lang.isArray(val)){
			val = [val];
		}
		if(val && val[0]){
			array.forEach(this._getChildren(), function(child){
				var isSelected = array.some(val, function(v){
					return child.option && (v === child.option.value);
				});
				domClass.toggle(child.domNode, this.baseClass.replace(/\s+|$/g, "SelectedOption "), isSelected);
				child.domNode.setAttribute("aria-selected", isSelected ? "true" : "false");
			}, this);
		}
	},

	_getValueFromOpts: function(){
		// summary:
		//		Returns the value of the widget by reading the options for
		//		the selected flag
		var opts = this.getOptions() || [];
		if(!this.multiple && opts.length){
			// Mirror what a select does - choose the first one
			var opt = array.filter(opts, function(i){
				return i.selected;
			})[0];
			if(opt && opt.value){
				return opt.value;
			}else{
				opts[0].selected = true;
				return opts[0].value;
			}
		}else if(this.multiple){
			// Set value to be the sum of all selected
			return array.map(array.filter(opts, function(i){
				return i.selected;
			}), function(i){
				return i.value;
			}) || [];
		}
		return "";
	},

	// Internal functions to call when we have store notifications come in
	_onNewItem: function(/*item*/ item, /*Object?*/ parentInfo){
		if(!parentInfo || !parentInfo.parent){
			// Only add it if we are top-level
			this._addOptionForItem(item);
		}
	},
	_onDeleteItem: function(/*item*/ item){
		var store = this.store;
		this.removeOption(store.getIdentity(item));
	},
	_onSetItem: function(/*item*/ item){
		this.updateOption(this._getOptionObjForItem(item));
	},

	_getOptionObjForItem: function(item){
		// summary:
		//		Returns an option object based off the given item.  The "value"
		//		of the option item will be the identity of the item, the "label"
		//		of the option will be the label of the item.

		// remove getLabel() call for 2.0 (it's to support the old dojo.data API)
		var store = this.store,
			label = (this.labelAttr && this.labelAttr in item) ? item[this.labelAttr] : store.getLabel(item),
			value = (label ? store.getIdentity(item) : null);
		return {value: value, label: label, item: item}; // __SelectOption
	},

	_addOptionForItem: function(/*item*/ item){
		// summary:
		//		Creates (and adds) the option for the given item
		var store = this.store;
		if(store.isItemLoaded && !store.isItemLoaded(item)){
			// We are not loaded - so let's load it and add later.
			// Remove for 2.0 (it's the old dojo.data API)
			store.loadItem({item: item, onItem: function(i){
				this._addOptionForItem(i);
			},
			scope: this});
			return;
		}
		var newOpt = this._getOptionObjForItem(item);
		this.addOption(newOpt);
	},

	constructor: function(params /*===== , srcNodeRef =====*/){
		// summary:
		//		Create the widget.
		// params: Object|null
		//		Hash of initialization parameters for widget, including scalar values (like title, duration etc.)
		//		and functions, typically callbacks like onClick.
		//		The hash can contain any of the widget's properties, excluding read-only properties.
		// srcNodeRef: DOMNode|String?
		//		If a srcNodeRef (DOM node) is specified, replace srcNodeRef with my generated DOM tree

		//		Saves off our value, if we have an initial one set so we
		//		can use it if we have a store as well (see startup())
		this._oValue = (params || {}).value || null;
		this._notifyConnections = [];	// remove for 2.0
	},

	buildRendering: function(){
		this.inherited(arguments);
		dom.setSelectable(this.focusNode, false);
	},

	_fillContent: function(){
		// summary:
		//		Loads our options and sets up our dropdown correctly.  We
		//		don't want any content, so we don't call any inherit chain
		//		function.
		if(!this.options){
			this.options =
				this.srcNodeRef
				? query("> *", this.srcNodeRef).map(
					function(node){
						if(node.getAttribute("type") === "separator"){
							return { value: "", label: "", selected: false, disabled: false };
						}
						return {
							value: (node.getAttribute("data-" + kernel._scopeName + "-value") || node.getAttribute("value")),
							label: String(node.innerHTML),
							// FIXME: disabled and selected are not valid on complex markup children (which is why we're
							// looking for data-dojo-value above.  perhaps we should data-dojo-props="" this whole thing?)
							// decide before 1.6
							selected: node.getAttribute("selected") || false,
							disabled: node.getAttribute("disabled") || false
						};
					},
					this)
				: [];
		}
		if(!this.value){
			this._set("value", this._getValueFromOpts());
		}else if(this.multiple && typeof this.value == "string"){
			this._set("value", this.value.split(","));
		}
	},

	postCreate: function(){
		// summary:
		//		sets up our event handling that we need for functioning
		//		as a select
		this.inherited(arguments);

		// Make our event connections for updating state
		this.connect(this, "onChange", "_updateSelection");

		// moved from startup
		//		Connects in our store, if we have one defined
		var store = this.store;
		if(store && (store.getIdentity || store.getFeatures()["dojo.data.api.Identity"])){
			// Temporarily set our store to null so that it will get set
			// and connected appropriately
			this.store = null;
			this.setStore(store, this._oValue);
		}
	},

	startup: function(){
		// summary:
		this._loadChildren();
		this.inherited(arguments);
	},

	destroy: function(){
		// summary:
		//		Clean up our connections

		var h;
		while((h = this._notifyConnections.pop())){ h.remove(); }

		// Cancel listener for store updates
		if(this._queryRes && this._queryRes.close){
			this._queryRes.close();
		}

		this.inherited(arguments);
	},

	_addOptionItem: function(/*__SelectOption*/ /*===== option =====*/){
		// summary:
		//		User-overridable function which, for the given option, adds an
		//		item to the select.  If the option doesn't have a value, then a
		//		separator is added in that place.  Make sure to store the option
		//		in the created option widget.
	},

	_removeOptionItem: function(/*__SelectOption*/ /*===== option =====*/){
		// summary:
		//		User-overridable function which, for the given option, removes
		//		its item from the select.
	},

	_setDisplay: function(/*String or String[]*/ /*===== newDisplay =====*/){
		// summary:
		//		Overridable function which will set the display for the
		//		widget.  newDisplay is either a string (in the case of
		//		single selects) or array of strings (in the case of multi-selects)
	},

	_getChildren: function(){
		// summary:
		//		Overridable function to return the children that this widget contains.
		return [];
	},

	_getSelectedOptionsAttr: function(){
		// summary:
		//		hooks into this.attr to provide a mechanism for getting the
		//		option items for the current value of the widget.
		return this.getOptions(this.get("value"));
	},

	_pseudoLoadChildren: function(/*item[]*/ /*===== items =====*/){
		// summary:
		//		a function that will "fake" loading children, if needed, and
		//		if we have set to not load children until the widget opens.
		// items:
		//		An array of items that will be loaded, when needed
	},

	onSetStore: function(){
		// summary:
		//		a function that can be connected to in order to receive a
		//		notification that the store has finished loading and all options
		//		from that store are available
	}
});

/*=====
_FormSelectWidget.__SelectOption = __SelectOption;
=====*/

return _FormSelectWidget;

});
