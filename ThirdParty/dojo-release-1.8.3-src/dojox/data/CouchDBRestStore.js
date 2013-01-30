define(["dojo", "dojox", "dojox/data/JsonRestStore"], function(dojo, dojox) {
dojo.declare("dojox.data.CouchDBRestStore",
	dojox.data.JsonRestStore,
	{
	// summary:
	//		A CouchDBRestStore is an extension of JsonRestStore to handle CouchDB's idiosyncrasies, special features,
	//		and deviations from standard HTTP Rest.
	//		NOTE: CouchDB is not designed to be run on a public facing network. There is no access control
	//	 	on database documents, and you should NOT rely on client side control to implement security.

		save: function(kwArgs){
			var actions = this.inherited(arguments); // do the default save and then update for version numbers
			var prefix = this.service.servicePath;
			for(var i = 0; i < actions.length; i++){
				// need to update the item's version number after it has been committed
				(function(item,dfd){
					dfd.addCallback(function(result){
						if(result){
							item.__id = prefix + result.id; // update the object with the results of the post
							item._rev = result.rev;
						}
						return result;
					});
				})(actions[i].content,actions[i].deferred);
			}
		},
		fetch: function(args){
			// summary:
			//		This only differs from JsonRestStore in that it, will put the query string the query part of the URL and it handles start and count
			args.query = args.query || '_all_docs?';
			if(args.start){
				args.query = (args.query ? (args.query + '&') : '') + 'skip=' + args.start;
				delete args.start;
			}
			if(args.count){
				args.query = (args.query ? (args.query + '&') : '') + 'limit=' + args.count;
				delete args.count;
			}
			return this.inherited(arguments);
		},
		_processResults: function(results){
			var rows = results.rows;
			if(rows){
				var prefix = this.service.servicePath;
				var self = this;
				for(var i = 0; i < rows.length;i++){
					var realItem = rows[i].value;
					realItem.__id= prefix + rows[i].id;
					realItem._id= rows[i].id;
					realItem._loadObject= dojox.rpc.JsonRest._loader;
					rows[i] = realItem;
				}
				return {totalCount:results.total_rows, items:results.rows};
			}else{
				return {items:results};
			}

		}
	}
);

// create a set of stores
dojox.data.CouchDBRestStore.getStores = function(couchServerUrl){
	var dfd = dojo.xhrGet({
		url: couchServerUrl+"_all_dbs",
		handleAs: "json",
		sync: true
	});
	var stores = {};
	dfd.addBoth(function(dbs){
		for(var i = 0; i < dbs.length; i++){
			stores[dbs[i]] = new dojox.data.CouchDBRestStore({target:couchServerUrl + dbs[i],idAttribute:"_id"});
		}
		return stores;
	});
	return stores;
};

return dojox.data.CouchDBRestStore;

});
