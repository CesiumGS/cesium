define(['../Evented', '../_base/lang', './util'], function(Evented, lang, util){
	// module:
	//		dojo/request/notify
	// summary:
	//		Global notification API for dojo/request. Notifications will
	//		only be emitted if this module is required.
	//
	//		| require('dojo/request', 'dojo/request/notify',
	//		|     function(request, notify){
	//		|         notify('load', function(response){
	//		|             if(response.url === 'someUrl.html'){
	//		|                 console.log('Loaded!');
	//		|             }
	//		|         });
	//		|         request.get('someUrl.html');
	//		|     }
	//		| );

	var pubCount = 0,
		slice = [].slice;

	var hub = lang.mixin(new Evented, {
		onsend: function(data){
			if(!pubCount){
				this.emit('start');
			}
			pubCount++;
		},
		_onload: function(data){
			this.emit('done', data);
		},
		_onerror: function(data){
			this.emit('done', data);
		},
		_ondone: function(data){
			if(--pubCount <= 0){
				pubCount = 0;
				this.emit('stop');
			}
		},
		emit: function(type, event){
			var result = Evented.prototype.emit.apply(this, arguments);

			// After all event handlers have run, run _on* handler
			if(this['_on' + type]){
				this['_on' + type].apply(this, slice.call(arguments, 1));
			}
			return result;
		}
	});

	function notify(type, listener){
		// summary:
		//		Register a listener to be notified when an event
		//		in dojo/request happens.
		// type: String?
		//		The event to listen for. Events emitted: "start", "send",
		//		"load", "error", "done", "stop".
		// listener: Function?
		//		A callback to be run when an event happens.
		// returns:
		//		A signal object that can be used to cancel the listener.
		//		If remove() is called on this signal object, it will
		//		stop the listener from being executed.
		return hub.on(type, listener);
	}
	notify.emit = function(type, event, cancel){
		return hub.emit(type, event, cancel);
	};

	// Attach notify to dojo/request/util to avoid
	// try{ require('./notify'); }catch(e){}
	return util.notify = notify;
});
