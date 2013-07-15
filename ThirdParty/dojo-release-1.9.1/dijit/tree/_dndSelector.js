//>>built
define("dijit/tree/_dndSelector",["dojo/_base/array","dojo/_base/connect","dojo/_base/declare","dojo/_base/kernel","dojo/_base/lang","dojo/dom","dojo/mouse","dojo/on","dojo/touch","../a11yclick","./_dndContainer"],function(_1,_2,_3,_4,_5,_6,_7,on,_8,_9,_a){
return _3("dijit.tree._dndSelector",_a,{constructor:function(){
this.selection={};
this.anchor=null;
this.events.push(on(this.tree.domNode,_8.press,_5.hitch(this,"onMouseDown")),on(this.tree.domNode,_8.release,_5.hitch(this,"onMouseUp")),on(this.tree.domNode,_8.move,_5.hitch(this,"onMouseMove")),on(this.tree.domNode,_9.press,_5.hitch(this,"onClickPress")),on(this.tree.domNode,_9.release,_5.hitch(this,"onClickRelease")));
},singular:false,getSelectedTreeNodes:function(){
var _b=[],_c=this.selection;
for(var i in _c){
_b.push(_c[i]);
}
return _b;
},selectNone:function(){
this.setSelection([]);
return this;
},destroy:function(){
this.inherited(arguments);
this.selection=this.anchor=null;
},addTreeNode:function(_d,_e){
this.setSelection(this.getSelectedTreeNodes().concat([_d]));
if(_e){
this.anchor=_d;
}
return _d;
},removeTreeNode:function(_f){
var _10=_1.filter(this.getSelectedTreeNodes(),function(_11){
return !_6.isDescendant(_11.domNode,_f.domNode);
});
this.setSelection(_10);
return _f;
},isTreeNodeSelected:function(_12){
return _12.id&&!!this.selection[_12.id];
},setSelection:function(_13){
var _14=this.getSelectedTreeNodes();
_1.forEach(this._setDifference(_14,_13),_5.hitch(this,function(_15){
_15.setSelected(false);
if(this.anchor==_15){
delete this.anchor;
}
delete this.selection[_15.id];
}));
_1.forEach(this._setDifference(_13,_14),_5.hitch(this,function(_16){
_16.setSelected(true);
this.selection[_16.id]=_16;
}));
this._updateSelectionProperties();
},_setDifference:function(xs,ys){
_1.forEach(ys,function(y){
y.__exclude__=true;
});
var ret=_1.filter(xs,function(x){
return !x.__exclude__;
});
_1.forEach(ys,function(y){
delete y["__exclude__"];
});
return ret;
},_updateSelectionProperties:function(){
var _17=this.getSelectedTreeNodes();
var _18=[],_19=[],_1a=[];
_1.forEach(_17,function(_1b){
var ary=_1b.getTreePath(),_1c=this.tree.model;
_19.push(_1b);
_18.push(ary);
ary=_1.map(ary,function(_1d){
return _1c.getIdentity(_1d);
},this);
_1a.push(ary.join("/"));
},this);
var _1e=_1.map(_19,function(_1f){
return _1f.item;
});
this.tree._set("paths",_18);
this.tree._set("path",_18[0]||[]);
this.tree._set("selectedNodes",_19);
this.tree._set("selectedNode",_19[0]||null);
this.tree._set("selectedItems",_1e);
this.tree._set("selectedItem",_1e[0]||null);
},onClickPress:function(e){
if(this.current&&this.current.isExpandable&&this.tree.isExpandoNode(e.target,this.current)){
return;
}
if(_7.isLeft(e)){
e.preventDefault();
}
var _20=e.type=="keydown"?this.tree.focusedChild:this.current;
if(!_20){
return;
}
var _21=_2.isCopyKey(e),id=_20.id;
if(!this.singular&&!e.shiftKey&&this.selection[id]){
this._doDeselect=true;
return;
}else{
this._doDeselect=false;
}
this.userSelect(_20,_21,e.shiftKey);
},onClickRelease:function(e){
if(!this._doDeselect){
return;
}
this._doDeselect=false;
this.userSelect(e.type=="keyup"?this.tree.focusedChild:this.current,_2.isCopyKey(e),e.shiftKey);
},onMouseMove:function(){
this._doDeselect=false;
},onMouseDown:function(){
},onMouseUp:function(){
},_compareNodes:function(n1,n2){
if(n1===n2){
return 0;
}
if("sourceIndex" in document.documentElement){
return n1.sourceIndex-n2.sourceIndex;
}else{
if("compareDocumentPosition" in document.documentElement){
return n1.compareDocumentPosition(n2)&2?1:-1;
}else{
if(document.createRange){
var r1=doc.createRange();
r1.setStartBefore(n1);
var r2=doc.createRange();
r2.setStartBefore(n2);
return r1.compareBoundaryPoints(r1.END_TO_END,r2);
}else{
throw Error("dijit.tree._compareNodes don't know how to compare two different nodes in this browser");
}
}
}
},userSelect:function(_22,_23,_24){
if(this.singular){
if(this.anchor==_22&&_23){
this.selectNone();
}else{
this.setSelection([_22]);
this.anchor=_22;
}
}else{
if(_24&&this.anchor){
var cr=this._compareNodes(this.anchor.rowNode,_22.rowNode),_25,end,_26=this.anchor;
if(cr<0){
_25=_26;
end=_22;
}else{
_25=_22;
end=_26;
}
var _27=[];
while(_25!=end){
_27.push(_25);
_25=this.tree._getNext(_25);
}
_27.push(end);
this.setSelection(_27);
}else{
if(this.selection[_22.id]&&_23){
this.removeTreeNode(_22);
}else{
if(_23){
this.addTreeNode(_22,true);
}else{
this.setSelection([_22]);
this.anchor=_22;
}
}
}
}
},getItem:function(key){
var _28=this.selection[key];
return {data:_28,type:["treeNode"]};
},forInSelectedItems:function(f,o){
o=o||_4.global;
for(var id in this.selection){
f.call(o,this.getItem(id),id,this);
}
}});
});
