dojo.provide("dojox.data.demos.stores.LazyLoadJSIStore");
dojo.require("dojo.data.ItemFileReadStore");

dojo.declare("dojox.data.demos.stores.LazyLoadJSIStore", dojo.data.ItemFileReadStore, {
	constructor: function(/* object */ keywordParameters){
		// LazyLoadJSIStore extends ItemFileReadStore to implement an
		// example of lazy-loading/faulting in items on-demand.
		// Note this is certianly not a perfect implementation, it is
		// an example.
	},
	
	isItemLoaded: function(/*object*/ item) {
		//	summary:
		//		Overload of the isItemLoaded function to look for items of type 'stub', which indicate
		//		the data hasn't been loaded in yet.
		//
		//	item:
		//		The item to examine.
		
		//For this store, if it has the value of stub for its type attribute,
		//then the item basn't been fully loaded yet.  It's just a placeholder.
		if(this.getValue(item, "type") === "stub"){
			return false;
		}
		return true;
	},
		
	loadItem: function(keywordArgs){
		//	summary:
		//		Overload of the loadItem function to fault in items.  This assumes the data for an item is laid out
		//		in a RESTful sort of pattern name0/name1/data.json and so on and uses that to load the data.
		//		It will also detect stub items in the newly loaded item and insert the stubs into the ItemFileReadStore
		//		list so they can also be loaded in on-demand.
		//
		//	item:
		//		The item to examine.

		var item = keywordArgs.item;
		this._assertIsItem(item);

		//Build the path to the data.json for this item
		//The path consists of where its parent was loaded from
		//plus the item name.
		var itemName = this.getValue(item, "name");
		var parent   = this.getValue(item, "parent");
		var dataUrl  = "";
		if (parent){
			dataUrl += (parent + "/");
		}

		//For this store, all child input data is loaded from a url that ends with data.json
		dataUrl += itemName + "/data.json";

		//Need a reference to the store to call back to its structures.
		var self = this;

		// Callback for handling a successful load.
		var gotData = function(data){
			//Now we need to modify the existing item a bit to take it out of stub state
			//Since we extend the store and have knowledge of the internal
			//structure, this can be done here.  Now, is we extended
			//a write store, we could call the write APIs to do this too
			//But for a simple demo the diretc modification in the store function
			//is sufficient.

			//Clear off the stub indicators.
			delete item.type;
			delete item.parent;

			//Set up the loaded values in the format ItemFileReadStore uses for attributes.
			for (var i in data) {
				if (dojo.isArray(data[i])) {
					item[i] = data[i];
				}else{
					item[i] = [data[i]];
				}
			}

			//Reset the item in the reference.
			self._arrayOfAllItems[item[self._itemNumPropName]] = item;

			//Scan the new values in the item for extra stub items we need to
			//add to the items array of the store so they can be lazy-loaded later...
			var attributes = self.getAttributes(item);
			for(i in attributes){
				var values = item[attributes[i]];
				for (var j = 0; j < values.length; j++) {
					var value = values[j];
					
					if(typeof value === "object"){
						if(value["stub"] ){
							//We have a stub reference here, we need to create the stub item
							var stub = {
								type: ["stub"],
								name: [value["stub"]],	//
								parent: [itemName]		//The child stub item is parented by this item name...
							};
							if (parent) {
								//Add in any parents to your parent so URL construstruction is accurate.
								stub.parent[0] = parent + "/" + stub.parent[0];
							}
							//Finalize the addition of the new stub item into the ItemFileReadStore list.
							self._arrayOfAllItems.push(stub);
							stub[self._storeRefPropName] = self;
							stub[self._itemNumPropName] = (self._arrayOfAllItems.length - 1); //Last one pushed in should be the item
							values[j] = stub; //Set the stub item back in its place and replace the stub notation.
						}
					}
				}
			}

			//Done processing!  Call the onItem, if any.
			if(keywordArgs.onItem){
				var scope = keywordArgs.scope ? keywordArgs.scope : dojo.global;
				keywordArgs.onItem.call(scope, item);
			}
		};

		//Callback for any errors that occur during load.
		var gotError = function(error){
			//Call the onComplete, if any
			if(keywordArgs.onError){
				var scope = keywordArgs.scope ? keywordArgs.scope : dojo.global;
				keywordArgs.onError.call(scope, error);
			}
		};

		//Fire the get and pass the proper callbacks to the deferred.
		var xhrArgs = {
			url: dataUrl,
			handleAs: "json-comment-optional"
		};
		var d = dojo.xhrGet(xhrArgs);
		d.addCallback(gotData);
		d.addErrback(gotError);
	}
});

