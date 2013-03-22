dojo.provide("dojox.mobile.app._event");
dojo.experimental("dojox.mobile.app._event.js");

dojo.mixin(dojox.mobile.app, {
	eventMap: {},

	connectFlick: function(target, context, method){
		// summary:
		//		Listens for a flick event on a DOM node.  If the mouse/touch
		//		moves more than 15 pixels in any given direction it is a flick.
		//		The synthetic event fired specifies the direction as:
		//
		//		- ltr - Left to Right
		//		- rtl - Right to Left
		//		- ttb - Top To Bottom
		//		- btt - Bottom To top
		// target: Node
		//		The DOM node to connect to

		var startX;
		var startY;
		var isFlick = false;

		var currentX;
		var currentY;

		var connMove;
		var connUp;

		var direction;

		var time;

		// Listen to to the mousedown/touchstart event
		var connDown = dojo.connect("onmousedown", target, function(event){
			isFlick = false;
			startX = event.targetTouches ? event.targetTouches[0].clientX : event.clientX;
			startY = event.targetTouches ? event.targetTouches[0].clientY : event.clientY;

			time = (new Date()).getTime();

			connMove = dojo.connect(target, "onmousemove", onMove);
			connUp = dojo.connect(target, "onmouseup", onUp);
		});

		// The function that handles the mousemove/touchmove event
		var onMove = function(event){
			dojo.stopEvent(event);

			currentX = event.targetTouches ? event.targetTouches[0].clientX : event.clientX;
			currentY = event.targetTouches ? event.targetTouches[0].clientY : event.clientY;
			if(Math.abs(Math.abs(currentX) - Math.abs(startX)) > 15){
				isFlick = true;

				direction = (currentX > startX) ? "ltr" : "rtl";
			}else if(Math.abs(Math.abs(currentY) - Math.abs(startY)) > 15){
				isFlick = true;

				direction = (currentY > startY) ? "ttb" : "btt";
			}
		};

		var onUp = function(event){
			dojo.stopEvent(event);

			connMove && dojo.disconnect(connMove);
			connUp && dojo.disconnect(connUp);

			if(isFlick){
				var flickEvt = {
					target: target,
					direction: direction,
					duration: (new Date()).getTime() - time
				};
				if(context && method){
					context[method](flickEvt);
				}else{
					method(flickEvt);
				}
			}
		};

	}
});

dojox.mobile.app.isIPhone = (dojo.isSafari
	&& (navigator.userAgent.indexOf("iPhone") > -1 ||
		navigator.userAgent.indexOf("iPod") > -1
	));
dojox.mobile.app.isWebOS = (navigator.userAgent.indexOf("webOS") > -1);
dojox.mobile.app.isAndroid = (navigator.userAgent.toLowerCase().indexOf("android") > -1);

if(dojox.mobile.app.isIPhone || dojox.mobile.app.isAndroid){
	// We are touchable.
	// Override the dojo._connect function to replace mouse events with touch events

	dojox.mobile.app.eventMap = {
		onmousedown: "ontouchstart",
		mousedown: "ontouchstart",
		onmouseup: "ontouchend",
		mouseup: "ontouchend",
		onmousemove: "ontouchmove",
		mousemove: "ontouchmove"
	};

}
dojo._oldConnect = dojo._connect;
dojo._connect = function(obj, event, context, method, dontFix){
	event = dojox.mobile.app.eventMap[event] || event;
	if(event == "flick" || event == "onflick"){
		if(dojo.global["Mojo"]){
			event = Mojo.Event.flick;
		} else{
			return dojox.mobile.app.connectFlick(obj, context, method);
		}
	}

	return dojo._oldConnect(obj, event, context, method, dontFix);
};