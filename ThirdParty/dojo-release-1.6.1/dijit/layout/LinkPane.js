/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout.LinkPane"]){
dojo._hasResource["dijit.layout.LinkPane"]=true;
dojo.provide("dijit.layout.LinkPane");
dojo.require("dijit.layout.ContentPane");
dojo.require("dijit._Templated");
dojo.declare("dijit.layout.LinkPane",[dijit.layout.ContentPane,dijit._Templated],{templateString:"<div class=\"dijitLinkPane\" dojoAttachPoint=\"containerNode\"></div>",postMixInProperties:function(){
if(this.srcNodeRef){
this.title+=this.srcNodeRef.innerHTML;
}
this.inherited(arguments);
},_fillContent:function(_1){
}});
}
