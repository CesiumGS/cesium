dojo.provide("dojox.xmpp.RosterService");

dojox.xmpp.roster = {
	ADDED: 101,
	CHANGED: 102,
	REMOVED: 103
};

dojo.declare("dojox.xmpp.RosterService", null, {
	constructor: function(xmppSession){
		this.session = xmppSession;
	},

	addRosterItem: function(jid, name, groups){
		if(!jid){
			throw new Error ("Roster::addRosterItem() - User ID is null");
		}
		var iqId = this.session.getNextIqId();
		var req = {
			id: iqId,
			from: this.session.jid + "/" + this.session.resource,
			type: "set"
		}

		var request = new dojox.string.Builder(dojox.xmpp.util.createElement("iq", req, false));
		request.append(dojox.xmpp.util.createElement("query",{xmlns: 'jabber:iq:roster'},false));
		jid = dojox.xmpp.util.encodeJid(jid);
		if (jid.indexOf('@')== -1){
			jid = jid + '@' + this.session.domain;
		}


		request.append(dojox.xmpp.util.createElement("item",{jid:jid,name:dojox.xmpp.util.xmlEncode(name)},false));

		if (groups){
			for (var i=0; i<groups.length; i++){
				request.append("<group>");
				request.append(groups[i]);
				request.append("</group>");
			}
		}
	
		request.append("</item></query></iq>");
		//console.log(request.toString());

		var def = this.session.dispatchPacket(request.toString(),"iq",req.id);
		def.addCallback(this, "verifyRoster");
		return def;
	},

	updateRosterItem: function(jid, name, groups){
		if (jid.indexOf('@') == -1){
			jid += jid + '@' + this.session.domain;
		}

		var req = {
			id: this.session.getNextIqId(),
			from: this.session.jid + "/" + this.session.resource,
			type: "set"
		}

		var request = new dojox.string.Builder(dojox.xmpp.util.createElement("iq", req, false));
		request.append(dojox.xmpp.util.createElement("query",{xmlns: 'jabber:iq:roster'},false));

		var i = this.session.getRosterIndex(jid);

		//item not found
		if (i==-1){return;}
		var item = {
			jid:jid
		};
		if(name){
			item.name = name;
		} else if(this.session.roster[i].name){
			item.name = this.session.roster[i].name;
		}
		if(item.name) {
			item.name = dojox.xmpp.util.xmlEncode(item.name);
		}
		request.append(dojox.xmpp.util.createElement("item",item,false));
		
		var newGroups = groups ? groups : this.session.roster[i].groups;
		
		if (newGroups){
			for (var x=0;x<newGroups.length;x++){
				request.append("<group>");
				request.append(newGroups[x]);
				request.append("</group>");
			}
		}
		
		request.append("</item></query></iq>");
		
		var def = this.session.dispatchPacket(request.toString(),"iq",req.id);
		def.addCallback(this, "verifyRoster");
		return def;
	},

	verifyRoster: function(res){
		if (res.getAttribute('type')=='result'){
			//this.onAddRosterItem(res.getAttribute('id'));
		}else{
			var err=this.session.processXmppError(res);
			this.onAddRosterItemFailed(err);
		}
		return res;
	},

	addRosterItemToGroup: function(jid, group){
		if (!jid) throw new Error("Roster::addRosterItemToGroup() JID is null or undefined");
		if (!group) throw new Error("Roster::addRosterItemToGroup() group is null or undefined");

		var index = this.session.getRosterIndex(jid);
		if (index==-1){return;}

		var item = this.session.roster[index];
		var tgroups = [];

		var found = false;

		for (var i=0; ((item<item.groups.length) && (!found)); i++){
			if (item.groups[i]!=group){continue;}
			found=true;
		}
	
		if(!found){
			return this.updateRosterItem(jid, item.name, item.groups.concat(group),index);
		}
	
		return dojox.xmpp.xmpp.INVALID_ID;
	},
	
	removeRosterGroup: function(group) {
		var roster = this.session.roster;
		for(var i=0;i<roster.length;i++){
			var item = roster[i];
			if(item.groups.length > 0) {
				//var found = false;
				for(var j = 0;j < item.groups.length; j++) {
					if (item.groups[j]==group){
						item.groups.splice(j,1);
						this.updateRosterItem(item.jid, item.name, item.groups);
						//found=true;
					}
				}
			}
		}
	},
	
	renameRosterGroup: function(group, newGroup) {
		var roster = this.session.roster;
		for(var i=0;i<roster.length;i++){
			var item = roster[i];
			if(item.groups.length > 0) {
				//var found = false;
				for(var j = 0;j < item.groups.length; j++) {
					if (item.groups[j]==group){
						item.groups[j] = newGroup;
						this.updateRosterItem(item.jid, item.name, item.groups);
				//		found=true;
					}
				}
			}
		}
	},

	removeRosterItemFromGroup: function(jid, group){
		if (!jid) throw new Error("Roster::addRosterItemToGroup() JID is null or undefined");
		if (!group) throw new Error("Roster::addRosterItemToGroup() group is null or undefined");

		var index = this.session.getRosterIndex(jid);
		if (index==-1){return;}

		var item = this.session.roster[index];
		var found = false;

		for (var i=0; ((i<item.groups.length) && (!found)); i++){
			if (item.groups[i]!=group){continue;}
			found=true;
			index = i;
		}

		if(found==true){
			item.groups.splice(index,1);
			return this.updateRosterItem(jid, item.name, item.groups);
		}
		
		return dojox.xmpp.xmpp.INVALID_ID;
	},
	
	rosterItemRenameGroup: function(jid, oldGroup, newGroup){
		if (!jid) throw new Error("Roster::rosterItemRenameGroup() JID is null or undefined");
		if (!newGroup) throw new Error("Roster::rosterItemRenameGroup() group is null or undefined");
	
		var index = this.session.getRosterIndex(jid);
		if (index==-1){return;}

		var item = this.session.roster[index];
		var found = false;

		for (var i=0; ((i<item.groups.length) && (!found)); i++){
			if (item.groups[i]==oldGroup){
				item.groups[i] = newGroup;
				found=true;
			}
		}

		if(found==true){
			return this.updateRosterItem(jid, item.name, item.groups);
		}
		
		return dojox.xmpp.xmpp.INVALID_ID;
	},

	renameRosterItem: function(jid,newName){
		if (!jid) throw new Error("Roster::addRosterItemToGroup() JID is null or undefined");
		if (!newName) throw new Error("Roster::addRosterItemToGroup() New Name is null or undefined");

		var index = this.session.getRosterIndex(jid);
		if (index==-1){return;}

		return this.updateRosterItem(jid, newName, this.session.roster.groups,index);
	},

	removeRosterItem: function(jid){
		if (!jid) throw new Error("Roster::addRosterItemToGroup() JID is null or undefined");
		
		var req={
			id: this.session.getNextIqId(),
			from: this.session.jid + "/" + this.session.resource,
			type: 'set'
		};
		var request = new dojox.string.Builder(dojox.xmpp.util.createElement("iq", req, false));
		
		request.append(dojox.xmpp.util.createElement("query",{xmlns: "jabber:iq:roster"},false));

		if (jid.indexOf('@')== -1){
			jid += jid + '@' + this.session.domain;
		}

		request.append(dojox.xmpp.util.createElement('item',{jid:jid,subscription:"remove"},true));

		request.append("</query></iq>");

		var def = this.session.dispatchPacket(request.toString(),"iq",req.id);
		def.addCallback(this, "verifyRoster");
		return def;
	},

	//Avatar functions...I removed this stuff for now..can we even do anything useful
	//with this data even if we have it?
	getAvatar: function(jid){
	},

	publishAvatar: function(type,binval){

	},

	//EVENTS

	onVerifyRoster: function(id){
		//console.log("Roster::onVerifyRoster() - ", id);
	},

	onVerifyRosterFailed: function(err){
		//console.log("onVerifyRosterFailed: ", err);
	}
});
