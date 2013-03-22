define([
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/hash",
	"dijit/registry",
	"./TransitionEvent",
	"./View",
	"./viewRegistry"
], function(array, connect, lang, win, hash, registry, TransitionEvent, View, viewRegistry){

	// module:
	//		dojox/mobile/bookmarkable

	var b = {
		// summary:
		//		Utilities to make the view transitions bookmarkable.

		// settingHash: [private] Boolean
		//		Whether the browser URL needs to be updated to include the hash.
		settingHash: false,
		
		// transitionInfo: Array
		//		An array containing information about the transition.
		transitionInfo: [],

		getTransitionInfo: function(/*String*/ fromViewId, /*String*/ toViewId){
			// summary:
			//		Returns an array containing the transition information.
			return this.transitionInfo[fromViewId.replace(/^#/, "") + ":" + toViewId.replace(/^#/, "")]; // Array
		},

		addTransitionInfo: function(/*String*/ fromViewId, /*String*/ toViewId, /*Object*/args){
			// summary:
			//		Adds transition information.
			this.transitionInfo[fromViewId.replace(/^#/, "") + ":" + toViewId.replace(/^#/, "")] = args;
		},

		findTransitionViews: function(/*String*/moveTo){
			// summary:
			//		Searches for a starting view and a destination view.
			if(!moveTo){ return []; }
			var view = registry.byId(moveTo.replace(/^#/, ""));
			if(!view){ return []; }
			for(var v = view.getParent(); v; v = v.getParent()){ // search for the topmost invisible parent node
				if(v.isVisible && !v.isVisible()){
					view = v;
				}
			}
			// fromView, toView
			return [view.getShowingView(), view]; // Array 
		},

		onHashChange: function(value){
			// summary:
			//		Called on "/dojo/hashchange" events.
			if(this.settingHash){
				this.settingHash = false;
				return;
			}
			var params = this.handleFragIds(value);
			params.hashchange = true;
			new TransitionEvent(win.body(), params).dispatch();
		},

		handleFragIds: function(/*String*/fragIds){
			// summary:
			//		Analyzes the given hash (fragment id).
			// description:
			//		Given a comma-separated list of view IDs, this method
			//		searches for a transition destination, and makes all the
			//		views in the hash visible.

			var arr, moveTo;
			if(!fragIds){
				moveTo = viewRegistry.initialView.id;
				arr = this.findTransitionViews(moveTo);
			}else{
				var ids = fragIds.replace(/^#/, "").split(/,/);
				for(var i = 0; i < ids.length; i++){
					// Search for a transition destination view.

					var view = registry.byId(ids[i]);

					// Skip a visible view. Visible view can't be a destination candidate.
					if(view.isVisible()){ continue; }

					// Check if all the ancestors are in the fragIds.
					// If not, obviously the view was NOT visible before the previous transition.
					// That means the previous transition can't happen from that view,
					// which means the view can't be a destination.
					var success = true;
					for(var v = viewRegistry.getParentView(view); v; v = viewRegistry.getParentView(v)){
						if(array.indexOf(ids, v.id) === -1){
							success = false;
							break;
						}
					}
					if(!success){
						// Simply make the view visible without transition.
						array.forEach(view.getSiblingViews(), function(v){
							v.domNode.style.display = (v === view) ? "" : "none";
						});
						continue;
					}

					arr = this.findTransitionViews(ids[i]);
					if(arr.length === 2){
						moveTo = ids[i];
						// The destination found. But continue the loop to make
						// the other views in the fragIds visible.
					}
				}
			}

			var args = this.getTransitionInfo(arr[0].id, arr[1].id);
			var dir = 1;
			if(!args){
				args = this.getTransitionInfo(arr[1].id, arr[0].id);
				dir = -1;
			}

			return {
				moveTo: "#" + moveTo,
				transitionDir: args ? args.transitionDir * dir : 1,
				transition: args ? args.transition : "none"
			};
		},

		setFragIds: function(/*Widget*/toView){
			// summary:
			//		Updates the hash (fragment id) in the browser URL.
			// description:
			//		The hash value consists of one or more visible view ids
			//		separated with commas.

			var arr = array.filter(viewRegistry.getViews(), function(v){ return v.isVisible(); });
			this.settingHash = true;
			hash(array.map(arr, function(v){ return v.id; }).join(","));
		}
	};

	connect.subscribe("/dojo/hashchange", null, function(){ b.onHashChange.apply(b, arguments); });

	lang.extend(View, {
		getTransitionInfo: function(){ b.getTransitionInfo.apply(b, arguments); },
		addTransitionInfo: function(){ b.addTransitionInfo.apply(b, arguments); },
		handleFragIds: function(){ b.handleFragIds.apply(b, arguments); },
		setFragIds: function(){ b.setFragIds.apply(b, arguments); }
	});

	return b;
});
