define(['../on', '../_base/window', '../dom-construct', '../domReady!'], function(on, baseWin, domConstruct){
	// summary:
	//		This sub module provide an event factory for delayed events (like debounce or throttle)
	// module:
	//		dojo/on/asyncEventListener


	//Testing is the browser support async event access
	//If not we need to clone the event, otherwise accessing the event properties
	//will trigger a JS error (invalid member)
	var testNode = domConstruct.create('div', null, baseWin.body()),
		testEvent,
		requiresClone;
	on.once(testNode, 'click', function(e){
		testEvent = e;
	});
	testNode.click();
	try{
		requiresClone = testEvent.clientX === undefined;
	}catch(e){
		requiresClone = true;
	}finally{
		domConstruct.destroy(testNode);
	}

	function clone(arg){
		// summary:
		//		clone the event
		// description:
		//		Used if the browser provides a corrupted event (comming from a node) when passed to an async function
		var argCopy = {},
			i;
		for(i in arg){
			argCopy[i] = arg[i];
		}
		return argCopy;
	}

	return function(listener){
		if(requiresClone){
			return function(e){
				//lang.clone fail to clone events, so we use a custom function
				listener.call(this, clone(e));
			};
		}
		return listener;
	};
});
