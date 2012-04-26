/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.layout.ContentPane"]){
dojo._hasResource["dojox.layout.ContentPane"]=true;
dojo.provide("dojox.layout.ContentPane");
dojo.require("dijit.layout.ContentPane");
dojo.require("dojox.html._base");
dojo.declare("dojox.layout.ContentPane",dijit.layout.ContentPane,{adjustPaths:false,cleanContent:false,renderStyles:false,executeScripts:true,scriptHasHooks:false,constructor:function(){
this.ioArgs={};
this.ioMethod=dojo.xhrGet;
},onExecError:function(e){
},_setContent:function(_1){
var _2=this._contentSetter;
if(!(_2&&_2 instanceof dojox.html._ContentSetter)){
_2=this._contentSetter=new dojox.html._ContentSetter({node:this.containerNode,_onError:dojo.hitch(this,this._onError),onContentError:dojo.hitch(this,function(e){
var _3=this.onContentError(e);
try{
this.containerNode.innerHTML=_3;
}
catch(e){
console.error("Fatal "+this.id+" could not change content due to "+e.message,e);
}
})});
}
this._contentSetterParams={adjustPaths:Boolean(this.adjustPaths&&(this.href||this.referencePath)),referencePath:this.href||this.referencePath,renderStyles:this.renderStyles,executeScripts:this.executeScripts,scriptHasHooks:this.scriptHasHooks,scriptHookReplacement:"dijit.byId('"+this.id+"')"};
this.inherited("_setContent",arguments);
}});
}
