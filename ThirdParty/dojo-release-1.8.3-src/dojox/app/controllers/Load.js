define(["dojo/_base/lang", "dojo/_base/declare", "dojo/on", "dojo/Deferred", "dojo/when", "../Controller", "../View"],
function(lang, declare, on, Deferred, when, Controller, View){
	// module:
	//		dojox/app/controllers/Load
	// summary:
	//		Bind "load" event on dojox/app application's domNode.
	//		Load child view and sub children at one time.

	return declare("dojox.app.controllers.Load", Controller, {

		constructor: function(app, events){
			// summary:
			//		bind "load" event on application's domNode.
			//
			// app:
			//		dojox/app application instance.
			// events:
			//		{event : handler}
			this.events = {
				"load": this.load
			};
			this.inherited(arguments);
		},

		load: function(event){
			// summary:
			//		Response to dojox/app "load" event.
			//
			// example:
			//		Use trigger() to trigger "load" event, and this function will response the event. For example:
			//		|	this.trigger("load", {"parent":parent, "viewId":viewId, "callback":function(){...}});
			//
			// event: Object
			//		Load event parameter. It should be like this: {"parent":parent, "viewId":viewId, "callback":function(){...}}
			// returns:
			//		A dojo/Deferred object.
			//		The return value cannot return directly. 
			//		If the caller need to use the return value, pass callback function in event parameter and process return value in callback function.

			var parent = event.parent || this.app;
			var viewId = event.viewId || "";
			var parts = viewId.split(',');
			var childId = parts.shift();
			var subIds = parts.join(",");
			var params = event.params || "";
			
			var def = this.loadChild(parent, childId, subIds, params);
			// call Load event callback
			if(event.callback){
				when(def, event.callback);
			}
			return def;
		},

		createChild: function(parent, childId, subIds, params){
			// summary:
			//		Create dojox.app.view instance if it is not loaded.
			//
			// parent: Object
			//		parent of the view.
			// childId: String
			//		view id need to be loaded.
			// subIds: String
			//		sub views' id of this view.
			// returns:
			//		If view exist, return the view object.
			//		Otherwise, create the view and return a dojo.Deferred instance.

			var id = parent.id + '_' + childId;
			if(parent.children[id]){
				return parent.children[id];
			}
			//create and start child. return Deferred
			var newView = new View(lang.mixin({
				"app": this.app,
				"id": id,
				"name": childId,
				"parent": parent
			},{"params": params}));
			parent.children[id] = newView;
			return newView.start();
		},

		loadChild: function(parent, childId, subIds, params){
			// summary:
			//		Load child and sub children views recursively.
			//
			// parent: Object
			//		parent of this view.
			// childId: String
			//		view id need to be loaded.
			// subIds: String
			//		sub views' id of this view.
			// params: Object
			//		params of this view.
			// returns:
			//		A dojo/Deferred instance which will be resovled when all views loaded.

			if(!parent){
				throw Error("No parent for Child '" + childId + "'.");
			}

			if(!childId){
				var parts = parent.defaultView ? parent.defaultView.split(",") : "default";
				childId = parts.shift();
				subIds = parts.join(',');
			}

			var loadChildDeferred = new Deferred();
			var createPromise;
			try{
				createPromise = this.createChild(parent, childId, subIds, params);
			}catch(ex){
				loadChildDeferred.reject("load child '"+childId+"' error.");
				return loadChildDeferred.promise;
			}
			when(createPromise, lang.hitch(this, function(child){
				// if no subIds and current view has default view, load the default view.
				if(!subIds && child.defaultView){
					subIds = child.defaultView;
				}

				var parts = subIds.split(',');
				childId = parts.shift();
				subIds = parts.join(',');
				if(childId){
					var subLoadDeferred = this.loadChild(child, childId, subIds, params);
					when(subLoadDeferred, function(){
						loadChildDeferred.resolve();
					},
					function(){
						loadChildDeferred.reject("load child '"+childId+"' error.");
					});
				}else{
					loadChildDeferred.resolve();
				}
			}),
			function(){
				loadChildDeferred.reject("load child '"+childId+"' error.")
			});
			return loadChildDeferred.promise; // dojo/Deferred.promise
		}
	});
});
