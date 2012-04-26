/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mdnd.AreaManager"]){
dojo._hasResource["dojox.mdnd.AreaManager"]=true;
dojo.provide("dojox.mdnd.AreaManager");
dojo.require("dojox.mdnd.Moveable");
dojo.declare("dojox.mdnd.AreaManager",null,{autoRefresh:true,areaClass:"dojoxDndArea",dragHandleClass:"dojoxDragHandle",constructor:function(){
this._areaList=[];
this.resizeHandler=dojo.connect(dojo.global,"onresize",this,function(){
this._dropMode.updateAreas(this._areaList);
});
this._oldIndexArea=this._currentIndexArea=this._oldDropIndex=this._currentDropIndex=this._sourceIndexArea=this._sourceDropIndex=-1;
},init:function(){
this.registerByClass();
},registerByNode:function(_1,_2){
var _3=this._getIndexArea(_1);
if(_1&&_3==-1){
var _4=_1.getAttribute("accept");
var _5=(_4)?_4.split(/\s*,\s*/):["text"];
var _6={"node":_1,"items":[],"coords":{},"margin":null,"accept":_5,"initItems":false};
dojo.forEach(this._getChildren(_1),function(_7){
this._setMarginArea(_6,_7);
_6.items.push(this._addMoveableItem(_7));
},this);
this._areaList=this._dropMode.addArea(this._areaList,_6);
if(!_2){
this._dropMode.updateAreas(this._areaList);
}
dojo.publish("/dojox/mdnd/manager/register",[_1]);
}
},registerByClass:function(){
dojo.query("."+this.areaClass).forEach(function(_8){
this.registerByNode(_8,true);
},this);
this._dropMode.updateAreas(this._areaList);
},unregister:function(_9){
var _a=this._getIndexArea(_9);
if(_a!=-1){
dojo.forEach(this._areaList[_a].items,function(_b){
this._deleteMoveableItem(_b);
},this);
this._areaList.splice(_a,1);
this._dropMode.updateAreas(this._areaList);
return true;
}
return false;
},_addMoveableItem:function(_c){
_c.setAttribute("tabIndex","0");
var _d=this._searchDragHandle(_c);
var _e=new dojox.mdnd.Moveable({"handle":_d,"skip":true},_c);
dojo.addClass(_d||_c,"dragHandle");
var _f=_c.getAttribute("dndType");
var _10={"item":_e,"type":_f?_f.split(/\s*,\s*/):["text"],"handlers":[dojo.connect(_e,"onDragStart",this,"onDragStart")]};
if(dijit&&dijit.byNode){
var _11=dijit.byNode(_c);
if(_11){
_10.type=_11.dndType?_11.dndType.split(/\s*,\s*/):["text"];
_10.handlers.push(dojo.connect(_11,"uninitialize",this,function(){
this.removeDragItem(_c.parentNode,_e.node);
}));
}
}
return _10;
},_deleteMoveableItem:function(_12){
dojo.forEach(_12.handlers,function(_13){
dojo.disconnect(_13);
});
var _14=_12.item.node,_15=this._searchDragHandle(_14);
dojo.removeClass(_15||_14,"dragHandle");
_12.item.destroy();
},_getIndexArea:function(_16){
if(_16){
for(var i=0;i<this._areaList.length;i++){
if(this._areaList[i].node===_16){
return i;
}
}
}
return -1;
},_searchDragHandle:function(_17){
if(_17){
var _18=this.dragHandleClass.split(" "),_19=_18.length,_1a="";
dojo.forEach(_18,function(css,i){
_1a+="."+css;
if(i!=_19-1){
_1a+=", ";
}
});
return dojo.query(_1a,_17)[0];
}
},addDragItem:function(_1b,_1c,_1d,_1e){
var add=true;
if(!_1e){
add=_1b&&_1c&&(_1c.parentNode===null||(_1c.parentNode&&_1c.parentNode.nodeType!==1));
}
if(add){
var _1f=this._getIndexArea(_1b);
if(_1f!==-1){
var _20=this._addMoveableItem(_1c),_21=this._areaList[_1f].items;
if(0<=_1d&&_1d<_21.length){
var _22=_21.slice(0,_1d),_23=_21.slice(_1d,_21.length);
_22[_22.length]=_20;
this._areaList[_1f].items=_22.concat(_23);
_1b.insertBefore(_1c,_21[_1d].item.node);
}else{
this._areaList[_1f].items.push(_20);
_1b.appendChild(_1c);
}
this._setMarginArea(this._areaList[_1f],_1c);
this._areaList[_1f].initItems=false;
return true;
}
}
return false;
},removeDragItem:function(_24,_25){
var _26=this._getIndexArea(_24);
if(_24&&_26!==-1){
var _27=this._areaList[_26].items;
for(var j=0;j<_27.length;j++){
if(_27[j].item.node===_25){
this._deleteMoveableItem(_27[j]);
_27.splice(j,1);
return _24.removeChild(_25);
}
}
}
return null;
},_getChildren:function(_28){
var _29=[];
dojo.forEach(_28.childNodes,function(_2a){
if(_2a.nodeType==1){
if(dijit&&dijit.byNode){
var _2b=dijit.byNode(_2a);
if(_2b){
if(!_2b.dragRestriction){
_29.push(_2a);
}
}else{
_29.push(_2a);
}
}else{
_29.push(_2a);
}
}
});
return _29;
},_setMarginArea:function(_2c,_2d){
if(_2c&&_2c.margin===null&&_2d){
_2c.margin=dojo._getMarginExtents(_2d);
}
},findCurrentIndexArea:function(_2e,_2f){
this._oldIndexArea=this._currentIndexArea;
this._currentIndexArea=this._dropMode.getTargetArea(this._areaList,_2e,this._currentIndexArea);
if(this._currentIndexArea!=this._oldIndexArea){
if(this._oldIndexArea!=-1){
this.onDragExit(_2e,_2f);
}
if(this._currentIndexArea!=-1){
this.onDragEnter(_2e,_2f);
}
}
return this._currentIndexArea;
},_isAccepted:function(_30,_31){
this._accept=false;
for(var i=0;i<_31.length;++i){
for(var j=0;j<_30.length;++j){
if(_30[j]==_31[i]){
this._accept=true;
break;
}
}
}
},onDragStart:function(_32,_33,_34){
if(this.autoRefresh){
this._dropMode.updateAreas(this._areaList);
}
var _35=(dojo.isWebKit)?dojo.body():dojo.body().parentNode;
if(!this._cover){
this._cover=dojo.create("div",{"class":"dndCover"});
this._cover2=dojo.clone(this._cover);
dojo.addClass(this._cover2,"dndCover2");
}
var h=_35.scrollHeight+"px";
this._cover.style.height=this._cover2.style.height=h;
dojo.body().appendChild(this._cover);
dojo.body().appendChild(this._cover2);
this._dragStartHandler=dojo.connect(_32.ownerDocument,"ondragstart",dojo,"stopEvent");
this._sourceIndexArea=this._lastValidIndexArea=this._currentIndexArea=this._getIndexArea(_32.parentNode);
var _36=this._areaList[this._sourceIndexArea];
var _37=_36.items;
for(var i=0;i<_37.length;i++){
if(_37[i].item.node==_32){
this._dragItem=_37[i];
this._dragItem.handlers.push(dojo.connect(this._dragItem.item,"onDrag",this,"onDrag"));
this._dragItem.handlers.push(dojo.connect(this._dragItem.item,"onDragEnd",this,"onDrop"));
_37.splice(i,1);
this._currentDropIndex=this._sourceDropIndex=i;
break;
}
}
var _38=null;
if(this._sourceDropIndex!==_36.items.length){
_38=_36.items[this._sourceDropIndex].item.node;
}
if(dojo.isIE>7){
this._eventsIE7=[dojo.connect(this._cover,"onmouseover",dojo,"stopEvent"),dojo.connect(this._cover,"onmouseout",dojo,"stopEvent"),dojo.connect(this._cover,"onmouseenter",dojo,"stopEvent"),dojo.connect(this._cover,"onmouseleave",dojo,"stopEvent")];
}
var s=_32.style;
s.left=_33.x+"px";
s.top=_33.y+"px";
if(s.position=="relative"||s.position==""){
s.position="absolute";
}
this._cover.appendChild(_32);
this._dropIndicator.place(_36.node,_38,_34);
dojo.addClass(_32,"dragNode");
this._accept=true;
dojo.publish("/dojox/mdnd/drag/start",[_32,_36,this._sourceDropIndex]);
},onDragEnter:function(_39,_3a){
if(this._currentIndexArea===this._sourceIndexArea){
this._accept=true;
}else{
this._isAccepted(this._dragItem.type,this._areaList[this._currentIndexArea].accept);
}
},onDragExit:function(_3b,_3c){
this._accept=false;
},onDrag:function(_3d,_3e,_3f,_40){
var _41=this._dropMode.getDragPoint(_3e,_3f,_40);
this.findCurrentIndexArea(_41,_3f);
if(this._currentIndexArea!==-1&&this._accept){
this.placeDropIndicator(_41,_3f);
}
},placeDropIndicator:function(_42,_43){
this._oldDropIndex=this._currentDropIndex;
var _44=this._areaList[this._currentIndexArea];
if(!_44.initItems){
this._dropMode.initItems(_44);
}
this._currentDropIndex=this._dropMode.getDropIndex(_44,_42);
if(!(this._currentIndexArea===this._oldIndexArea&&this._oldDropIndex===this._currentDropIndex)){
this._placeDropIndicator(_43);
}
return this._currentDropIndex;
},_placeDropIndicator:function(_45){
var _46=this._areaList[this._lastValidIndexArea];
var _47=this._areaList[this._currentIndexArea];
this._dropMode.refreshItems(_46,this._oldDropIndex,_45,false);
var _48=null;
if(this._currentDropIndex!=-1){
_48=_47.items[this._currentDropIndex].item.node;
}
this._dropIndicator.place(_47.node,_48);
this._lastValidIndexArea=this._currentIndexArea;
this._dropMode.refreshItems(_47,this._currentDropIndex,_45,true);
},onDropCancel:function(){
if(!this._accept){
var _49=this._getIndexArea(this._dropIndicator.node.parentNode);
if(_49!=-1){
this._currentIndexArea=_49;
}else{
this._currentIndexArea=0;
}
}
},onDrop:function(_4a){
this.onDropCancel();
var _4b=this._areaList[this._currentIndexArea];
dojo.removeClass(_4a,"dragNode");
var _4c=_4a.style;
_4c.position="relative";
_4c.left="0";
_4c.top="0";
_4c.width="auto";
if(_4b.node==this._dropIndicator.node.parentNode){
_4b.node.insertBefore(_4a,this._dropIndicator.node);
}else{
_4b.node.appendChild(_4a);
this._currentDropIndex=_4b.items.length;
}
var _4d=this._currentDropIndex;
if(_4d==-1){
_4d=_4b.items.length;
}
var _4e=_4b.items;
var _4f=_4e.slice(0,_4d);
var _50=_4e.slice(_4d,_4e.length);
_4f[_4f.length]=this._dragItem;
_4b.items=_4f.concat(_50);
this._setMarginArea(_4b,_4a);
dojo.forEach(this._areaList,function(obj){
obj.initItems=false;
});
dojo.disconnect(this._dragItem.handlers.pop());
dojo.disconnect(this._dragItem.handlers.pop());
this._resetAfterDrop();
if(this._cover){
dojo.body().removeChild(this._cover);
dojo.body().removeChild(this._cover2);
}
dojo.publish("/dojox/mdnd/drop",[_4a,_4b,_4d]);
},_resetAfterDrop:function(){
this._accept=false;
this._dragItem=null;
this._currentDropIndex=-1;
this._currentIndexArea=-1;
this._oldDropIndex=-1;
this._sourceIndexArea=-1;
this._sourceDropIndex=-1;
this._dropIndicator.remove();
if(this._dragStartHandler){
dojo.disconnect(this._dragStartHandler);
}
if(dojo.isIE>7){
dojo.forEach(this._eventsIE7,dojo.disconnect);
}
},destroy:function(){
while(this._areaList.length>0){
if(!this.unregister(this._areaList[0].node)){
throw new Error("Error while destroying AreaManager");
}
}
dojo.disconnect(this.resizeHandler);
this._dropIndicator.destroy();
this._dropMode.destroy();
if(dojox.mdnd.autoScroll){
dojox.mdnd.autoScroll.destroy();
}
if(this.refreshListener){
dojo.unsubscribe(this.refreshListener);
}
if(this._cover){
dojo._destroyElement(this._cover);
dojo._destroyElement(this._cover2);
delete this._cover;
delete this._cover2;
}
}});
if(dijit&&dijit._Widget){
dojo.extend(dijit._Widget,{dndType:"text"});
}
dojox.mdnd._areaManager=null;
dojox.mdnd.areaManager=function(){
if(!dojox.mdnd._areaManager){
dojox.mdnd._areaManager=new dojox.mdnd.AreaManager();
}
return dojox.mdnd._areaManager;
};
}
