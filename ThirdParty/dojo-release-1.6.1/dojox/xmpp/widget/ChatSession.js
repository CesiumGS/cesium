/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.xmpp.widget.ChatSession"]){
dojo._hasResource["dojox.xmpp.widget.ChatSession"]=true;
dojo.provide("dojox.xmpp.widget.ChatSession");
dojo.declare("dojox.xmpp.widget.ChatSession",[dijit.layout.LayoutContainer,dijit._Templated],{templateString:dojo.cache("dojox.xmpp.widget","templates/ChatSession.html","<div>\n<div dojoAttachPoint=\"messages\" dojoType=\"dijit.layout.ContentPane\" layoutAlign=\"client\" style=\"overflow:auto\">\n</div>\n<div dojoType=\"dijit.layout.ContentPane\" layoutAlign=\"bottom\" style=\"border-top: 2px solid #333333; height: 35px;\"><input dojoAttachPoint=\"chatInput\" dojoAttachEvent=\"onkeypress: onKeyPress\" style=\"width: 100%;height: 35px;\" /></div>\n</div>\n"),enableSubWidgets:true,widgetsInTemplate:true,widgetType:"ChatSession",chatWith:null,instance:null,postCreate:function(){
},displayMessage:function(_1,_2){
if(_1){
var _3=_1.from?this.chatWith:"me";
this.messages.domNode.innerHTML+="<b>"+_3+":</b> "+_1.body+"<br/>";
this.goToLastMessage();
}
},goToLastMessage:function(){
this.messages.domNode.scrollTop=this.messages.domNode.scrollHeight;
},onKeyPress:function(e){
var _4=e.keyCode||e.charCode;
if((_4==dojo.keys.ENTER)&&(this.chatInput.value!="")){
this.instance.sendMessage({body:this.chatInput.value});
this.displayMessage({body:this.chatInput.value},"out");
this.chatInput.value="";
}
}});
}
