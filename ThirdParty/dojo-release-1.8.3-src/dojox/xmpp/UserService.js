dojo.provide("dojox.xmpp.UserService");

dojo.declare("dojox.xmpp.UserService", null, {
	constructor: function(xmppService){
		this.session= xmppService;
	},

	getPersonalProfile: function(){
		var req={
			id: this.session.getNextIqId(),
			type: 'get'
		}
		var request = new dojox.string.Builder(dojox.xmpp.util.createElement("iq",req,false));
		request.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:private"},false));
		request.append(dojox.xmpp.util.createElement("sunmsgr",{xmlsns:'sun:xmpp:properties'},true));
		request.append("</query></iq>");

		var def = this.session.dispatchPacket(request.toString(),"iq",req.id);
		def.addCallback(this, "_onGetPersonalProfile");
	},

	setPersonalProfile: function(props){
		var req={
			id: this.session.getNextIqId(),
			type: 'set'
		}
		
		var request = new dojox.string.Builder(dojox.xmpp.util.createElement("iq",req,false));
		request.append(dojox.xmpp.util.createElement("query",{xmlns:"jabber:iq:private"},false));
		request.append(dojox.xmpp.util.createElement("sunmsgr",{xmlsns:'sun:xmpp:properties'},false));

		for (var key in props){
			request.append(dojox.xmpp.util.createElement("property",{name: key},false));
			request.append(dojox.xmpp.util.createElement("value",{},false));
			request.append(props[key]);
			request.append("</value></props>");
		}
		
		request.append("</sunmsgr></query></iq>");

		var def = this.session.dispatchPacket(request.toString(), "iq", req.id);
		def.addCallback(this, "_onSetPersonalProfile");
	},

	_onSetPersonalProfile: function(response){
		if(response.getAttribute('type')=='result'){
			this.onSetPersonalProfile(response.getAttribute('id'));
		}else if(response.getAttribute('type')=='error'){
			var err = this.session.processXmppError(response);
			this.onSetPersonalProfileFailure(err);
		}
	},

	onSetPersonalProfile: function(id){},
	onSetPersonalProfileFailure: function(err){},

	_onGetPersonalProfile: function(profile){
		if (profile.getAttribute('type')=='result'){
			var props = {};

			if (profile.hasChildNodes()){
				var queryNode = profile.firstChild;
				if ((queryNode.nodeName=="query")&&(queryNode.getAttribute('xmlns')=='jabber:iq:private')){
					var sunNode = queryNode.firstChild;
					if ((sunNode.nodeName=='query')&&(sunNode.getAttributes('xmlns')=='sun:xmpp:properties')){
						for (var i=0; i<sunNode.childNodes.length;i++){
							var n = sunNode.childNodes[i];
							if(n.nodeName == 'property'){
								var name = n.getAttribute('name');
								var val = n.firstChild || "";
								props[name]=val;
							}
						}
					}
				}
				this.onGetPersonalProfile(props);
			}
		}else if (profile.getAttribute('type')=='error'){
			var err = this.session.processXmppError(profile);
			this.onGetPersonalProfileFailure(err);
		}

		return profile;
	},

	onGetPersonalProfile: function(profile){
		//console.log("UserService::onGetPersonalProfile() ", profile);
	},

	onGetPersonalProfileFailure: function(err){
		//console.log("UserService::onGetPersonalProfileFailure() ", err);
	}
});
