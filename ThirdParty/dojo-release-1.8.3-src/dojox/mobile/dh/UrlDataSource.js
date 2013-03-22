define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/xhr"
], function(declare, lang, xhr){

	// module:
	//		dojox/mobile/dh/UrlDataSource

	return declare("dojox.mobile.dh.UrlDataSource", null, {
		// summary:
		//		A component that accesses the given URL and fetches the data as text.

		text: "",

		_url: "",

		constructor: function(/*String*/ url){
			// summary:
			//		Creates a new instance of the class.
			this._url = url;
		},

		getData: function(){
			// summary:
			//		Returns a Deferred that accesses the given URL and fetches the data as text.
			var obj = xhr.get({
				url: this._url,
				handleAs: "text"
			});
			obj.addCallback(lang.hitch(this, function(response, ioArgs){
				this.text = response;
			}));
			obj.addErrback(function(error){
				console.log("Failed to load "+this._url+"\n"+(error.description||error));
			});
			return obj; // Deferred
		}
	});
});
