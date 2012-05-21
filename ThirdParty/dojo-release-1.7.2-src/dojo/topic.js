define(["./Evented"], function(Evented){
	// summary:
	//		The export of this module is a pubsub hub
	//		You can also use listen function itself as a pub/sub hub:
	//		| 	topic.subscribe("some/topic", function(event){
	//		|	... do something with event
	//		|	});
	//		|	topic.publish("some/topic", {name:"some event", ...});

	var hub = new Evented;
	return {
		publish: function(topic, event){
			// summary:
			//		Publishes a message to a topic on the pub/sub hub. All arguments after
			// 		the first will be passed to the subscribers, so any number of arguments
			// 		can be provided (not just event).
			// topic: String
			//		The name of the topic to publish to
			// event: Object
			//		An event to distribute to the topic listeners
			return hub.emit.apply(hub, arguments);
		},
		subscribe: function(topic, listener){
			// summary:
			//		Subcribes to a topic on the pub/sub hub
			// topic: String
			//		The topic to subscribe to
			//	listener: Function
			//		A function to call when a message is published to the given topic
			return hub.on.apply(hub, arguments);
		}
	}
});
