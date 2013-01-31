dojo.provide("dojox.lang.async.topic");

// Source of Deferred for topics

(function(){
	var d = dojo, topic = dojox.lang.async.topic;

	topic.from = function(topic){
		return function(){
			var h, cancel = function(){
					if(h){
						d.unsubscribe(h);
						h = null;
					}
				},
				x = new d.Deferred(cancel);
			h = d.subscribe(topic, function(){
				cancel();
				x.callback(arguments);
			});
			return x;
		};
	};

	topic.failOn = function(topic){
		return function(){
			var h, cancel = function(){
					if(h){
						d.unsubscribe(h);
						h = null;
					}
				},
				x = new d.Deferred(cancel);
			h = d.subscribe(topic, function(evt){
				cancel();
				x.errback(new Error(arguments));
			});
			return x;
		};
	};
})();