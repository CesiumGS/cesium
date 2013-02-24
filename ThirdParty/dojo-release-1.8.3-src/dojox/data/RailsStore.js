define(["dojo", "dojox", "dojox/data/JsonRestStore"], function(dojo, dojox) {

// Contains code donated by Travis Tilley under CLA
dojo.declare("dojox.data.RailsStore", dojox.data.JsonRestStore, {
	constructor: function(){
		// summary:
		//		RailsStore is a data store for interacting with RESTful Rails controllers
	},
	preamble: function(options){
		if(typeof options.target == 'string' && !options.service){
			var target = options.target.replace(/\/$/g, '');

			// Special getRequest handler for handling content type negotiation via
			// the Rails format extension, as well as properly setting the ID param
			// in the URL.
			var getRequest = function(id, args){
				args = args || {};
				var url = target;
				var query;
				var ident;

				if(dojo.isObject(id)){
					ident = '';
					query = '?' + dojo.objectToQuery(id);
				}else if(args.queryStr && args.queryStr.indexOf('?') != -1){
					ident = args.queryStr.replace(/\?.*/, '');
					query = args.queryStr.replace(/[^?]*\?/g, '?');
				}else if(dojo.isString(args.query) && args.query.indexOf('?') != -1){
					ident = args.query.replace(/\?.*/, '');
					query = args.query.replace(/[^?]*\?/g, '?');
				}else{
					ident = id ? id.toString() : '';
					query = '';
				}

				if(ident.indexOf('=') != -1){
					query = ident;
					ident = '';
				}

				if(ident){
					url = url + '/' + ident + '.json' + query;
				}else{
					url = url + '.json' + query;
				}

				var isSync = dojox.rpc._sync;
				dojox.rpc._sync = false;

				return {
					url : url,
					handleAs : 'json',
					contentType : 'application/json',
					sync : isSync,
					headers : {
						Accept : 'application/json,application/javascript',
						Range : args && (args.start >= 0 || args.count >= 0)
								? "items="
										+ (args.start || '0')
										+ '-'
										+ ((args.count && (args.count
												+ (args.start || 0) - 1)) || '')
								: undefined
					}
				};
			};

			options.service = dojox.rpc.Rest(this.target, true, null,
					getRequest);
		}
	},
	fetch: function(args){
		args = args || {};
		function addToQueryStr(obj){
			function buildInitialQueryString(){
				if(args.queryStr == null){
					args.queryStr = '';
				}
				if(dojo.isObject(args.query)){
					args.queryStr = '?' + dojo.objectToQuery(args.query);
				}else if(dojo.isString(args.query)){
					args.queryStr = args.query;
				}
			}
			function separator(){
				if(args.queryStr.indexOf('?') == -1){
					return '?';
				}else{
					return '&';
				}
			}
			if(args.queryStr == null){
				buildInitialQueryString();
			}
			args.queryStr = args.queryStr + separator() + dojo.objectToQuery(obj);
		}
		if(args.start || args.count){
			// in addition to the content range headers, also provide query parameters for use
			// with the will_paginate plugin if so desired.
			if((args.start || 0) % args.count){
				throw new Error("The start parameter must be a multiple of the count parameter");
			}
			addToQueryStr({
				page: ((args.start || 0) / args.count) + 1,
				per_page: args.count
			});
		}
		if(args.sort){
			// make the sort into query parameters
			var queryObj = {
				sortBy : [],
				sortDir : []
			};

			dojo.forEach(args.sort, function(item){
				queryObj.sortBy.push(item.attribute);
				queryObj.sortDir.push(!!item.descending ? 'DESC' : 'ASC');
			});

			addToQueryStr(queryObj);
			delete args.sort;
		}

		return this.inherited(arguments);
	},
	_processResults: function(results, deferred){
		var items;

		/*
		 * depending on the ActiveRecord::Base.include_root_in_json setting,
		 * you might get back an array of attribute objects, or an array of
		 * objects with the attribute object nested under an attribute having
		 * the same name as the (remote and unguessable) model class.
		 *
		 * 'Example' without root_in_json: [{'id':1, 'text':'first'}]
		 * 'Example' with root_in_json: [{'example':{'id':1, 'text':'first'}}]
		 */
		if((typeof this.rootAttribute == 'undefined') && results[0]){
			if(results[0][this.idAttribute]){
				this.rootAttribute = false;
				console.debug('RailsStore: without root_in_json');
			}else{
				for(var attribute in results[0]){
					if(results[0][attribute][this.idAttribute]){
						this.rootAttribute = attribute;
						console.debug('RailsStore: with root_in_json, attribute: ' + attribute);
					}
				}
			}
		}

		if(this.rootAttribute){
			items = dojo.map(results, function(item){
				return item[this.rootAttribute];
			}, this);
		}else{
			items = results;
		}

		// index the results
		var count = results.length;
		// if we don't know the length, and it is partial result, we will guess that it is twice as big, that will work for most widgets
		return {totalCount:deferred.fullLength || (deferred.request.count == count ? (deferred.request.start || 0) + count * 2 : count), items: items};
	}
});

return dojox.data.RailsStore;
});
