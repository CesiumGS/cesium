define(["dojo", "dojox"], function(dojo, dojox) {

// this is a mixin to convert object attribute queries to
// JSONQuery/JSONPath syntax to be sent to the server.
return dojo.declare("dojox.data.util.JsonQuery", null, {
	useFullIdInQueries: false,
	_toJsonQuery: function(args, jsonQueryPagination){
		var first = true;
		var self = this;
		function buildQuery(path, query){
			var isDataItem = query.__id;
			if(isDataItem){
				// it is a reference to a persisted object, need to make it a query by id
				var newQuery = {};
				newQuery[self.idAttribute] = self.useFullIdInQueries ? query.__id : query[self.idAttribute];
				query = newQuery;
			}
			for(var i in query){
				// iterate through each property, adding them to the overall query
				var value = query[i];
				var newPath = path + (/^[a-zA-Z_][\w_]*$/.test(i) ? '.' + i : '[' + dojo._escapeString(i) + ']');
				if(value && typeof value == "object"){
					buildQuery(newPath, value);
				}else if(value!="*"){ // full wildcards can be ommitted
					jsonQuery += (first ? "" : "&") + newPath +
						((!isDataItem && typeof value == "string" && args.queryOptions && args.queryOptions.ignoreCase) ? "~" : "=") +
						 (self.simplifiedQuery ? encodeURIComponent(value) : dojo.toJson(value));
					first = false;
				}
			}
		}
		// performs conversion of Dojo Data query objects and sort arrays to JSONQuery strings
		if(args.query && typeof args.query == "object"){
			// convert Dojo Data query objects to JSONQuery
			var jsonQuery = "[?(";
			buildQuery("@", args.query);
			if(!first){
				// use ' instead of " for quoting in JSONQuery, and end with ]
				jsonQuery += ")]";
			}else{
				jsonQuery = "";
			}
			args.queryStr = jsonQuery.replace(/\\"|"/g,function(t){return t == '"' ? "'" : t;});
		}else if(!args.query || args.query == '*'){
			args.query = "";
		}
		
		var sort = args.sort;
		if(sort){
			// if we have a sort order, add that to the JSONQuery expression
			args.queryStr = args.queryStr || (typeof args.query == 'string' ? args.query : "");
			first = true;
			for(i = 0; i < sort.length; i++){
				args.queryStr += (first ? '[' : ',') + (sort[i].descending ? '\\' : '/') + "@[" + dojo._escapeString(sort[i].attribute) + "]";
				first = false;
			}
			args.queryStr += ']';
		}
		// this is optional because with client side paging JSONQuery doesn't yield the total count
		if(jsonQueryPagination && (args.start || args.count)){
			// pagination
			args.queryStr = (args.queryStr || (typeof args.query == 'string' ? args.query : "")) +
				'[' + (args.start || '') + ':' + (args.count ? (args.start || 0) + args.count : '') + ']';
		}
		if(typeof args.queryStr == 'string'){
			args.queryStr = args.queryStr.replace(/\\"|"/g,function(t){return t == '"' ? "'" : t;});
			return args.queryStr;
		}
		return args.query;
	},
	jsonQueryPagination: true,
	fetch: function(args){
		this._toJsonQuery(args, this.jsonQueryPagination);
		return this.inherited(arguments);
	},
	isUpdateable: function(){
		return true;
	},
	matchesQuery: function(item,request){
		request._jsonQuery = request._jsonQuery || dojox.json.query(this._toJsonQuery(request));
		return request._jsonQuery([item]).length;
	},
	clientSideFetch: function(/*Object*/ request,/*Array*/ baseResults){
		request._jsonQuery = request._jsonQuery || dojox.json.query(this._toJsonQuery(request));
		// we use client side paging function here instead of JSON Query because we must also determine the total count
		return this.clientSidePaging(request, request._jsonQuery(baseResults));
	},
	querySuperSet: function(argsSuper,argsSub){
		if(!argsSuper.query){
			return argsSub.query;
		}
		return this.inherited(arguments);
	}
	
});

});
