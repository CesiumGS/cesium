/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.sketch.Toolbar"]){
dojo._hasResource["dojox.sketch.Toolbar"]=true;
dojo.provide("dojox.sketch.Toolbar");
dojo.require("dojox.sketch.Annotation");
dojo.require("dijit.Toolbar");
dojo.require("dijit.form.Button");
dojo.declare("dojox.sketch.ButtonGroup",null,{constructor:function(){
this._childMaps={};
this._children=[];
},add:function(_1){
this._childMaps[_1]=_1.connect(_1,"onActivate",dojo.hitch(this,"_resetGroup",_1));
this._children.push(_1);
},_resetGroup:function(p){
var cs=this._children;
dojo.forEach(cs,function(c){
if(p!=c&&c["attr"]){
c.attr("checked",false);
}
});
}});
dojo.declare("dojox.sketch.Toolbar",dijit.Toolbar,{figure:null,plugins:null,postCreate:function(){
this.inherited(arguments);
this.shapeGroup=new dojox.sketch.ButtonGroup;
if(!this.plugins){
this.plugins=["Lead","SingleArrow","DoubleArrow","Underline","Preexisting","Slider"];
}
this._plugins=[];
dojo.forEach(this.plugins,function(_2){
var _3=dojo.isString(_2)?_2:_2.name;
var p=new dojox.sketch.tools[_3](_2.args||{});
this._plugins.push(p);
p.setToolbar(this);
if(!this._defaultTool&&p.button){
this._defaultTool=p;
}
},this);
},setFigure:function(f){
this.figure=f;
this.connect(f,"onLoad","reset");
dojo.forEach(this._plugins,function(p){
p.setFigure(f);
});
},destroy:function(){
dojo.forEach(this._plugins,function(p){
p.destroy();
});
this.inherited(arguments);
delete this._defaultTool;
delete this._plugins;
},addGroupItem:function(_4,_5){
if(_5!="toolsGroup"){
console.error("not supported group "+_5);
return;
}
this.shapeGroup.add(_4);
},reset:function(){
this._defaultTool.activate();
},_setShape:function(s){
if(!this.figure.surface){
return;
}
if(this.figure.hasSelections()){
for(var i=0;i<this.figure.selected.length;i++){
var _6=this.figure.selected[i].serialize();
this.figure.convert(this.figure.selected[i],s);
this.figure.history.add(dojox.sketch.CommandTypes.Convert,this.figure.selected[i],_6);
}
}
}});
dojox.sketch.makeToolbar=function(_7,_8){
var _9=new dojox.sketch.Toolbar();
_9.setFigure(_8);
_7.appendChild(_9.domNode);
return _9;
};
}
