dojo.provide("dojox.lang.async.timeout");

// Source of Deferred for timeouts

(function(){
	var d = dojo, timeout = dojox.lang.async.timeout;

	timeout.from = function(ms){
		return function(){
			var h, cancel = function(){
					if(h){
						clearTimeout(h);
						h = null;
					}
				},
				x = new d.Deferred(cancel);
			h = setTimeout(function(){
				cancel();
				x.callback(ms);
			}, ms);
			return x;
		};
	};

	timeout.failOn = function(ms){
		return function(){
			var h, cancel = function(){
					if(h){
						clearTimeout(h);
						h = null;
					}
				},
				x = new d.Deferred(cancel);
			h = setTimeout(function(){
				cancel();
				x.errback(ms);
			}, ms);
			return x;
		};
	};
})();