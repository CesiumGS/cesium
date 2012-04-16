/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.ui.dom.Toolbar"]){
dojo._hasResource["dojox.drawing.ui.dom.Toolbar"]=true;
dojo.provide("dojox.drawing.ui.dom.Toolbar");
dojo.deprecated("dojox.drawing.ui.dom.Toolbar","It may not even make it to the 1.4 release.",1.4);
(function(){
dojo.declare("dojox.drawing.ui.dom.Toolbar",[],{baseClass:"drawingToolbar",buttonClass:"drawingButton",iconClass:"icon",constructor:function(_1,_2){
dojo.addOnLoad(this,function(){
this.domNode=dojo.byId(_2);
dojo.addClass(this.domNode,this.baseClass);
this.parse();
});
},createIcon:function(_3,_4){
var _5=_4&&_4.setup?_4.setup:{};
if(_5.iconClass){
var _6=_5.iconClass?_5.iconClass:"iconNone";
var _7=_5.tooltip?_5.tooltip:"Tool";
var _8=dojo.create("div",{title:_7},_3);
dojo.addClass(_8,this.iconClass);
dojo.addClass(_8,_6);
dojo.connect(_3,"mouseup",function(_9){
dojo.stopEvent(_9);
dojo.removeClass(_3,"active");
});
dojo.connect(_3,"mouseover",function(_a){
dojo.stopEvent(_a);
dojo.addClass(_3,"hover");
});
dojo.connect(_3,"mousedown",this,function(_b){
dojo.stopEvent(_b);
dojo.addClass(_3,"active");
});
dojo.connect(_3,"mouseout",this,function(_c){
dojo.stopEvent(_c);
dojo.removeClass(_3,"hover");
});
}
},createTool:function(_d){
_d.innerHTML="";
var _e=dojo.attr(_d,"tool");
this.toolNodes[_e]=_d;
dojo.attr(_d,"tabIndex",1);
var _f=dojo.getObject(_e);
this.createIcon(_d,_f);
this.drawing.registerTool(_e,_f);
dojo.connect(_d,"mouseup",this,function(evt){
dojo.stopEvent(evt);
dojo.removeClass(_d,"active");
this.onClick(_e);
});
dojo.connect(_d,"mouseover",function(evt){
dojo.stopEvent(evt);
dojo.addClass(_d,"hover");
});
dojo.connect(_d,"mousedown",this,function(evt){
dojo.stopEvent(evt);
dojo.addClass(_d,"active");
});
dojo.connect(_d,"mouseout",this,function(evt){
dojo.stopEvent(evt);
dojo.removeClass(_d,"hover");
});
},parse:function(){
var _10=dojo.attr(this.domNode,"drawingId");
this.drawing=dojox.drawing.util.common.byId(_10);
!this.drawing&&console.error("Drawing not found based on 'drawingId' in Toolbar. ");
this.toolNodes={};
var _11;
dojo.query(">",this.domNode).forEach(function(_12,i){
_12.className=this.buttonClass;
var _13=dojo.attr(_12,"tool");
var _14=dojo.attr(_12,"action");
var _15=dojo.attr(_12,"plugin");
if(_13){
if(i==0||dojo.attr(_12,"selected")=="true"){
_11=_13;
}
this.createTool(_12);
}else{
if(_15){
var p={name:_15,options:{}},opt=dojo.attr(_12,"options");
if(opt){
p.options=eval("("+opt+")");
}
p.options.node=_12;
_12.innerHTML="";
this.drawing.addPlugin(p);
this.createIcon(_12,dojo.getObject(dojo.attr(_12,"plugin")));
}
}
},this);
this.drawing.initPlugins();
dojo.connect(this.drawing,"setTool",this,"onSetTool");
this.drawing.setTool(_11);
},onClick:function(_16){
this.drawing.setTool(_16);
},onSetTool:function(_17){
for(var n in this.toolNodes){
if(n==_17){
dojo.addClass(this.toolNodes[_17],"selected");
this.toolNodes[_17].blur();
}else{
dojo.removeClass(this.toolNodes[n],"selected");
}
}
}});
})();
}
