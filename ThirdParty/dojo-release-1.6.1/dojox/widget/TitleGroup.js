/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.TitleGroup"]){
dojo._hasResource["dojox.widget.TitleGroup"]=true;
dojo.provide("dojox.widget.TitleGroup");
dojo.require("dijit._Widget");
dojo.require("dijit.TitlePane");
(function(d){
var tp=dijit.TitlePane.prototype,_1=function(){
var _2=this._dxfindParent&&this._dxfindParent();
_2&&_2.selectChild(this);
};
tp._dxfindParent=function(){
var n=this.domNode.parentNode;
if(n){
n=dijit.getEnclosingWidget(n);
return n&&n instanceof dojox.widget.TitleGroup&&n;
}
return n;
};
d.connect(tp,"_onTitleClick",_1);
d.connect(tp,"_onTitleKey",function(e){
if(!(e&&e.type&&e.type=="keypress"&&e.charOrCode==d.keys.TAB)){
_1.apply(this,arguments);
}
});
d.declare("dojox.widget.TitleGroup",dijit._Widget,{"class":"dojoxTitleGroup",addChild:function(_3,_4){
return _3.placeAt(this.domNode,_4);
},removeChild:function(_5){
this.domNode.removeChild(_5.domNode);
return _5;
},selectChild:function(_6){
_6&&dojo.query("> .dijitTitlePane",this.domNode).forEach(function(n){
var tp=dijit.getEnclosingWidget(n);
tp&&tp!==_6&&tp.open&&tp.set("open",false);
});
return _6;
}});
})(dojo);
}
