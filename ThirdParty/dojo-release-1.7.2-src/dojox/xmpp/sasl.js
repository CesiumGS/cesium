dojo.provide("dojox.xmpp.sasl");
dojo.require("dojox.xmpp.util");

dojo.require("dojo.AdapterRegistry");
dojo.require("dojox.encoding.digests.MD5");

dojox.xmpp.sasl.saslNS = "urn:ietf:params:xml:ns:xmpp-sasl";

dojo.declare("dojox.xmpp.sasl._Base", null, {
	mechanism: null,
	closeAuthTag: true,

	constructor: function(session){
		this.session = session;

		this.startAuth();
	},
	startAuth: function(){
		var auth = new dojox.string.Builder(dojox.xmpp.util.createElement("auth", {
			xmlns: dojox.xmpp.sasl.saslNS,
			mechanism: this.mechanism
		}, this.closeAuthTag));
		this.appendToAuth(auth);
		this.session.dispatchPacket(auth.toString());
	},
	appendToAuth: function(auth){},
	onChallenge: function(msg){
		if(!this.first_challenge){
			this.first_challenge = true;
			this.onFirstChallenge(msg);
		}else{
			this.onSecondChallenge(msg);
		}
	},
	onFirstChallenge: function(){},
	onSecondChallenge: function(){},
	onSuccess: function(){
		this.session.sendRestart();
	}
});

dojo.declare("dojox.xmpp.sasl.SunWebClientAuth", dojox.xmpp.sasl._Base, {
	mechanism: "SUN-COMMS-CLIENT-PROXY-AUTH"
});

dojo.declare("dojox.xmpp.sasl.Plain", dojox.xmpp.sasl._Base, {
	mechanism: "PLAIN",
	closeAuthTag: false,

	appendToAuth: function(auth){
		var id = this.session.jid;
		var index = this.session.jid.indexOf('@');
		if (index != -1){
			id = this.session.jid.substring(0, index);
		}
		var token = this.session.jid + '\u0000' + id + '\u0000' + this.session.password;
		token = dojox.xmpp.util.Base64.encode(token);

		auth.append(token);
		auth.append("</auth>");

		delete this.session.password;
	}
});

dojo.declare("dojox.xmpp.sasl.DigestMD5", dojox.xmpp.sasl._Base, {
	mechanism: "DIGEST-MD5",

	onFirstChallenge: function(msg){
		var dxed = dojox.encoding.digests;
		var dxedo = dojox.encoding.digests.outputTypes;
		var HEX = function(n){
			return dxed.MD5(n, dxedo.Hex);
		};
		var H = function(s){
			return dxed.MD5(s, dxedo.String);
		};

		var ch_str = dojox.xmpp.util.Base64.decode(msg.firstChild.nodeValue);
		var ch = {
			realm: "",
			nonce: "",
			qop: "auth",
			maxbuf: 65536
		};
		ch_str.replace(/([a-z]+)=([^,]+)/g, function(t,k,v){
			v = v.replace(/^"(.+)"$/, "$1");
			ch[k] = v;
		});

		var A2_append = '';
		switch(ch.qop){
			case 'auth-int':
			case 'auth-conf':
				A2_append = ':00000000000000000000000000000000';
			case 'auth':
				break;
			default:
				return false;
		}
		var cnonce = dxed.MD5(Math.random() * 1234567890, dxedo.Hex);
		var digest_uri = 'xmpp/' + this.session.domain;

		var username = this.session.jid;
		var index = this.session.jid.indexOf('@');
		if (index != -1){
			username = this.session.jid.substring(0, index);
		}
		username = dojox.xmpp.util.encodeJid(username);

		var A1 = new dojox.string.Builder();
		A1.append(H(username + ':' + ch.realm + ':' + this.session.password),
			':', ch.nonce + ':' + cnonce);
		delete this.session.password;
		var A2_rspauth = ':' + digest_uri + A2_append;
		var A2 = 'AUTHENTICATE' + A2_rspauth;

		var response_value = new dojox.string.Builder();
		response_value.append(HEX(A1.toString()), ':', ch.nonce, ':00000001:', cnonce, ':',
			ch.qop, ':')

		var ret = new dojox.string.Builder();
		ret.append('username="', username, '",',
			'realm="', ch.realm, '",',
			'nonce=', ch.nonce, ',',
			'cnonce="', cnonce, '",',
			'nc="00000001",qop="', ch.qop, '",digest-uri="', digest_uri, '",',
			'response="', HEX(response_value.toString() + HEX(A2)), '",charset="utf-8"');

		var response = new dojox.string.Builder(dojox.xmpp.util.createElement("response", {
			xmlns: dojox.xmpp.xmpp.SASL_NS
		}, false));
		response.append(dojox.xmpp.util.Base64.encode(ret.toString()));
		response.append('</response>');

		this.rspauth = HEX(response_value.toString() + HEX(A2_rspauth));

		this.session.dispatchPacket(response.toString());
	},

	onSecondChallenge: function(msg){
		var ch_str = dojox.xmpp.util.Base64.decode(msg.firstChild.nodeValue);

		if(this.rspauth == ch_str.substring(8)){
			var response = new dojox.string.Builder(dojox.xmpp.util.createElement("response", {
				xmlns: dojox.xmpp.xmpp.SASL_NS
			}, true));
			this.session.dispatchPacket(response.toString());
		}else{
			//FIXME
		}
	}
});

dojox.xmpp.sasl.registry = new dojo.AdapterRegistry();
dojox.xmpp.sasl.registry.register(
	'SUN-COMMS-CLIENT-PROXY-AUTH',
	function(mechanism){
		return mechanism == 'SUN-COMMS-CLIENT-PROXY-AUTH';
	},
	function(mechanism, session){
		return new dojox.xmpp.sasl.SunWebClientAuth(session);
	}
);
dojox.xmpp.sasl.registry.register(
	'DIGEST-MD5',
	function(mechanism){
		return mechanism == 'DIGEST-MD5';
	},
	function(mechanism, session){
		return new dojox.xmpp.sasl.DigestMD5(session);
	}
);
dojox.xmpp.sasl.registry.register(
	'PLAIN',
	function(mechanism){
		return mechanism == 'PLAIN';
	},
	function(mechanism, session){
		return new dojox.xmpp.sasl.Plain(session);
	}
);
