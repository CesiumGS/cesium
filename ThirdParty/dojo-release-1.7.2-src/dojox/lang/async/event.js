dojo.provide("dojox.lang.async.event");

// Source of Deferred for events

(function(){
	var d = dojo, event = dojox.lang.async.event;

	event.from = function(src, name){
		return function(){
			var h, cancel = function(){
					if(h){
						d.disconnect(h);
						h = null;
					}
				},
				x = new d.Deferred(cancel);
			h = d.connect(src, name, function(evt){
				cancel();
				x.callback(evt);
			});
			return x;
		};
	};

	event.failOn = function(src, name){
		return function(){
			var h, cancel = function(){
					if(h){
						d.disconnect(h);
						h = null;
					}
				},
				x = new d.Deferred(cancel);
			h = d.connect(src, name, function(evt){
				cancel();
				x.errback(new Error(evt));
			});
			return x;
		};
	};
})();
