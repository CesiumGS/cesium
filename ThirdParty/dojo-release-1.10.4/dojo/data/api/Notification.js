define(["../../_base/declare", "./Read"], function(declare, Read){

// module:
//		dojo/data/api/Notification

return declare("dojo.data.api.Notification", Read, {
	// summary:
	//		This is an abstract API that data provider implementations conform to.
	//		This file defines functions signatures and intentionally leaves all the
	//		functions unimplemented.
	// description:
	//		This API defines a set of APIs that all datastores that conform to the
	//		Notifications API must implement.  In general, most stores will implement
	//		these APIs as no-op functions for users who wish to monitor them to be able
	//		to connect to then via dojo.connect().  For non-users of dojo.connect,
	//		they should be able to just replace the function on the store to obtain
	//		 notifications.  Both read-only and read-write stores may implement
	//		this feature.  In the case of a read-only store, this feature makes sense if
	//		the store itself does internal polling to a back-end server and periodically updates
	//		its cache of items (deletes, adds, and updates).
	// example:
	//	|	function onSet(item, attribute, oldValue, newValue){
	//	|		//Do something with the information...
	//	|	};
	//	|	var store = new some.newStore();
	//	|	dojo.connect(store, "onSet", onSet);

	getFeatures: function(){
		// summary:
		//		See dojo/data/api/Read.getFeatures()
		return {
			'dojo.data.api.Read': true,
			'dojo.data.api.Notification': true
		};
	},

	onSet: function(/* dojo/data/api/Item */ item,
					/* attribute-name-string */ attribute,
					/* object|array */ oldValue,
					/* object|array */ newValue){
		// summary:
		//		This function is called any time an item is modified via setValue, setValues, unsetAttribute, etc.
		// description:
		//		This function is called any time an item is modified via setValue, setValues, unsetAttribute, etc.
		//		Its purpose is to provide a hook point for those who wish to monitor actions on items in the store
		//		in a simple manner.  The general expected usage is to dojo.connect() to the store's
		//		implementation and be called after the store function is called.
		// item:
		//		The item being modified.
		// attribute:
		//		The attribute being changed represented as a string name.
		// oldValue:
		//		The old value of the attribute.  In the case of single value calls, such as setValue, unsetAttribute, etc,
		//		this value will be generally be an atomic value of some sort (string, int, etc, object).  In the case of
		//		multi-valued attributes, it will be an array.
		// newValue:
		//		The new value of the attribute.  In the case of single value calls, such as setValue, this value will be
		//		generally be an atomic value of some sort (string, int, etc, object).  In the case of multi-valued attributes,
		//		it will be an array.  In the case of unsetAttribute, the new value will be 'undefined'.
		// returns:
		//		Nothing.
		throw new Error('Unimplemented API: dojo.data.api.Notification.onSet');
	},

	onNew: function(/* dojo/data/api/Item */ newItem, /*object?*/ parentInfo){
		// summary:
		//		This function is called any time a new item is created in the store.
		//		It is called immediately after the store newItem processing has completed.
		// description:
		//		This function is called any time a new item is created in the store.
		//		It is called immediately after the store newItem processing has completed.
		// newItem:
		//		The item created.
		// parentInfo:
		//		An optional javascript object that is passed when the item created was placed in the store
		//		hierarchy as a value f another item's attribute, instead of a root level item.  Note that if this
		//		function is invoked with a value for parentInfo, then onSet is not invoked stating the attribute of
		//		the parent item was modified.  This is to avoid getting two notification  events occurring when a new item
		//		with a parent is created.  The structure passed in is as follows:
		// |	{
		// |		item: someItem,							//The parent item
		// |		attribute:	"attribute-name-string",	//The attribute the new item was assigned to.
		// |		oldValue: something	//Whatever was the previous value for the attribute.
		// |					//If it is a single-value attribute only, then this value will be a single value.
		// |					//If it was a multi-valued attribute, then this will be an array of all the values minus the new one.
		// |		newValue: something	//The new value of the attribute.  In the case of single value calls, such as setValue, this value will be
		// |					//generally be an atomic value of some sort (string, int, etc, object).  In the case of multi-valued attributes,
		// |					//it will be an array.
		// |	}
		// returns:
		//		Nothing.
		throw new Error('Unimplemented API: dojo.data.api.Notification.onNew');
	},

	onDelete: function(/* dojo/data/api/Item */ deletedItem){
		// summary:
		//		This function is called any time an item is deleted from the store.
		//		It is called immediately after the store deleteItem processing has completed.
		// description:
		//		This function is called any time an item is deleted from the store.
		//		It is called immediately after the store deleteItem processing has completed.
		// deletedItem:
		//		The item deleted.
		// returns:
		//		Nothing.
		throw new Error('Unimplemented API: dojo.data.api.Notification.onDelete');
	}
});

});
