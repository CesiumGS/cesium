dojo.provide("dojox.data.restListener");

dojox.data.restListener = function(message){
	// summary:
	//		this function can be used to receive REST notifications, from Comet or from another frame
	// example:
	//	|	dojo.connect(window,"onMessage",null,function(event) {
	//	|		var data = dojo.fromJson(event.data);
	//	|		dojox.restListener(data);
	//	|	});
	var channel = message.channel;
	var jr = dojox.rpc.JsonRest;
	var service = jr.getServiceAndId(channel).service;
	var result = dojox.json.ref.resolveJson(message.result, {
					defaultId: message.event == 'put' && channel,
					index: dojox.rpc.Rest._index,
					idPrefix: service.servicePath.replace(/[^\/]*$/,''),
					idAttribute: jr.getIdAttribute(service),
					schemas: jr.schemas,
					loader: jr._loader,
					assignAbsoluteIds: true
				});
	var target = dojox.rpc.Rest._index && dojox.rpc.Rest._index[channel];
	var onEvent = 'on' + message.event.toLowerCase();
	var store = service && service._store;
	if(target){
		if(target[onEvent]){
			target[onEvent](result); // call the REST handler if available
			return;
		}
	}
	// this is how we respond to different events
	if(store){
		switch(onEvent){
			case 'onpost':
				store.onNew(result); // call onNew for the store;
				break;
			case 'ondelete':
				store.onDelete(target);
				break;
					// put is handled by JsonReferencing
					//TODO: we may want to bring the JsonReferencing capability into here...
					// that is really tricky though because JsonReferencing handles sub object,
					// it would be expensive to do full object graph searches from here
		}
	}
};
