dojo.provide("dojox.xmpp.ChatService");

dojox.xmpp.chat = {
	CHAT_STATE_NS: 'http://jabber.org/protocol/chatstates',

	ACTIVE_STATE: 'active',
	COMPOSING_STATE: 'composing',
	INACTIVE_STATE: 'inactive',
	PAUSED_STATE: 'paused',
	GONE_STATE: 'gone'
}

dojo.declare("dojox.xmpp.ChatService", null, {
	state: "",

	constructor: function(){
		this.state="";
		this.chatid = Math.round(Math.random() * 1000000000000000);
	},
	
	recieveMessage: function(msg,initial){
		if (msg&&!initial){
			this.onNewMessage(msg);
		}
	},

	setSession: function(session){
		this.session = session;
	},

	setState: function(state){
		if (this.state != state){
			this.state = state;
		}
	},
	
	invite: function(contact){
		if (this.uid){return;}


		if(!contact || contact==''){
			throw new Error("ChatService::invite() contact is NULL");
		}

		this.uid = contact;

		var req = {
			xmlns: "jabber:client",
			to: this.uid,
			from: this.session.jid + "/" + this.session.resource,
			type: "chat"
		}
		var request = new dojox.string.Builder(dojox.xmpp.util.createElement("message", req, false));
		request.append(dojox.xmpp.util.createElement("thread",{},false));
		request.append(this.chatid);
		request.append("</thread>");
		request.append(dojox.xmpp.util.createElement("active",{xmlns: dojox.xmpp.chat.CHAT_STATE_NS},true));
		request.append("</message>");
		this.session.dispatchPacket(request.toString());

		this.onInvite(contact);
		this.setState(dojox.xmpp.chat.CHAT_STATE_NS);
	},


	sendMessage: function(msg){
		if (!this.uid){
			//console.log("ChatService::sendMessage() -  Contact Id is null, need to invite to chat");
			return;
		}

		if ((!msg.body || msg.body=="") && !msg.xhtml){return;}

		var req = {
			xmlns: "jabber:client",
			to: this.uid,
			from: this.session.jid + "/" + this.session.resource,
			type: "chat"
		}

		var message = new dojox.string.Builder(dojox.xmpp.util.createElement("message",req,false));
		var html = dojox.xmpp.util.createElement("html", { "xmlns":dojox.xmpp.xmpp.XHTML_IM_NS},false)

		var bodyTag = dojox.xmpp.util.createElement("body", {"xml:lang":this.session.lang, "xmlns":dojox.xmpp.xmpp.XHTML_BODY_NS}, false) + msg.body + "</body>";
		var bodyPlainTag = dojox.xmpp.util.createElement("body", {}, false) + dojox.xmpp.util.stripHtml(msg.body) + "</body>";
/*
		if (msg.xhtml){
			if (msg.xhtml.getAttribute('xmlns') != dojox.xmpp.xmpp.XHTML_IM_NS){
				//console.log("ChatService::sendMessage() - Cannot use this xhtml without the propper xmlns");
			}else{
				//FIXME do this in some portable way
				//console.log("ChatService::sendMessage() - FIXME Serialize XHTML to string: ", msg.xhtml.toString());
			}
		}
*/
		if (message.subject && message.subject != ""){
			message.append(dojox.xmpp.util.createElement("subject",{},false));
			message.append(message.subject);
			message.append("</subject>");
		}
		message.append(bodyPlainTag);
		message.append(html);
		message.append(bodyTag);
		message.append("</html>");
		message.append(dojox.xmpp.util.createElement("thread", {}, false));
		message.append(this.chatid);
		message.append("</thread>");

		if (this.useChatStates){
			message.append(dojox.xmpp.util.createElement("active",{xmlns: dojox.xmpp.chat.CHAT_STATE_NS},true));
		}
		message.append("</message>");
	
		this.session.dispatchPacket(message.toString());
	},

	sendChatState: function(state){
		if (!this.useChatState || this.firstMessage){return;}
		if (state==this._currentState){return;}
		
		var req={
			xmlns: "jabber:client",
			to: this.uid,
			from: this.session.jid + "/" + this.session.resource,
			type: "chat"
		}

		var request = new dojox.string.Builder(dojox.xmpp.util.createElement("message",req,false));
		request.append(dojox.xmpp.util.createElement(state, {xmlns: dojox.xmpp.chat.CHAT_STATE_NS},true));
		this._currentState = state;
		request.append("<thread>");
		request.append(this.chatid);
		request.append("</thread></message>");
		
		this.session.dispatchPacket(request.toString());
	},

	//EVENTS
	onNewMessage: function(msg){},
	onInvite: function(contact){}
});
