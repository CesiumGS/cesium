dojo.provide("dojox.xmpp.widget.ChatSession");

dojo.require("dijit.layout.LayoutContainer");
dojo.require("dijit._Templated");

dojo.declare("dojox.xmpp.widget.ChatSession",
	[dijit.layout.LayoutContainer, dijit._Templated],
	{
			templateString: dojo.cache("dojox.xmpp.widget", "templates/ChatSession.html"),
			enableSubWidgets: true,
			widgetsInTemplate: true,
			
			widgetType: "ChatSession",
			chatWith: null,
			instance: null,
			postCreate: function(){
				//console.log("Neato!");
			},
	
			displayMessage: function(message, type) {
				//console.log("displayMessage", this, message);
				if(message) {
					var name =  message.from ? this.chatWith : "me";
					this.messages.domNode.innerHTML += "<b>" + name + ":</b> " +   message.body + "<br/>";
					this.goToLastMessage();
				}
				
			},
			
			goToLastMessage: function() {
				this.messages.domNode.scrollTop = this.messages.domNode.scrollHeight;
			},
			
			onKeyPress: function(e){
				var key = e.keyCode || e.charCode;
				if ((key == dojo.keys.ENTER) && (this.chatInput.value != "")){
					this.instance.sendMessage({body: this.chatInput.value});
					this.displayMessage( {body: this.chatInput.value}, "out");
					this.chatInput.value = "";
				}
			}
});