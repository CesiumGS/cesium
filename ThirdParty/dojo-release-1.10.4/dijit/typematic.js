define([
	"dojo/_base/array", // array.forEach
	"dojo/_base/connect", // connect._keyPress
	"dojo/_base/lang", // lang.mixin, lang.hitch
	"dojo/on",
	"dojo/sniff", // has("ie")
	"./main"        // setting dijit.typematic global
], function(array, connect, lang, on, has, dijit){

	// module:
	//		dijit/typematic

	var typematic = (dijit.typematic = {
		// summary:
		//		These functions are used to repetitively call a user specified callback
		//		method when a specific key or mouse click over a specific DOM node is
		//		held down for a specific amount of time.
		//		Only 1 such event is allowed to occur on the browser page at 1 time.

		_fireEventAndReload: function(){
			this._timer = null;
			this._callback(++this._count, this._node, this._evt);

			// Schedule next event, timer is at most minDelay (default 10ms) to avoid
			// browser overload (particularly avoiding starving DOH robot so it never gets to send a mouseup)
			this._currentTimeout = Math.max(
				this._currentTimeout < 0 ? this._initialDelay :
					(this._subsequentDelay > 1 ? this._subsequentDelay : Math.round(this._currentTimeout * this._subsequentDelay)),
				this._minDelay);
			this._timer = setTimeout(lang.hitch(this, "_fireEventAndReload"), this._currentTimeout);
		},

		trigger: function(/*Event*/ evt, /*Object*/ _this, /*DOMNode*/ node, /*Function*/ callback, /*Object*/ obj, /*Number?*/ subsequentDelay, /*Number?*/ initialDelay, /*Number?*/ minDelay){
			// summary:
			//		Start a timed, repeating callback sequence.
			//		If already started, the function call is ignored.
			//		This method is not normally called by the user but can be
			//		when the normal listener code is insufficient.
			// evt:
			//		key or mouse event object to pass to the user callback
			// _this:
			//		pointer to the user's widget space.
			// node:
			//		the DOM node object to pass the the callback function
			// callback:
			//		function to call until the sequence is stopped called with 3 parameters:
			// count:
			//		integer representing number of repeated calls (0..n) with -1 indicating the iteration has stopped
			// node:
			//		the DOM node object passed in
			// evt:
			//		key or mouse event object
			// obj:
			//		user space object used to uniquely identify each typematic sequence
			// subsequentDelay:
			//		if > 1, the number of milliseconds until the 3->n events occur
			//		or else the fractional time multiplier for the next event's delay, default=0.9
			// initialDelay:
			//		the number of milliseconds until the 2nd event occurs, default=500ms
			// minDelay:
			//		the maximum delay in milliseconds for event to fire, default=10ms
			if(obj != this._obj){
				this.stop();
				this._initialDelay = initialDelay || 500;
				this._subsequentDelay = subsequentDelay || 0.90;
				this._minDelay = minDelay || 10;
				this._obj = obj;
				this._node = node;
				this._currentTimeout = -1;
				this._count = -1;
				this._callback = lang.hitch(_this, callback);
				this._evt = { faux: true };
				for(var attr in evt){
					if(attr != "layerX" && attr != "layerY"){ // prevent WebKit warnings
						var v = evt[attr];
						if(typeof v != "function" && typeof v != "undefined"){
							this._evt[attr] = v
						}
					}
				}
				this._fireEventAndReload();
			}
		},

		stop: function(){
			// summary:
			//		Stop an ongoing timed, repeating callback sequence.
			if(this._timer){
				clearTimeout(this._timer);
				this._timer = null;
			}
			if(this._obj){
				this._callback(-1, this._node, this._evt);
				this._obj = null;
			}
		},

		addKeyListener: function(/*DOMNode*/ node, /*Object*/ keyObject, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
			// summary:
			//		Start listening for a specific typematic key.
			//		See also the trigger method for other parameters.
			// keyObject:
			//		an object defining the key to listen for:
			//
			//		- keyCode: the keyCode (number) to listen for, used for non-printable keys
			//		- charCode: the charCode (number) to listen for, used for printable keys
			//		- charOrCode: deprecated, use keyCode or charCode
			//		- ctrlKey: desired ctrl key state to initiate the callback sequence:
			//			- pressed (true)
			//			- released (false)
			//			- either (unspecified)
			//		- altKey: same as ctrlKey but for the alt key
			//		- shiftKey: same as ctrlKey but for the shift key
			// returns:
			//		a connection handle

			// Setup keydown or keypress listener depending on whether keyCode or charCode was specified.
			// If charOrCode is specified use deprecated connect._keypress synthetic event (remove for 2.0)
			var type = "keyCode" in keyObject ? "keydown" : "charCode" in keyObject ? "keypress" : connect._keypress,
				attr = "keyCode" in keyObject ? "keyCode" : "charCode" in keyObject ? "charCode" : "charOrCode";

			var handles = [
				on(node, type, lang.hitch(this, function(evt){
					if(evt[attr] == keyObject[attr] &&
						(keyObject.ctrlKey === undefined || keyObject.ctrlKey == evt.ctrlKey) &&
						(keyObject.altKey === undefined || keyObject.altKey == evt.altKey) &&
						(keyObject.metaKey === undefined || keyObject.metaKey == (evt.metaKey || false)) && // IE doesn't even set metaKey
						(keyObject.shiftKey === undefined || keyObject.shiftKey == evt.shiftKey)){
						evt.stopPropagation();
						evt.preventDefault();
						typematic.trigger(evt, _this, node, callback, keyObject, subsequentDelay, initialDelay, minDelay);
					}else if(typematic._obj == keyObject){
						typematic.stop();
					}
				})),
				on(node, "keyup", lang.hitch(this, function(){
					if(typematic._obj == keyObject){
						typematic.stop();
					}
				}))
			];
			return { remove: function(){
				array.forEach(handles, function(h){
					h.remove();
				});
			} };
		},

		addMouseListener: function(/*DOMNode*/ node, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
			// summary:
			//		Start listening for a typematic mouse click.
			//		See the trigger method for other parameters.
			// returns:
			//		a connection handle
			var handles = [
				on(node, "mousedown", lang.hitch(this, function(evt){
					evt.preventDefault();
					typematic.trigger(evt, _this, node, callback, node, subsequentDelay, initialDelay, minDelay);
				})),
				on(node, "mouseup", lang.hitch(this, function(evt){
					if(this._obj){
						evt.preventDefault();
					}
					typematic.stop();
				})),
				on(node, "mouseout", lang.hitch(this, function(evt){
					if(this._obj){
						evt.preventDefault();
					}
					typematic.stop();
				})),
				on(node, "dblclick", lang.hitch(this, function(evt){
					evt.preventDefault();
					if(has("ie") < 9){
						typematic.trigger(evt, _this, node, callback, node, subsequentDelay, initialDelay, minDelay);
						setTimeout(lang.hitch(this, typematic.stop), 50);
					}
				}))
			];
			return { remove: function(){
				array.forEach(handles, function(h){
					h.remove();
				});
			} };
		},

		addListener: function(/*Node*/ mouseNode, /*Node*/ keyNode, /*Object*/ keyObject, /*Object*/ _this, /*Function*/ callback, /*Number*/ subsequentDelay, /*Number*/ initialDelay, /*Number?*/ minDelay){
			// summary:
			//		Start listening for a specific typematic key and mouseclick.
			//		This is a thin wrapper to addKeyListener and addMouseListener.
			//		See the addMouseListener and addKeyListener methods for other parameters.
			// mouseNode:
			//		the DOM node object to listen on for mouse events.
			// keyNode:
			//		the DOM node object to listen on for key events.
			// returns:
			//		a connection handle
			var handles = [
				this.addKeyListener(keyNode, keyObject, _this, callback, subsequentDelay, initialDelay, minDelay),
				this.addMouseListener(mouseNode, _this, callback, subsequentDelay, initialDelay, minDelay)
			];
			return { remove: function(){
				array.forEach(handles, function(h){
					h.remove();
				});
			} };
		}
	});

	return typematic;
});
