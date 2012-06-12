dojo.provide("dojox.cometd.timesync");
dojo.require("dojox.cometd._base");

/**
 * this file provides the time synchronization extension to cometd.
 * Timesync allows the client and server to exchange time information on every
 * handshake and connect message so that the client may calculate an approximate
 * offset from it's own clock epoch to that of the server.
 *
 * With each handshake or connect, the extension sends timestamps within the
 * ext field like: <code>{ext:{timesync:{tc:12345567890,l:23,o:4567},...},...}</code>
 * where:<ul>
 *  <li>tc is the client timestamp in ms since 1970 of when the message was sent.
 *  <li>l is the network lag that the client has calculated.
 *  <li>o is the clock offset that the client has calculated.
 * </ul>
 * The accuracy of the offset and lag may be calculated with tc-now-l-o,
 * which should be zero if the calculated offset and lag are perfectly
 * accurate.
 * <p>
 * A cometd server that supports timesync, should respond only if the
 * measured accuracy value is greater than accuracy target. The response
 * will be an ext field like: <code>{ext:{timesync:{tc:12345567890,ts:1234567900,p:123,a:3},...},...}</code>
 * where:<ul>
 *  <li>tc is the client timestamp of when the message was sent,
 *  <li>ts is the server timestamp of when the message was received
 *  <li>p is the poll duration in ms - ie the time the server took before sending the response.
 *  <li>a is the measured accuracy of the calculated offset and lag sent by the client
 * </ul>
 *
 * On receipt of the response, the client is able to use current time to determine
 * the total trip time, from which p is subtracted to determine an approximate
 * two way network traversal time. The measured accuracy is used to adjust the assumption
 * that the network is symmetric for traversal time, so: <ul>
 * <li>lag = (now-tc-p)/2-a
 * <li>offset = ts-tc-lag
 * </ul>
 *
 * In order to smooth over any transient fluctuations, the extension keeps a sliding
 * average of the offsets received. By default this is over 10 messages, but this can
 * be changed with the dojox.cometd.timesync._window element.
 */
dojox.cometd.timesync = new function(){
	this._window = 10;		// The window size for the sliding average of offset samples.
	this._lags = [];		// The samples used to calculate the average lag.
	this._offsets = [];		// The samples used to calculate the average offset.
	this.lag=0;				// The calculated network lag from client to server
	this.offset = 0;		// The offset in ms between the clients clock and the servers clock.
	this.samples = 0; 		// The number of samples used to calculate the offset. If 0, the offset is not valid.
	
	this.getServerTime = function(){ // return: long
		// Summary:
		//	Calculate the current time on the server
		//
		return new Date().getTime()+this.offset;
	}
	
	this.getServerDate = function(){ // return: Date
		// Summary:
		//	Calculate the current time on the server
		//
		return new Date(this.getServerTime());
	}
	
	this.setTimeout = function(/*function*/call, /*long|Date*/atTimeOrDate){
		// Summary:
		//	Set a timeout function relative to server time
		// call:
		//	the function to call when the timeout occurs
		// atTimeOrTime:
		//	a long timestamp or a Date representing the server time at
		//	which the timeout should occur.
		
		var ts = (atTimeOrDate instanceof Date) ? atTimeOrDate.getTime() : (0 + atTimeOrDate);
		var tc = ts - this.offset;
		var interval = tc - new Date().getTime();
		if(interval <= 0){
			interval = 1;
		}
		return setTimeout(call,interval);
	}

	this._in = function(/*Object*/msg){
		// Summary:
		//	Handle incoming messages for the timesync extension.
		// description:
		//	Look for ext:{timesync:{}} field and calculate offset if present.
		// msg:
		//	The incoming bayeux message
		
		var channel = msg.channel;
		if(channel && channel.indexOf('/meta/') == 0){
			if(msg.ext && msg.ext.timesync){
				var sync = msg.ext.timesync;
				var now = new Date().getTime();
				var l=(now-sync.tc-sync.p)/2-sync.a;
				var o=sync.ts-sync.tc-l;
				
				this._lags.push(l);
				this._offsets.push(o);
				if(this._offsets.length > this._window){
					this._offsets.shift();
					this._lags.shift();
				}
				this.samples++;
				l=0;
				o=0;
				for(var i in this._offsets){
					l+=this._lags[i];
					o+=this._offsets[i];
				}
				this.offset = parseInt((o / this._offsets.length).toFixed());
				this.lag = parseInt((l / this._lags.length).toFixed());
				
			}
		}
		return msg;
	}

	this._out = function(msg){
		// Summary:
		//	Handle outgoing messages for the timesync extension.
		// description:
		//	Look for handshake and connect messages and add the ext:{timesync:{}} fields
		// msg:
		//	The outgoing bayeux message
		
		var channel = msg.channel;
		if(channel && channel.indexOf('/meta/') == 0){
			var now = new Date().getTime();
			if(!msg.ext){
				msg.ext = {};
			}
			msg.ext.timesync = {tc:now,l:this.lag,o:this.offset};
		}
		return msg;
	}
};

dojox.cometd._extendInList.push(dojo.hitch(dojox.cometd.timesync, "_in"));
dojox.cometd._extendOutList.push(dojo.hitch(dojox.cometd.timesync, "_out"));
