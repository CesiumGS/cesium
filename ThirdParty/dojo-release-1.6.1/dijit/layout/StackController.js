/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.layout.StackController"]){
dojo._hasResource["dijit.layout.StackController"]=true;
dojo.provide("dijit.layout.StackController");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._Container");
dojo.require("dijit.form.ToggleButton");
dojo.requireLocalization("dijit","common",null,"ROOT,ar,ca,cs,da,de,el,es,fi,fr,he,hu,it,ja,kk,ko,nb,nl,pl,pt,pt-pt,ro,ru,sk,sl,sv,th,tr,zh,zh-tw");
dojo.declare("dijit.layout.StackController",[dijit._Widget,dijit._Templated,dijit._Container],{templateString:"<span role='tablist' dojoAttachEvent='onkeypress' class='dijitStackController'></span>",containerId:"",buttonWidget:"dijit.layout._StackButton",constructor:function(){
this.pane2button={};
this.pane2connects={};
this.pane2watches={};
},buildRendering:function(){
this.inherited(arguments);
dijit.setWaiRole(this.domNode,"tablist");
},postCreate:function(){
this.inherited(arguments);
this.subscribe(this.containerId+"-startup","onStartup");
this.subscribe(this.containerId+"-addChild","onAddChild");
this.subscribe(this.containerId+"-removeChild","onRemoveChild");
this.subscribe(this.containerId+"-selectChild","onSelectChild");
this.subscribe(this.containerId+"-containerKeyPress","onContainerKeyPress");
},onStartup:function(_1){
dojo.forEach(_1.children,this.onAddChild,this);
if(_1.selected){
this.onSelectChild(_1.selected);
}
},destroy:function(){
for(var _2 in this.pane2button){
this.onRemoveChild(dijit.byId(_2));
}
this.inherited(arguments);
},onAddChild:function(_3,_4){
var _5=dojo.getObject(this.buttonWidget);
var _6=new _5({id:this.id+"_"+_3.id,label:_3.title,dir:_3.dir,lang:_3.lang,showLabel:_3.showTitle,iconClass:_3.iconClass,closeButton:_3.closable,title:_3.tooltip});
dijit.setWaiState(_6.focusNode,"selected","false");
var _7=["title","showTitle","iconClass","closable","tooltip"],_8=["label","showLabel","iconClass","closeButton","title"];
this.pane2watches[_3.id]=dojo.map(_7,function(_9,_a){
return _3.watch(_9,function(_b,_c,_d){
_6.set(_8[_a],_d);
});
});
this.pane2connects[_3.id]=[this.connect(_6,"onClick",dojo.hitch(this,"onButtonClick",_3)),this.connect(_6,"onClickCloseButton",dojo.hitch(this,"onCloseButtonClick",_3))];
this.addChild(_6,_4);
this.pane2button[_3.id]=_6;
_3.controlButton=_6;
if(!this._currentChild){
_6.focusNode.setAttribute("tabIndex","0");
dijit.setWaiState(_6.focusNode,"selected","true");
this._currentChild=_3;
}
if(!this.isLeftToRight()&&dojo.isIE&&this._rectifyRtlTabList){
this._rectifyRtlTabList();
}
},onRemoveChild:function(_e){
if(this._currentChild===_e){
this._currentChild=null;
}
dojo.forEach(this.pane2connects[_e.id],dojo.hitch(this,"disconnect"));
delete this.pane2connects[_e.id];
dojo.forEach(this.pane2watches[_e.id],function(w){
w.unwatch();
});
delete this.pane2watches[_e.id];
var _f=this.pane2button[_e.id];
if(_f){
this.removeChild(_f);
delete this.pane2button[_e.id];
_f.destroy();
}
delete _e.controlButton;
},onSelectChild:function(_10){
if(!_10){
return;
}
if(this._currentChild){
var _11=this.pane2button[this._currentChild.id];
_11.set("checked",false);
dijit.setWaiState(_11.focusNode,"selected","false");
_11.focusNode.setAttribute("tabIndex","-1");
}
var _12=this.pane2button[_10.id];
_12.set("checked",true);
dijit.setWaiState(_12.focusNode,"selected","true");
this._currentChild=_10;
_12.focusNode.setAttribute("tabIndex","0");
var _13=dijit.byId(this.containerId);
dijit.setWaiState(_13.containerNode,"labelledby",_12.id);
},onButtonClick:function(_14){
var _15=dijit.byId(this.containerId);
_15.selectChild(_14);
},onCloseButtonClick:function(_16){
var _17=dijit.byId(this.containerId);
_17.closeChild(_16);
if(this._currentChild){
var b=this.pane2button[this._currentChild.id];
if(b){
dijit.focus(b.focusNode||b.domNode);
}
}
},adjacent:function(_18){
if(!this.isLeftToRight()&&(!this.tabPosition||/top|bottom/.test(this.tabPosition))){
_18=!_18;
}
var _19=this.getChildren();
var _1a=dojo.indexOf(_19,this.pane2button[this._currentChild.id]);
var _1b=_18?1:_19.length-1;
return _19[(_1a+_1b)%_19.length];
},onkeypress:function(e){
if(this.disabled||e.altKey){
return;
}
var _1c=null;
if(e.ctrlKey||!e._djpage){
var k=dojo.keys;
switch(e.charOrCode){
case k.LEFT_ARROW:
case k.UP_ARROW:
if(!e._djpage){
_1c=false;
}
break;
case k.PAGE_UP:
if(e.ctrlKey){
_1c=false;
}
break;
case k.RIGHT_ARROW:
case k.DOWN_ARROW:
if(!e._djpage){
_1c=true;
}
break;
case k.PAGE_DOWN:
if(e.ctrlKey){
_1c=true;
}
break;
case k.HOME:
case k.END:
var _1d=this.getChildren();
if(_1d&&_1d.length){
_1d[e.charOrCode==k.HOME?0:_1d.length-1].onClick();
}
dojo.stopEvent(e);
break;
case k.DELETE:
if(this._currentChild.closable){
this.onCloseButtonClick(this._currentChild);
}
dojo.stopEvent(e);
break;
default:
if(e.ctrlKey){
if(e.charOrCode===k.TAB){
this.adjacent(!e.shiftKey).onClick();
dojo.stopEvent(e);
}else{
if(e.charOrCode=="w"){
if(this._currentChild.closable){
this.onCloseButtonClick(this._currentChild);
}
dojo.stopEvent(e);
}
}
}
}
if(_1c!==null){
this.adjacent(_1c).onClick();
dojo.stopEvent(e);
}
}
},onContainerKeyPress:function(_1e){
_1e.e._djpage=_1e.page;
this.onkeypress(_1e.e);
}});
dojo.declare("dijit.layout._StackButton",dijit.form.ToggleButton,{tabIndex:"-1",buildRendering:function(evt){
this.inherited(arguments);
dijit.setWaiRole((this.focusNode||this.domNode),"tab");
},onClick:function(evt){
dijit.focus(this.focusNode);
},onClickCloseButton:function(evt){
evt.stopPropagation();
}});
}
