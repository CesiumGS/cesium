dojo.provide("dojox.xmpp.PresenceService");

dojox.xmpp.presence = {
	UPDATE: 201,
	SUBSCRIPTION_REQUEST: 202,
//	SUBSCRIPTION_REQUEST_PENDING: 203,
	/* used when 'ask' attribute is absent on a roster item */
	SUBSCRIPTION_SUBSTATUS_NONE: 204,

	SUBSCRIPTION_NONE: 'none',
	SUBSCRIPTION_FROM: 'from',
	SUBSCRIPTION_TO: 'to',
	SUBSCRIPTION_BOTH: 'both',
	SUBSCRIPTION_REQUEST_PENDING: 'pending',

	STATUS_ONLINE: 'online',
	STATUS_AWAY: 'away',
	STATUS_CHAT: 'chat',
	STATUS_DND: 'dnd',
	STATUS_EXTENDED_AWAY: 'xa',
	STATUS_OFFLINE: 'offline',
	
	STATUS_INVISIBLE: 'invisible'
}

dojo.declare("dojox.xmpp.PresenceService", null, {
	constructor: function(xmppService){
		this.session= xmppService;
		this.isInvisible = false;
		this.avatarHash = null;
		this.presence = null;
		this.restrictedContactjids = {};
	},

	publish: function(presence){
		////console.log("Presence::publish() ", presence);
		this.presence  = presence;
		this._setPresence();
	},
	
	/**
	<presence from='juliet@capulet.com/balcony'>
	  <x xmlns='vcard-temp:x:update'>
	    <photo>sha1-hash-of-image</photo>
	  </x>
	</presence>
	
	
	<presence>
	  <x xmlns='vcard-temp:x:update'>
	    <photo/>
	  </x>
	</presence>
	
	*/
	
	sendAvatarHash: function(avatarHash) {
			this.avatarHash = avatarHash;
			this._setPresence();
	},
	
	
	_setPresence: function() {
			var presence = 	this.presence;
			var p = {xmlns: 'jabber:client'};

			if (presence && presence.to){
				p.to = presence.to;
			}

			if (presence.show && presence.show==dojox.xmpp.presence.STATUS_OFFLINE){
				p.type = 'unavailable';
			}

			if (presence.show && presence.show==dojox.xmpp.presence.STATUS_INVISIBLE) {
				this._setInvisible();
				this.isInvisible = true;
				return;
			};

			if(this.isInvisible) {
				//console.log("was invisible, making visible");
				this._setVisible();
			}

			var req = new dojox.string.Builder(dojox.xmpp.util.createElement("presence",p, false));

			if (presence.show && presence.show!=dojox.xmpp.presence.STATUS_OFFLINE  ) {
				req.append(dojox.xmpp.util.createElement("show",{},false));
				req.append(presence.show);
				req.append("</show>");
			}

			if(presence.status) {
				req.append(dojox.xmpp.util.createElement("status",{},false));
				req.append(presence.status);
				req.append("</status>");
			}

			if(this.avatarHash) {
				req.append(dojox.xmpp.util.createElement("x",{xmlns: 'vcard-temp:x:update'},false));
					req.append(dojox.xmpp.util.createElement("photo",{},false));
					req.append(this.avatarHash);
					req.append("</photo>");
				req.append("</x>");
			}


			if (presence.priority && presence.show!=dojox.xmpp.presence.STATUS_OFFLINE){
				if(presence.priority > 127 || presence.priority < -128){
					presence.priority = 5;
				}
				req.append(dojox.xmpp.util.createElement("priority",{},false));
				req.append(presence.priority);
				req.append("</priority>");
			}

			req.append("</presence>");
			this.session.dispatchPacket(req.toString());
	},
	
	/*
	
	<iq from='bilbo@tolkien.lit/shire' type='set' id='inv1'>
	  <query xmlns='jabber:iq:privacy'>
	    <list name='invisible'>
	      <item action='deny' order='1'>
	        <presence-out/>
	      </item>
	    </list>
	  </query>
	</iq>
	
	<iq from='bilbo@tolkien.lit/shire' type='set' id='active1'>
	  <query xmlns='jabber:iq:privacy'>
	    <active name='invisible'/>
	  </query>
	</iq>
	
	Make visible:
	<iq from='bilbo@tolkien.lit/shire' type='set' id='active6'>
	  <query xmlns='jabber:iq:privacy'>
	    <active/>
	  </query>
	</iq>
	
	*/
	
	toggleBlockContact: function(jid) {
		if(!this.restrictedContactjids[jid]) {
			this.restrictedContactjids[jid] = this._createRestrictedJid();
		}
		
		this.restrictedContactjids[jid].blocked = !this.restrictedContactjids[jid].blocked;
		//console.log("setting outbound block for ", jid, this.restrictedContactjids[jid]);
		this._updateRestricted();
		return this.restrictedContactjids;
	},
	
	
	toggleContactInvisiblity: function(jid) {
		if(!this.restrictedContactjids[jid]) {
			this.restrictedContactjids[jid] = this._createRestrictedJid();
		}
		
		this.restrictedContactjids[jid].invisible = !this.restrictedContactjids[jid].invisible;
		//console.log("setting outbound presence for ", jid, this.restrictedContactjids[jid]);
		this._updateRestricted();
		return this.restrictedContactjids;
	},
	
	_createRestrictedJid: function() {
		return {invisible: false, blocked:false};
	},
	
	_updateRestricted: function() {
		
		var props={
			id: this.session.getNextIqId(),
			from: this.session.jid + "/" + this.session.resource,
			type: "set"
		};
		
		var req = new dojox.string.Builder(dojox.xmpp.util.createElement("iq",props,false));
		req.append(dojox.xmpp.util.createElement("query",{xmlns: "jabber:iq:privacy"},false));
		req.append(dojox.xmpp.util.createElement("list",{name: "iwcRestrictedContacts"},false))
		var count = 1;
		for(var jid in this.restrictedContactjids) {
			var item = this.restrictedContactjids[jid];
			//console.log("restricted ", jid, item);
			if(item.blocked || item.invisible) {
				req.append(dojox.xmpp.util.createElement("item",{value:  dojox.xmpp.util.encodeJid(jid), action: "deny", order: count++},false));
				if(item.blocked) {
					req.append(dojox.xmpp.util.createElement("message",{},true));
				}
				if(item.invisible) {
					req.append(dojox.xmpp.util.createElement("presence-out",{},true));
				}
				req.append("</item>");
			} else {
				delete this.restrictedContactjids[jid];
			}
			
		
			
		}
				req.append("</list>");
			req.append("</query>");
		req.append("</iq>");
		//console.log("Restricted list: ", req.toString());
		
			var req2 = new dojox.string.Builder(dojox.xmpp.util.createElement("iq",props,false));
				req2.append(dojox.xmpp.util.createElement("query",{xmlns: "jabber:iq:privacy"},false));
					req2.append(dojox.xmpp.util.createElement("active",{name:"iwcRestrictedContacts"},true));
				req2.append("</query>");
			req2.append("</iq>");
		
				//console.log("Activate list: ", req2.toString());
		
		
		this.session.dispatchPacket(req.toString());
		this.session.dispatchPacket(req2.toString());
	},
	
	_setVisible: function() {
			var props={
				id: this.session.getNextIqId(),
				from: this.session.jid + "/" + this.session.resource,
				type: "set"
			};
			var req = new dojox.string.Builder(dojox.xmpp.util.createElement("iq",props,false));
				req.append(dojox.xmpp.util.createElement("query",{xmlns: "jabber:iq:privacy"},false));
					req.append(dojox.xmpp.util.createElement("active",{},true));
				req.append("</query>");
			req.append("</iq>");
			//console.log(req.toString());
			this.session.dispatchPacket(req.toString());
	},
	
	_setInvisible: function() {
		//console.log("Setting user as invisible");
		var props={
			id: this.session.getNextIqId(),
			from: this.session.jid + "/" + this.session.resource,
			type: "set"
		};
		var req = new dojox.string.Builder(dojox.xmpp.util.createElement("iq",props,false));
			req.append(dojox.xmpp.util.createElement("query",{xmlns: "jabber:iq:privacy"},false));
				req.append(dojox.xmpp.util.createElement("list",{name: "invisible"},false))
					req.append(dojox.xmpp.util.createElement("item",{action: "deny", order: "1"},false))
						req.append(dojox.xmpp.util.createElement("presence-out",{},true));
					req.append("</item>");
				req.append("</list>");
			req.append("</query>");
		req.append("</iq>");
		
		
		props={
			id: this.session.getNextIqId(),
			from: this.session.jid + "/" + this.session.resource,
			type: "set"
		};

		var req2 = new dojox.string.Builder(dojox.xmpp.util.createElement("iq",props,false));
			req2.append(dojox.xmpp.util.createElement("query",{xmlns: "jabber:iq:privacy"},false));
				req2.append(dojox.xmpp.util.createElement("active",{name:"invisible"},true));
			req2.append("</query>");
		req2.append("</iq>");
		//console.log(req.toString());
		//console.log(req2.toString());
		this.session.dispatchPacket(req.toString());
		this.session.dispatchPacket(req2.toString());
	},

	_manageSubscriptions: function(contact, type){
		if (!contact){return;}
		
		if (contact.indexOf('@')==-1){
			contact += '@' + this.session.domain;
		}

		var req = dojox.xmpp.util.createElement("presence",{to:contact,type:type},true);
		this.session.dispatchPacket(req);

	},

	subscribe: function(contact){
		this._manageSubscriptions(contact, "subscribe");
	},

	approveSubscription: function(contact){
		this._manageSubscriptions(contact, "subscribed");
	},

	unsubscribe: function(contact){
		this._manageSubscriptions(contact, "unsubscribe");
	},

	declineSubscription: function(contact){
		this._manageSubscriptions(contact, "unsubscribed");
	},
	
	cancelSubscription: function(contact){
		this._manageSubscriptions(contact, "unsubscribed");
	}

});
