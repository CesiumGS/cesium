dojo.provide("dojox.cometd.ack");
dojo.require("dojox.cometd._base");

/*
 * This file provides the dojox cometd ack extension which
 * acknowledges the messages received in /meta/connect responses.
 * Each meta/connect is sent with the id of the last successful meta/connect
 * received.  The server uses this information to manage a queue of unacknowleged
 * messages.
 *
 * To use, add dojo.require("dojox.cometd.ack"); and if the handshake will be sent
 * with ext:{ack:true}.  If the server supports the same extension, then the
 * mechanism will be initialized.  The dojox.cometd.ackEnabled field may also be
 * used to optionally enable/disable the extension before init of cometd.
 *
 */
dojox.cometd._ack = new function(){
	var supportAcks = false;
	var lastAck = -1;
	
	this._in = function(msg){
		if (msg.channel == "/meta/handshake") {
			supportAcks = msg.ext && msg.ext.ack;
		} else if (supportAcks && msg.channel == "/meta/connect" && msg.ext && msg.ext.ack && msg.successful) {
			var ackId = parseInt(msg.ext.ack);
			lastAck = ackId;
		}
		return msg;
	}
	
	this._out = function(msg){
	
		if (msg.channel == "/meta/handshake") {
			if (!msg.ext)
				msg.ext = {};
			msg.ext.ack = dojox.cometd.ackEnabled;
			lastAck = -1;
		}
		if (supportAcks && msg.channel == "/meta/connect") {
			if (!msg.ext)
				msg.ext = {};
			msg.ext.ack = lastAck;
		}
		return msg;
	}
};

dojox.cometd._extendInList.push(dojo.hitch(dojox.cometd._ack, "_in"));
dojox.cometd._extendOutList.push(dojo.hitch(dojox.cometd._ack, "_out"));
dojox.cometd.ackEnabled = true;
