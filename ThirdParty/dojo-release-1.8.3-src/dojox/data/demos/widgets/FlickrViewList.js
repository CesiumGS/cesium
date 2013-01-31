dojo.provide("dojox.data.demos.widgets.FlickrViewList");
dojo.require("dojox.dtl._Templated");
dojo.require("dijit._Widget");

dojo.declare("dojox.data.demos.widgets.FlickrViewList",
	[ dijit._Widget, dojox.dtl._Templated ],
	{
		store: null,
		items: null,

		templateString: dojo.cache("dojox", "data/demos/widgets/templates/FlickrViewList.html"),
	
		fetch: function(request){
			request.onComplete = dojo.hitch(this, "onComplete");
			request.onError = dojo.hitch(this, "onError");
			return this.store.fetch(request);
		},

		onError: function(){
			console.trace();
			this.items = [];
			this.render();
		},

		onComplete: function(items, request){
			this.items = items||[];
			this.render();
		}
	}
);
