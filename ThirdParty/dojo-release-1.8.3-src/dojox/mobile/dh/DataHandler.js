define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/Deferred",
	"./ContentTypeMap"
], function(declare, lang, Deferred, ContentTypeMap){

	// module:
	//		dojox/mobile/dh/DataHandler

	return declare("dojox.mobile.dh.DataHandler", null, {
		// summary:
		//		A component that provides an interface between data and handlers.
		// description:
		//		This module fetches data through DataSource and calls a
		//		ContentHandler to parse the content data and create a new view.

		// ds: Object
		//		A DataSource instance.
		ds: null,

		// target: DomNode
		//		A DOM node under which a new view is created.
		target: null,

		// refNode: DomNode
		//		An optional reference DOM node before which a new view is created.
		refNode: null,

		constructor: function(/*DataSource*/ ds, /*DomNode*/ target, /*DomNode?*/ refNode){
			// summary:
			//		Creates a new instance of the class.
			this.ds = ds;
			this.target = target;
			this.refNode = refNode;
		},

		processData: function(/*String*/ contentType, /*Function*/ callback){
			// summary:
			//		Fetches data through DataSource and passes it to a content
			//		handler.
			// contentType:
			//		The type of the content. (ex. "html")
			//		It is used to determine what content handler to use.
			// callback:
			//		A function to be called after creating a new view.
			var ch = ContentTypeMap.getHandlerClass(contentType);
			require([ch], lang.hitch(this, function(ContentHandler){
				Deferred.when(this.ds.getData(), lang.hitch(this, function(){
					Deferred.when(new ContentHandler().parse(this.ds.text, this.target, this.refNode), function(id){
						callback(id);
					});
				}))
			}));
		}
	});
});
