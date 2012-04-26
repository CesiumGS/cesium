/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.editor.plugins.PrettyPrint"]){
dojo._hasResource["dojox.editor.plugins.PrettyPrint"]=true;
dojo.provide("dojox.editor.plugins.PrettyPrint");
dojo.require("dijit._editor._Plugin");
dojo.require("dojox.html.format");
dojo.declare("dojox.editor.plugins.PrettyPrint",dijit._editor._Plugin,{indentBy:-1,lineLength:-1,useDefaultCommand:false,entityMap:null,_initButton:function(){
delete this.command;
},setToolbar:function(_1){
},setEditor:function(_2){
this.inherited(arguments);
var _3=this;
this.editor.onLoadDeferred.addCallback(function(){
_3.editor._prettyprint_getValue=_3.editor.getValue;
_3.editor.getValue=function(){
var _4=_3.editor._prettyprint_getValue(arguments);
return dojox.html.format.prettyPrint(_4,_3.indentBy,_3.lineLength,_3.entityMap,_3.xhtml);
};
_3.editor._prettyprint_endEditing=_3.editor._endEditing;
_3.editor._prettyprint_onBlur=_3.editor._onBlur;
_3.editor._endEditing=function(_5){
var v=_3.editor._prettyprint_getValue(true);
_3.editor._undoedSteps=[];
_3.editor._steps.push({text:v,bookmark:_3.editor._getBookmark()});
};
_3.editor._onBlur=function(e){
this.inherited("_onBlur",arguments);
var _6=_3.editor._prettyprint_getValue(true);
if(_6!=_3.editor.savedContent){
_3.editor.onChange(_6);
_3.editor.savedContent=_6;
}
};
});
}});
dojo.subscribe(dijit._scopeName+".Editor.getPlugin",null,function(o){
if(o.plugin){
return;
}
var _7=o.args.name.toLowerCase();
if(_7==="prettyprint"){
o.plugin=new dojox.editor.plugins.PrettyPrint({indentBy:("indentBy" in o.args)?o.args.indentBy:-1,lineLength:("lineLength" in o.args)?o.args.lineLength:-1,entityMap:("entityMap" in o.args)?o.args.entityMap:dojox.html.entities.html.concat([["¢","cent"],["£","pound"],["€","euro"],["¥","yen"],["©","copy"],["§","sect"],["…","hellip"],["®","reg"]]),xhtml:("xhtml" in o.args)?o.args.xhtml:false});
}
});
}
