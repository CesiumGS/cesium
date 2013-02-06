define(["dojo/_base/lang", "dojo/_base/declare", "dojo/on", "../Controller"],
function(lang, declare, on, Controller){
	// module:
	//		dojox/app/controllers/History
	// summary:
	//		Bind "startTransition" event on dojox/app application's domNode,
	//		Bind "popstate" event on window object.
	//		Maintain history by HTML5 "pushState" method and "popstate" event.

	return declare("dojox.app.controllers.History", Controller, {
		constructor: function(app){
			// summary:
			//		Bind "startTransition" event on dojox/app application's domNode,
			//		Bind "popstate" event on window object.
			//
			// app:
			//		dojox/app application instance.

			this.events = {
				"startTransition": this.onStartTransition
			};
			this.inherited(arguments);

			this.bind(window, "popstate", lang.hitch(this, this.onPopState));
		},
		
		_buildHashWithParams: function(hash, params){
			// summary:
			//		build up the url hash adding the params
			// hash: String
			//		the url hash
			// params: Object
			//		the params object
			//
			// returns:
	 		//		the params object
			//
			if(hash.charAt(0) !== "#"){
				hash = "#"+hash;
			}
			for(var item in params){
				var value = params[item];
				if(item && value != null){
					hash = hash+"&"+item+"="+params[item];
				}
			}
			return hash; // String			
		},

		onStartTransition: function(evt){
			// summary:
			//		Response to dojox/app "startTransition" event.
			//
			// example:
			//		Use "dojox/mobile/TransitionEvent" to trigger "startTransition" event, and this function will response the event. For example:
			//		|	var transOpts = {
			//		|		title:"List",
			//		|		target:"items,list",
			//		|		url: "#items,list",
			//		|		params: {"param1":"p1value"}
			//		|	};
			//		|	new TransitionEvent(domNode, transOpts, e).dispatch();
			//
			// evt: Object
			//		transition options parameter

			// bubbling "startTransition", so Transition controller can response to it.

			var target = evt.detail.target;
			var regex = /#(.+)/;
			if(!target && regex.test(evt.detail.href)){
				target = evt.detail.href.match(regex)[1];
			}
			
			// create url hash from target if it is not set
			var hash = evt.detail.url || "#"+evt.detail.target;
			if(evt.detail.params){
				hash = this._buildHashWithParams(hash, evt.detail.params);
			}

			// push states to history list
			history.pushState(evt.detail,evt.detail.href, hash);
		},

		onPopState: function(evt){
			// summary:
			//		Response to dojox/app "popstate" event.
			//
			// evt: Object
			//		transition options parameter

			// Clean browser's cache and refresh the current page will trigger popState event,
			// but in this situation the application not start and throw an error.
			// so we need to check application status, if application not STARTED, do nothing.
			if(this.app.getStatus() !== this.app.lifecycle.STARTED){
				return;
			}

			var state = evt.state;
			if(!state){
				if(!this.app._startView && window.location.hash){
					state = {
						target: ((location.hash && location.hash.charAt(0) == "#") ? location.hash.substr(1) : location.hash).split('&')[0],
						url: location.hash,
						params: this.app.getParamsFromHash(location.hash) || this.defaultParams || {}
					}
				}else{
					state = {};
				}
			}

			var target = state.target || this.app._startView || this.app.defaultView;
			var params = state.params || this.app._startParams || this.app.defaultParams || {};

			if(this.app._startView){
				this.app._startView = null;
			}
			var title = state.title || null;
			var href = state.url || null;

			if(evt._sim){
				history.replaceState(state, title, href);
			}

			// transition to the target view
			this.app.trigger("transition", {
				"viewId": target,
				"opts": lang.mixin({reverse: true}, evt.detail, {"params": params})
			});
		}
	});
});
