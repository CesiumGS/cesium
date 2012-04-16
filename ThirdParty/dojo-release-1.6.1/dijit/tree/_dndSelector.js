/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit.tree._dndSelector"]){
dojo._hasResource["dijit.tree._dndSelector"]=true;
dojo.provide("dijit.tree._dndSelector");
dojo.require("dojo.dnd.common");
dojo.require("dijit.tree._dndContainer");
dojo.declare("dijit.tree._dndSelector",dijit.tree._dndContainer,{constructor:function(_1,_2){
this.selection={};
this.anchor=null;
dijit.setWaiState(this.tree.domNode,"multiselect",!this.singular);
this.events.push(dojo.connect(this.tree.domNode,"onmousedown",this,"onMouseDown"),dojo.connect(this.tree.domNode,"onmouseup",this,"onMouseUp"),dojo.connect(this.tree.domNode,"onmousemove",this,"onMouseMove"));
},singular:false,getSelectedTreeNodes:function(){
var _3=[],_4=this.selection;
for(var i in _4){
_3.push(_4[i]);
}
return _3;
},selectNone:function(){
this.setSelection([]);
return this;
},destroy:function(){
this.inherited(arguments);
this.selection=this.anchor=null;
},addTreeNode:function(_5,_6){
this.setSelection(this.getSelectedTreeNodes().concat([_5]));
if(_6){
this.anchor=_5;
}
return _5;
},removeTreeNode:function(_7){
this.setSelection(this._setDifference(this.getSelectedTreeNodes(),[_7]));
return _7;
},isTreeNodeSelected:function(_8){
return _8.id&&!!this.selection[_8.id];
},setSelection:function(_9){
var _a=this.getSelectedTreeNodes();
dojo.forEach(this._setDifference(_a,_9),dojo.hitch(this,function(_b){
_b.setSelected(false);
if(this.anchor==_b){
delete this.anchor;
}
delete this.selection[_b.id];
}));
dojo.forEach(this._setDifference(_9,_a),dojo.hitch(this,function(_c){
_c.setSelected(true);
this.selection[_c.id]=_c;
}));
this._updateSelectionProperties();
},_setDifference:function(xs,ys){
dojo.forEach(ys,function(y){
y.__exclude__=true;
});
var _d=dojo.filter(xs,function(x){
return !x.__exclude__;
});
dojo.forEach(ys,function(y){
delete y["__exclude__"];
});
return _d;
},_updateSelectionProperties:function(){
var _e=this.getSelectedTreeNodes();
var _f=[],_10=[];
dojo.forEach(_e,function(_11){
_10.push(_11);
_f.push(_11.getTreePath());
});
var _12=dojo.map(_10,function(_13){
return _13.item;
});
this.tree._set("paths",_f);
this.tree._set("path",_f[0]||[]);
this.tree._set("selectedNodes",_10);
this.tree._set("selectedNode",_10[0]||null);
this.tree._set("selectedItems",_12);
this.tree._set("selectedItem",_12[0]||null);
},onMouseDown:function(e){
if(!this.current||this.tree.isExpandoNode(e.target,this.current)){
return;
}
if(e.button==dojo.mouseButtons.RIGHT){
return;
}
dojo.stopEvent(e);
var _14=this.current,_15=dojo.isCopyKey(e),id=_14.id;
if(!this.singular&&!e.shiftKey&&this.selection[id]){
this._doDeselect=true;
return;
}else{
this._doDeselect=false;
}
this.userSelect(_14,_15,e.shiftKey);
},onMouseUp:function(e){
if(!this._doDeselect){
return;
}
this._doDeselect=false;
this.userSelect(this.current,dojo.isCopyKey(e),e.shiftKey);
},onMouseMove:function(e){
this._doDeselect=false;
},userSelect:function(_16,_17,_18){
if(this.singular){
if(this.anchor==_16&&_17){
this.selectNone();
}else{
this.setSelection([_16]);
this.anchor=_16;
}
}else{
if(_18&&this.anchor){
var cr=dijit.tree._compareNodes(this.anchor.rowNode,_16.rowNode),_19,end,_1a=this.anchor;
if(cr<0){
_19=_1a;
end=_16;
}else{
_19=_16;
end=_1a;
}
nodes=[];
while(_19!=end){
nodes.push(_19);
_19=this.tree._getNextNode(_19);
}
nodes.push(end);
this.setSelection(nodes);
}else{
if(this.selection[_16.id]&&_17){
this.removeTreeNode(_16);
}else{
if(_17){
this.addTreeNode(_16,true);
}else{
this.setSelection([_16]);
this.anchor=_16;
}
}
}
}
},forInSelectedItems:function(f,o){
o=o||dojo.global;
for(var id in this.selection){
f.call(o,this.getItem(id),id,this);
}
}});
}
