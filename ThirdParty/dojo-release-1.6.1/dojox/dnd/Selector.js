/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.dnd.Selector"]){
dojo._hasResource["dojox.dnd.Selector"]=true;
dojo.provide("dojox.dnd.Selector");
dojo.require("dojo.dnd.Selector");
dojo.declare("dojox.dnd.Selector",dojo.dnd.Selector,{isSelected:function(_1){
var id=dojo.isString(_1)?_1:_1.id,_2=this.getItem(id);
return _2&&this.selected[id];
},selectNode:function(_3,_4){
if(!_4){
this.selectNone();
}
var id=dojo.isString(_3)?_3:_3.id,_5=this.getItem(id);
if(_5){
this._removeAnchor();
this.anchor=dojo.byId(_3);
this._addItemClass(this.anchor,"Anchor");
this.selection[id]=1;
this._addItemClass(this.anchor,"Selected");
}
return this;
},deselectNode:function(_6){
var id=dojo.isString(_6)?_6:_6.id,_7=this.getItem(id);
if(_7&&this.selection[id]){
if(this.anchor===dojo.byId(_6)){
this._removeAnchor();
}
delete this.selection[id];
this._removeItemClass(this.anchor,"Selected");
}
return this;
},selectByBBox:function(_8,_9,_a,_b,_c){
if(!_c){
this.selectNone();
}
this.forInItems(function(_d,id){
var _e=dojo.byId(id);
if(_e&&this._isBoundedByBox(_e,_8,_9,_a,_b)){
this.selectNode(id,true);
}
},this);
return this;
},_isBoundedByBox:function(_f,_10,top,_11,_12){
var c=dojo.coords(_f),t;
if(_10>_11){
t=_10;
_10=_11;
_11=t;
}
if(top>_12){
t=top;
top=_12;
_12=t;
}
return c.x>=_10&&c.x+c.w<=_11&&c.y>=top&&c.y+c.h<=_12;
},shift:function(_13,add){
var _14=this.getSelectedNodes();
if(_14&&_14.length){
this.selectNode(this._getNodeId(_14[_14.length-1].id,_13),add);
}
},_getNodeId:function(_15,_16){
var _17=this.getAllNodes(),_18=_15;
for(var i=0,l=_17.length;i<l;++i){
if(_17[i].id==_15){
var j=Math.min(l-1,Math.max(0,i+(_16?1:-1)));
if(i!=j){
_18=_17[j].id;
}
break;
}
}
return _18;
}});
}
