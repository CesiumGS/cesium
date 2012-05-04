define(["dojo/_base/kernel", "dojo/_base/array","dojo/dom-style","dojo/DeferredList","./transition"],
	function(dojo, darray, domStyle, DeferredList,transition){
	var transit =  function(from, to, options){
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
			
			//TODO If it is flip use the chainedPlay
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
