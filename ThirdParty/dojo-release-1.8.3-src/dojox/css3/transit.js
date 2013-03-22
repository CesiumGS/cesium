define(["dojo/_base/array","dojo/dom-style","dojo/DeferredList","./transition"],
	function(darray, domStyle, DeferredList, transition){
	// module: 
	//		dojox/css3/transit
	
	var transit = function(/*DomNode*/from, /*DomNode*/to, /*Object?*/options){
		// summary:
		//		Performs a transition to hide a node and show another node.
		// description:
		//		This module defines the transit method which is used
		//		to transit the specific region of an application from 
		//		one view/page to another view/page. This module relies 
		//		on utilities provided by dojox/css3/transition for the 
		//		transition effects.
		// options:
		//		The argument to specify the transit effect and direction.
		//		The effect can be specified in options.transition. The
		//		valid values are 'slide', 'flip', 'fade', 'none'.
		//		The direction can be specified in options.reverse. If it
		//		is true, the transit effects will be conducted in the
		//		reverse direction to the default direction.
		var rev = (options && options.reverse) ? -1 : 1;
		if(!options || !options.transition || !transition[options.transition]){
			domStyle.set(from,"display","none");
			domStyle.set(to, "display", "");
			if(options.transitionDefs){
				if(options.transitionDefs[from.id]){
					options.transitionDefs[from.id].resolve(from);
				}
				if(options.transitionDefs[to.id]){
								options.transitionDefs[to.id].resolve(to);
				}
			}
			// return a fired DeferredList if the options.transition="none"
			return new DeferredList([]);
		}else{
			var defs=[];
			var transit=[];
			var duration = 250;
			if(options.transition === "fade"){
				duration = 600;
			}else if (options.transition === "flip"){
				duration = 200;
			}
			domStyle.set(from, "display", ""); 
			domStyle.set(to, "display", "");
			if (from){
				//create transition to transit "from" out
				var fromTransit = transition[options.transition](from, {
					"in": false,
					direction: rev,
					duration: duration,
					deferred: (options.transitionDefs && options.transitionDefs[from.id]) ? options.transitionDefs[from.id] : null
				});
				defs.push(fromTransit.deferred);//every transition object should have a deferred.
				transit.push(fromTransit);
			}
			
			//create transition to transit "to" in					
			var toTransit = transition[options.transition](to, {
							direction: rev,
							duration: duration,
							deferred: (options.transitionDefs && options.transitionDefs[to.id]) ? options.transitionDefs[to.id] : null
						});
			defs.push(toTransit.deferred);//every transition object should have a deferred.
			transit.push(toTransit);
			
			//If it is flip use the chainedPlay, otherwise
			//play fromTransit and toTransit together
			if(options.transition === "flip"){
				transition.chainedPlay(transit);
			}else{
				transition.groupedPlay(transit);
			}

			return new DeferredList(defs);
		}
	};
	
	return transit;
});
