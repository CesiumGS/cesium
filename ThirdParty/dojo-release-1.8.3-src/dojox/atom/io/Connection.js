define([
	"dojo/_base/declare",
	"dojo/_base/kernel",
	"dojo/_base/xhr",
	"./model"
], function (declare, kernel, xhrUtil, model){

return declare("dojox.atom.io.Connection",null,{
	// summary:
	//		This object implements a transport layer for working with ATOM feeds and ATOM publishing protocols.
	// description:
	//		This object implements a transport layer for working with ATOM feeds and ATOM publishing protocols.
	//		Specifically, it provides a mechanism by which feeds can be fetched and entries can be fetched, created
	//		deleted, and modified.  It also provides access to the introspection data.

	constructor: function(/* Boolean */sync, /* Boolean */preventCache){
		// summary:
		//		initializer
		this.sync = sync;
		this.preventCache = preventCache;
	},

	preventCache: false, //Flag to denote if the instance should use the xhr prevent cache mechanism

	alertsEnabled: false, //Flag to turn on alerts instead of throwing errors.

	getFeed: function(/*String*/url, /*Function*/callback, /*Function*/errorCallback, scope){
		// summary:
		//		Function to obtain a s specific ATOM feed from a given ATOM Feed url.
		// description:
		//		This function takes the URL for a specific ATOM feed and returns
		//		the data from that feed to the caller through the use of a callback
		//		handler.
		// url: String
		//		The URL of the ATOM feed to fetch.
		// callback:
		//		Function
		//		A function reference that will handle the feed when it has been retrieved.
		//		The callback should accept two parameters:  The feed object and the original complete DOM object.
		// scope: Object
		//		The scope to use for all callbacks.
		// returns:
		//		Nothing. The return is handled through the callback handler.
		this._getXmlDoc(url, "feed", new model.Feed(), model._Constants.ATOM_NS, callback, /*handleDocumentRetrieved,*/ errorCallback, scope);
	},
	
	getService: function(url, callback, errorCallback, scope){
		// summary:
		//		Function to retrieve an introspection document from the given URL.
		// description:
		//		This function takes the URL for an ATOM item and feed and returns
		//		the introspection document.
		// url:
		//		String
		//		The URL of the ATOM document to obtain the introspection document of.
		// callback:
		//		Function
		//		A function reference that will handle the introspection document when it has been retrieved.
		//		The callback should accept two parameters:  The introspection document object and the original complete DOM object.
		// returns:
		//		Nothing. The return is handled through the callback handler.
		this._getXmlDoc(url, "service", new model.Service(url), model._Constants.APP_NS, callback, errorCallback, scope);
	},
	
	getEntry: function(url, callback, errorCallback, scope){
		// summary:
		//		Function to retrieve a single entry from an ATOM feed from the given URL.
		// description:
		//		This function takes the URL for an ATOM entry and returns the constructed dojox.atom.io.model.Entry object through
		//		the specified callback.
		// url:
		//		String
		//		The URL of the ATOM Entry document to parse.
		// callback:
		//		Function
		//		A function reference that will handle the Entry object obtained.
		//		The callback should accept two parameters, the dojox.atom.io.model.Entry object and the original dom.
		// returns:
		//		Nothing. The return is handled through the callback handler.
		this._getXmlDoc(url, "entry", new model.Entry(), model._Constants.ATOM_NS, callback, errorCallback, scope);
	},

	_getXmlDoc: function(url, nodeName, newNode, namespace, callback, errorCallback, scope){
		// summary:
		//		Internal Function to retrieve an XML document and pass the results to a callback.
		// description:
		//		This internal function takes the URL for an XML document and and passes the
		//		parsed contents to a specified callback.
		// url:
		//		String
		//		The URL of the XML document to retrieve
		// callback:
		//		Function
		//		A function reference that will handle the retrieved XML data.
		//		The callback should accept one parameter, the DOM of the parsed XML document.
		// returns:
		//		Nothing. The return is handled through the callback handler.
		if(!scope){
			scope = kernel.global;
		}
		var ae = this.alertsEnabled;
		var xhrArgs = {
			url: url,
			handleAs: "xml",
			sync: this.sync,
			preventCache: this.preventCache,
			load: function(data, args){
				var node	 = null;
				var evaldObj = data;
				var nodes;
				if(evaldObj){
					//find the first node of the appropriate name
					if(typeof(evaldObj.getElementsByTagNameNS)!= "undefined"){
						nodes = evaldObj.getElementsByTagNameNS(namespace,nodeName);
						if(nodes && nodes.length > 0){
							node = nodes.item(0);
						}else if(evaldObj.lastChild){
							// name_spaces can be used without declaration of atom (for example
							// gooogle feeds often returns iTunes name_space qualifiers on elements)
							// Treat this situation like name_spaces not enabled.
							node = evaldObj.lastChild;
						}
					}else if(typeof(evaldObj.getElementsByTagName)!= "undefined"){
						// Find the first eith the correct tag name and correct namespace.
						nodes = evaldObj.getElementsByTagName(nodeName);
						if(nodes && nodes.length > 0){
							for(var i=0; i<nodes.length; i++){
								if(nodes[i].namespaceURI == namespace){
									node = nodes[i];
									break;
								}
							}
						}else if(evaldObj.lastChild){
							node = evaldObj.lastChild;
						}
					}else if(evaldObj.lastChild){
						node = evaldObj.lastChild;
					}else{
						callback.call(scope, null, null, args);
						return;
					}
					newNode.buildFromDom(node);
					if(callback){
						callback.call(scope, newNode, evaldObj, args);
					}else if(ae){
						throw new Error("The callback value does not exist.");
					}
				}else{
					callback.call(scope, null, null, args);
				}
			}
		};

		if(this.user && this.user !== null){
			xhrArgs.user = this.user;
		}
		if(this.password && this.password !== null){
			xhrArgs.password = this.password;
		}

		if(errorCallback){
			xhrArgs.error = function(error, args){errorCallback.call(scope, error, args);};
		}else{
			xhrArgs.error = function(){
				throw new Error("The URL requested cannot be accessed");
			};
		}
		xhrUtil.get(xhrArgs);
	},

	updateEntry: function(entry, callback, errorCallback, retrieveUpdated, xmethod, scope){
		// summary:
		//		Function to update a specific ATOM entry by putting the new changes via APP.
		// description:
		//		This function takes a specific dojox.atom.io.model.Entry object and pushes the
		//		changes back to the provider of the Entry.
		//		The entry MUST have a link tag with rel="edit" for this to work.
		// entry:
		//		Object
		//		The dojox.atom.io.model.Entry object to update.
		// callback:
		//		Function
		//		A function reference that will handle the results from the entry update.
		//		The callback should accept two parameters:  The first is an Entry object, and the second is the URL of that Entry
		//		Either can be null, depending on the value of retrieveUpdated.
		// retrieveUpdated:
		//		boolean
		//		A boolean flag denoting if the entry that was updated should then be
		//		retrieved and returned to the caller via the callback.
		// xmethod:
		//		boolean
		//		Whether to use POST for PUT/DELETE items and send the X-Method-Override header.
		// scope:
		//		Object
		//		The scope to use for all callbacks.
		// returns:
		//		Nothing. The return is handled through the callback handler.
		if(!scope){
			scope = kernel.global;
		}
		entry.updated = new Date();
		var url = entry.getEditHref();
		if(!url){
			throw new Error("A URL has not been specified for editing this entry.");
		}

		var self = this;
		var ae = this.alertsEnabled;
		var xhrArgs = {
			url: url,
			handleAs: "text",
			contentType: "text/xml",
			sync: this.sync,
			preventCache: this.preventCache,
			load: function(data, args){
				var location = null;
				if(retrieveUpdated){
					location = args.xhr.getResponseHeader("Location");
					if(!location){location = url;}

					//Function to handle the callback mapping of a getEntry after an update to return the
					//entry and location.
					var handleRetrieve = function(entry, dom, args){
						if(callback){
							callback.call(scope, entry, location, args);
						}else if(ae){
							throw new Error("The callback value does not exist.");
						}
					};
					self.getEntry(location,handleRetrieve);
				}else{
					if(callback){
						callback.call(scope, entry, args.xhr.getResponseHeader("Location"), args);
					}else if(ae){
						throw new Error("The callback value does not exist.");
					}
				}
				return data;
			}
		};
		
		if(this.user && this.user !== null){
			xhrArgs.user = this.user;
		}
		if(this.password && this.password !== null){
			xhrArgs.password = this.password;
		}

		if(errorCallback){
			xhrArgs.error = function(error, args){errorCallback.call(scope, error, args);};
		}else{
			xhrArgs.error = function(){
				throw new Error("The URL requested cannot be accessed");
			};
		}

		if(xmethod){
			xhrArgs.postData = entry.toString(true); //Set the content to send.
			xhrArgs.headers = {"X-Method-Override": "PUT"};
			xhrUtil.post(xhrArgs);
		}else{
			xhrArgs.putData = entry.toString(true); //Set the content to send.
			var xhr = xhrUtil.put(xhrArgs);
		}
	},

	addEntry: function(entry, url, callback, errorCallback, retrieveEntry, scope){
		// summary:
		//		Function to add a new ATOM entry by posting the new entry via APP.
		// description:
		//		This function takes a specific dojox.atom.io.model.Entry object and pushes the
		//		changes back to the provider of the Entry.
		// entry:
		//		Object
		//		The dojox.atom.io.model.Entry object to publish.
		// callback:
		//		Function
		//		A function reference that will handle the results from the entry publish.
		//		The callback should accept two parameters:   The first is an dojox.atom.io.model.Entry object, and the second is the location of the entry
		//		Either can be null, depending on the value of retrieveUpdated.
		// retrieveEntry:
		//		boolean
		//		A boolean flag denoting if the entry that was created should then be
		//		retrieved and returned to the caller via the callback.
		// scope:
		//		Object
		//	 	The scope to use for all callbacks.
		// returns:
		//		Nothing. The return is handled through the callback handler.
		if(!scope){
			scope = kernel.global;
		}

		entry.published = new Date();
		entry.updated = new Date();

		var feedUrl = entry.feedUrl;
		var ae = this.alertsEnabled;

		//Determine which URL to use for the post.
		if(!url && feedUrl){url = feedUrl;}
		if(!url){
			if(ae){
				throw new Error("The request cannot be processed because the URL parameter is missing.");
			}
			return;
		}

		var self = this;
		var xhrArgs = {
			url: url,
			handleAs: "text",
			contentType: "text/xml",
			sync: this.sync,
			preventCache: this.preventCache,
			postData: entry.toString(true),
			load: function(data, args){
				var location = args.xhr.getResponseHeader("Location");
				if(!location){
					location = url;
				}
				if(!args.retrieveEntry){
					if(callback){
						callback.call(scope, entry, location, args);
					}else if(ae){
						throw new Error("The callback value does not exist.");
					}
				}else{
					//Function to handle the callback mapping of a getEntry after an update to return the
					//entry and location.
					var handleRetrieve = function(entry, dom, args){
						if(callback){
							callback.call(scope, entry, location, args);
						}else if(ae){
							throw new Error("The callback value does not exist.");
						}
					};
					self.getEntry(location,handleRetrieve);
				}
				return data;
			}
		};

		if(this.user && this.user !== null){
			xhrArgs.user = this.user;
		}
		if(this.password && this.password !== null){
			xhrArgs.password = this.password;
		}

		if(errorCallback){
			xhrArgs.error = function(error, args){errorCallback.call(scope, error, args);};
		}else{
			xhrArgs.error = function(){
				throw new Error("The URL requested cannot be accessed");
			};
		}
		xhrUtil.post(xhrArgs);
	},

	deleteEntry: function(entry,callback,errorCallback,xmethod,scope){
		// summary:
		//		Function to delete a specific ATOM entry via APP.
		// description:
		//		This function takes a specific dojox.atom.io.model.Entry object and calls for a delete on the
		//		service housing the ATOM Entry database.
		//		The entry MUST have a link tag with rel="edit" for this to work.
		// entry:
		//		Object
		//		The dojox.atom.io.model.Entry object to delete.
		// callback:
		//		Function
		//		A function reference that will handle the results from the entry delete.
		//		The callback is called only if the delete is successful.
		// returns:
		//		Nothing. The return is handled through the callback handler.
		if(!scope){
			scope = kernel.global;
		}

		var url = null;
		if(typeof(entry) == "string"){
			url = entry;
		}else{
			url = entry.getEditHref();
		}
		if(!url){
			callback.call(scope, false, null);
			throw new Error("The request cannot be processed because the URL parameter is missing.");
		}

		var xhrArgs = {
			url: url,
			handleAs: "text",
			sync: this.sync,
			preventCache: this.preventCache,
			load: function(data, args){
				callback.call(scope, args);
				return data;
			}
		};

		if(this.user && this.user !== null){
			xhrArgs.user = this.user;
		}
		if(this.password && this.password !== null){
			xhrArgs.password = this.password;
		}

		if(errorCallback){
			xhrArgs.error = function(error, args){errorCallback.call(scope, error, args);};
		}else{
			xhrArgs.error = function(){
				throw new Error("The URL requested cannot be accessed");
			};
		}
		if(xmethod){
			xhrArgs.headers = {"X-Method-Override": "DELETE"};
			dhxr.post(xhrArgs);
		}else{
			xhrUtil.del(xhrArgs);
		}
	}
});
});