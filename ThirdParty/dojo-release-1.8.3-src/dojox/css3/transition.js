define(["dojo/_base/lang",
		"dojo/_base/array",
		"dojo/_base/Deferred",
		"dojo/DeferredList",
		"dojo/on",
		"dojo/_base/sniff"], 
		function(lang, array, Deferred, DeferredList, on, has){
	// module: 
	//		dojox/css3/transition
	
	//create cross platform animation/transition effects
	//TODO enable opera mobile when it is hardware accelerated
	//TODO enable IE when CSS3 transition is supported in IE 10
	var transitionEndEventName = "transitionend";
	var transitionPrefix = "t"; //by default use "t" prefix and "ransition" to make word "transition"
	var translateMethodStart = "translate3d(";//Android 2.x does not support translateX in CSS Transition, we need to use translate3d in webkit browsers
	var translateMethodEnd = ",0,0)";
	if(has("webkit")){
		transitionPrefix = "WebkitT";
		transitionEndEventName = "webkitTransitionEnd";
	}else if(has("mozilla")){
		transitionPrefix = "MozT";
		translateMethodStart = "translateX(";
		translateMethodEnd = ")";
	}
	
	//TODO find a way to lock the animation and prevent animation conflict
	//Use the simple object inheritance
	var transition = function(/*Object?*/args){
		// summary:
		//		This module defines the transition utilities which can be used
		//		to perform transition effects based on the CSS Transition standard.
		// args:
		//		The arguments which will be mixed into this transition object.
		
		//default config should be in animation object itself instead of its prototype
		//otherwise, it might be easy for making mistake of modifying prototype
		var defaultConfig = {
				startState: {},
				endState: {},
				node: null,
				duration: 250,
				"in": true,
				direction: 1,
				autoClear: true
		};

		lang.mixin(this, defaultConfig);
		lang.mixin(this, args);

		//create the deferred object which will resolve after the animation is finished.
		//We can rely on "onAfterEnd" function to notify the end of a single animation,
		//but using a deferred object is easier to wait for multiple animations end.
		if(!this.deferred){
			this.deferred = new Deferred();
		}
	};
	
	lang.extend(transition, {
		
		play: function(){
			// summary:
			//		Plays the transition effect defined by this transition object.
			transition.groupedPlay([this]);
		},
		
		//method to apply the state of the transition
		_applyState: function(state){
			var style = this.node.style;
			for(var property in state){
				if(state.hasOwnProperty(property)){
					style[property] = state[property];
				}
			}
		},
		
		
		initState: function(){
			// summary:
			//		Method to initialize the state for a transition.
			
			//apply the immediate style change for initial state.
			this.node.style[transitionPrefix + "ransitionProperty"] = "none";
			this.node.style[transitionPrefix + "ransitionDuration"] = "0ms";
			this._applyState(this.startState);
			
		},
		
		_beforeStart: function(){
			if (this.node.style.display === "none"){
				this.node.style.display = "";
			}
			this.beforeStart();
		},
		
		_beforeClear: function(){
			this.node.style[transitionPrefix + "ransitionProperty"] = null;
			this.node.style[transitionPrefix + "ransitionDuration"] = null;
			if(this["in"] !== true){
				this.node.style.display = "none";
			}			 
			this.beforeClear();
		},
		
		_onAfterEnd: function(){
			this.deferred.resolve(this.node);
			if(this.node.id && transition.playing[this.node.id]===this.deferred){
				delete transition.playing[this.node.id];
			}
			this.onAfterEnd();
		},
		
		beforeStart: function(){
			// summary:
			//		The callback which will be called right before the start
			//		of the transition effect.
		},
		
		beforeClear: function(){
			// summary:
			//		The callback which will be called right after the end
			//		of the transition effect and before the final state is
			//		cleared.
		},
		
		onAfterEnd: function(){
			// summary:
			//		The callback which will be called right after the end
			//		of the transition effect and after the final state is
			//		cleared.
		},
		
		start: function(){
			// summary:
			//		Method to start the transition.
			this._beforeStart();
			this._startTime = new Date().getTime(); // set transition start timestamp
			this._cleared = false; // set clear flag to false

			var self = this;
			//change the transition duration
			self.node.style[transitionPrefix + "ransitionProperty"] = "all";
			self.node.style[transitionPrefix + "ransitionDuration"] = self.duration + "ms";
			
			//connect to clear the transition state after the transition end.
			//Since the transition is conducted asynchronously, we need to 
			//connect to transition end event to clear the state
			on.once(self.node, transitionEndEventName, function(){
				self.clear();
			});
			
			this._applyState(this.endState);
		},
		
		clear: function(){
			// summary:
			//		Method to clear the state after a transition.
			if(this._cleared) {
				return;
			}
			this._cleared = true; // set clear flag to true

			this._beforeClear();
			this._removeState(this.endState);
			// console.log(this.node.id + " clear.");
			this._onAfterEnd();
		},
		
		//create removeState method
		_removeState: function(state){
			var style = this.node.style;
			for(var property in state){
				if(state.hasOwnProperty(property)){
					style[property] = null;
				}
			}
		}
		
	});
	
	//TODO add the lock mechanism for all of the transition effects
	//	   consider using only one object for one type of transition.
	
	transition.slide = function(node, config){
		// summary:
		//		Method which is used to create the transition object of a slide effect.
		// node:
		//		The node that the slide transition effect will be applied on.
		// config:
		//		The cofig arguments which will be mixed into this transition object.

		//create the return object and set the startState, endState of the return
		var ret = new transition(config);
		ret.node = node;
		
		var startX = "0";
		var endX = "0";
		
		if(ret["in"]){
			if(ret.direction === 1){
				startX = "100%";
			}else{
				startX = "-100%";
			}
		}else{
			if(ret.direction === 1){
				endX = "-100%";
			}else{
				endX = "100%";
			}
		}
		
		ret.startState[transitionPrefix + "ransform"]=translateMethodStart+startX+translateMethodEnd;
		
		ret.endState[transitionPrefix + "ransform"]=translateMethodStart+endX+translateMethodEnd;
		
		return ret;
	};
		
	transition.fade = function(node, config){
		// summary:
		//		Method which is used to create the transition object of fade effect.
		// node:
		//		The node that the fade transition effect will be applied on.
		// config:
		//		The cofig arguments which will be mixed into this transition object.
		var ret = new transition(config);
		ret.node = node;
		
		var startOpacity = "0";
		var endOpacity = "0";
		
		if(ret["in"]){
			endOpacity = "1";
		}else{
			startOpacity = "1";
		}
		
		lang.mixin(ret, {
			startState:{
				"opacity": startOpacity
			},
			endState:{
				"opacity": endOpacity
			}
		});
		
		return ret;
	};
	
	transition.flip = function(node, config){
		// summary:
		//		Method which is used to create the transition object of flip effect.
		// node:
		//		The node that the flip transition effect will be applied on.
		// config:
		//		The cofig arguments which will be mixed into this transition object.
		
		var ret = new transition(config);
		ret.node = node;
	   
		if(ret["in"]){
			//Need to set opacity here because Android 2.2 has bug that
			//scale(...) in transform does not persist status
			lang.mixin(ret,{
				startState:{
					"opacity": "0"
				},
				endState:{
					"opacity": "1"
				}
			});
			ret.startState[transitionPrefix + "ransform"]="scale(0,0.8) skew(0,-30deg)";
			ret.endState[transitionPrefix + "ransform"]="scale(1,1) skew(0,0)";
		}else{
			lang.mixin(ret,{
				startState:{
					"opacity": "1"
				},
				endState:{
					"opacity": "0"
				}
			});			
			ret.startState[transitionPrefix + "ransform"]="scale(1,1) skew(0,0)";
			ret.endState[transitionPrefix + "ransform"]="scale(0,0.8) skew(0,30deg)";
		}
		
		return ret;
	};
	
	var getWaitingList = function(/*Array*/ nodes){
		var defs = [];
		array.forEach(nodes, function(node){
			//check whether the node is under other animation
			if(node.id && transition.playing[node.id]){
				//hook on deferred object in transition.playing
				defs.push(transition.playing[node.id]);
			}
			
		});
		return new DeferredList(defs);
	};
	
	transition.getWaitingList = getWaitingList;
	
	transition.groupedPlay = function(/*Array*/args){
		// summary:
		//		The method which groups multiple transitions and plays 
		//		them together.
		// args: 
		//		The array of transition objects which will be played together.
		
		var animNodes = array.filter(args, function(item){
			return item.node;
		});
		
		var waitingList = getWaitingList(animNodes);

		//update registry with deferred objects in animations of args.
		array.forEach(args, function(item){
			if(item.node.id){
				transition.playing[item.node.id] = item.deferred;
			}
		});
		
		//wait for all deferred object in deferred list to resolve
		Deferred.when(waitingList, function(){
			array.forEach(args, function(item){
				//set the start state
				item.initState();
			});
			
			//Assume the fps of the animation should be higher than 30 fps and
			//allow the browser to use one frame's time to redraw so that
			//the transition can be started
			setTimeout(function(){
				array.forEach(args, function(item){
					item.start();
				});

				// check and clear node if the node not cleared.
				// 1. on Android2.2/2.3, the "fade out" transitionEnd event will be lost if the soft keyboard popup, so we need to check nodes' clear status.
				// 2. The "fade in" transitionEnd event will before or after "fade out" transitionEnd event and it always occurs.
				//	  We can check fade out node status in the last "fade in" node transitionEnd event callback, if node transition timeout, we clear it.
				// NOTE: the last "fade in" transitionEnd event will always fired, so we bind on this event and check other nodes.
				on.once(args[args.length-1].node, transitionEndEventName, function(){
					var timeout;
					for(var i=0; i<args.length-1; i++){
						if(args[i].deferred.fired !== 0){
							timeout = new Date().getTime() - args[i]._startTime;
							if(timeout >= args[i].duration){
								args[i].clear();
							}
						}
					}
				});
			}, 33);
		});		   
	};
	
	transition.chainedPlay = function(/*Array*/args){
		// summary:
		//		The method which plays multiple transitions one by one.
		// args: 
		//		The array of transition objects which will be played in a chain.
		
		var animNodes = array.filter(args, function(item){
			return item.node;
		});
		
		var waitingList = getWaitingList(animNodes);

		//update registry with deferred objects in animations of args.
		array.forEach(args, function(item){
			if(item.node.id){
				transition.playing[item.node.id] = item.deferred;
			}
		});
		
		Deferred.when(waitingList, function(){
			array.forEach(args, function(item){
				//set the start state
				item.initState();
			});
			
			//chain animations together
			for (var i=1, len=args.length; i < len; i++){
				args[i-1].deferred.then(lang.hitch(args[i], function(){
					this.start();
				}));
			}
			
			//Assume the fps of the animation should be higher than 30 fps and
			//allow the browser to use one frame's time to redraw so that
			//the transition can be started
			setTimeout(function(){
				args[0].start();
			}, 33);
		});		   
	};
	
	//TODO complete the registry mechanism for animation handling and prevent animation conflicts
	transition.playing = {};
	
	return transition;
});
