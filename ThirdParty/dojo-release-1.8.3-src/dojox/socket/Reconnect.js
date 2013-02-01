dojo.provide("dojox.socket.Reconnect");

dojox.socket.Reconnect = function(socket, options){
	// summary:
	//		Provides auto-reconnection to a websocket after it has been closed
	// socket:
	//		Socket to add reconnection support to.
	// returns:
	//		An object that implements the WebSocket API
	// example:
	//		You can use the Reconnect module:
	//		| dojo.require("dojox.socket");
	//		| dojo.require("dojox.socket.Reconnect");
	//		| var socket = dojox.socket({url:"/comet"});
	//		| // add auto-reconnect support
	//		| socket = dojox.socket.Reconnect(socket);
	options = options || {};
	var reconnectTime = options.reconnectTime || 10000;
	
	var connectHandle = dojo.connect(socket, "onclose", function(event){
		clearTimeout(checkForOpen);
		if(!event.wasClean){
			socket.disconnected(function(){
				dojox.socket.replace(socket, newSocket = socket.reconnect());
			});
		}
	});
	var checkForOpen, newSocket;
	if(!socket.disconnected){
		// add a default impl if it doesn't exist
		socket.disconnected = function(reconnect){
			setTimeout(function(){
				reconnect();
				checkForOpen = setTimeout(function(){
					//reset the backoff
					if(newSocket.readyState < 2){
						reconnectTime = options.reconnectTime || 10000;
					}
				}, 10000);
			}, reconnectTime);
			// backoff each time
			reconnectTime *= options.backoffRate || 2;
		};
	}
	if(!socket.reconnect){
		// add a default impl if it doesn't exist
		socket.reconnect = function(){
			return socket.args ?
				dojox.socket.LongPoll(socket.args) :
				dojox.socket.WebSocket({url: socket.URL || socket.url}); // different cases for different impls
		};
	}
	return socket;
};
