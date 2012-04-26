/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.layout.GridContainerLite"]){
dojo._hasResource["dojox.layout.GridContainerLite"]=true;
dojo.provide("dojox.layout.GridContainerLite");
dojo.require("dijit._Templated");
dojo.require("dijit.layout._LayoutWidget");
dojo.require("dojox.mdnd.AreaManager");
dojo.require("dojox.mdnd.DropIndicator");
dojo.require("dojox.mdnd.dropMode.OverDropMode");
dojo.require("dojox.mdnd.AutoScroll");
dojo.declare("dojox.layout.GridContainerLite",[dijit.layout._LayoutWidget,dijit._Templated],{autoRefresh:true,templateString:dojo.cache("dojox.layout","resources/GridContainer.html","<div id=\"${id}\" class=\"gridContainer\" dojoAttachPoint=\"containerNode\" tabIndex=\"0\" dojoAttachEvent=\"onkeypress:_selectFocus\">\n\t<div dojoAttachPoint=\"gridContainerDiv\">\n\t\t<table class=\"gridContainerTable\" dojoAttachPoint=\"gridContainerTable\" cellspacing=\"0\" cellpadding=\"0\">\n\t\t\t<tbody>\n\t\t\t\t<tr dojoAttachPoint=\"gridNode\" >\n\t\t\t\t\t\n\t\t\t\t</tr>\n\t\t\t</tbody>\n\t\t</table>\n\t</div>\n</div>\n"),dragHandleClass:"dojoxDragHandle",nbZones:1,doLayout:true,isAutoOrganized:true,acceptTypes:[],colWidths:"",constructor:function(_1,_2){
this.acceptTypes=(_1||{}).acceptTypes||["text"];
this._disabled=true;
},postCreate:function(){
this.inherited(arguments);
this._grid=[];
this._createCells();
this.subscribe("/dojox/mdnd/drop","resizeChildAfterDrop");
this.subscribe("/dojox/mdnd/drag/start","resizeChildAfterDragStart");
this._dragManager=dojox.mdnd.areaManager();
this._dragManager.autoRefresh=this.autoRefresh;
this._dragManager.dragHandleClass=this.dragHandleClass;
if(this.doLayout){
this._border={"h":(dojo.isIE)?dojo._getBorderExtents(this.gridContainerTable).h:0,"w":(dojo.isIE==6)?1:0};
}else{
dojo.style(this.domNode,"overflowY","hidden");
dojo.style(this.gridContainerTable,"height","auto");
}
this.inherited(arguments);
},startup:function(){
if(this._started){
return;
}
if(this.isAutoOrganized){
this._organizeChildren();
}else{
this._organizeChildrenManually();
}
dojo.forEach(this.getChildren(),function(_3){
_3.startup();
});
if(this._isShown()){
this.enableDnd();
}
this.inherited(arguments);
},resizeChildAfterDrop:function(_4,_5,_6){
if(this._disabled){
return false;
}
if(dijit.getEnclosingWidget(_5.node)==this){
var _7=dijit.byNode(_4);
if(_7.resize&&dojo.isFunction(_7.resize)){
_7.resize();
}
_7.set("column",_4.parentNode.cellIndex);
if(this.doLayout){
var _8=this._contentBox.h,_9=dojo.contentBox(this.gridContainerDiv).h;
if(_9>=_8){
dojo.style(this.gridContainerTable,"height",(_8-this._border.h)+"px");
}
}
return true;
}
return false;
},resizeChildAfterDragStart:function(_a,_b,_c){
if(this._disabled){
return false;
}
if(dijit.getEnclosingWidget(_b.node)==this){
this._draggedNode=_a;
if(this.doLayout){
dojo.marginBox(this.gridContainerTable,{"h":dojo.contentBox(this.gridContainerDiv).h-this._border.h});
}
return true;
}
return false;
},getChildren:function(){
var _d=[];
dojo.forEach(this._grid,function(_e){
_d=_d.concat(dojo.query("> [widgetId]",_e.node).map(dijit.byNode));
});
return _d;
},_isShown:function(){
if("open" in this){
return this.open;
}else{
var _f=this.domNode;
return (_f.style.display!="none")&&(_f.style.visibility!="hidden")&&!dojo.hasClass(_f,"dijitHidden");
}
},layout:function(){
if(this.doLayout){
var _10=this._contentBox;
dojo.marginBox(this.gridContainerTable,{"h":_10.h-this._border.h});
dojo.contentBox(this.domNode,{"w":_10.w-this._border.w});
}
dojo.forEach(this.getChildren(),function(_11){
if(_11.resize&&dojo.isFunction(_11.resize)){
_11.resize();
}
});
},onShow:function(){
if(this._disabled){
this.enableDnd();
}
},onHide:function(){
if(!this._disabled){
this.disableDnd();
}
},_createCells:function(){
if(this.nbZones===0){
this.nbZones=1;
}
var _12=this.acceptTypes.join(","),i=0;
var _13=this.colWidths||[];
var _14=[];
var _15;
var _16=0;
for(i=0;i<this.nbZones;i++){
if(_14.length<_13.length){
_16+=_13[i];
_14.push(_13[i]);
}else{
if(!_15){
_15=(100-_16)/(this.nbZones-i);
}
_14.push(_15);
}
}
i=0;
while(i<this.nbZones){
this._grid.push({"node":dojo.create("td",{"class":"gridContainerZone","accept":_12,"id":this.id+"_dz"+i,"style":{"width":_14[i]+"%"}},this.gridNode)});
i++;
}
},_getZonesAttr:function(){
return dojo.query(".gridContainerZone",this.containerNode);
},enableDnd:function(){
var m=this._dragManager;
dojo.forEach(this._grid,function(_17){
m.registerByNode(_17.node);
});
m._dropMode.updateAreas(m._areaList);
this._disabled=false;
},disableDnd:function(){
var m=this._dragManager;
dojo.forEach(this._grid,function(_18){
m.unregister(_18.node);
});
m._dropMode.updateAreas(m._areaList);
this._disabled=true;
},_organizeChildren:function(){
var _19=dojox.layout.GridContainerLite.superclass.getChildren.call(this);
var _1a=this.nbZones,_1b=Math.floor(_19.length/_1a),mod=_19.length%_1a,i=0;
for(var z=0;z<_1a;z++){
for(var r=0;r<_1b;r++){
this._insertChild(_19[i],z);
i++;
}
if(mod>0){
try{
this._insertChild(_19[i],z);
i++;
}
catch(e){
console.error("Unable to insert child in GridContainer",e);
}
mod--;
}else{
if(_1b===0){
break;
}
}
}
},_organizeChildrenManually:function(){
var _1c=dojox.layout.GridContainerLite.superclass.getChildren.call(this),_1d=_1c.length,_1e;
for(var i=0;i<_1d;i++){
_1e=_1c[i];
try{
this._insertChild(_1e,_1e.column-1);
}
catch(e){
console.error("Unable to insert child in GridContainer",e);
}
}
},_insertChild:function(_1f,_20,p){
var _21=this._grid[_20].node,_22=_21.childNodes.length;
if(typeof (p)==undefined||p>_22){
p=_22;
}
if(this._disabled){
dojo.place(_1f.domNode,_21,p);
dojo.attr(_1f.domNode,"tabIndex","0");
}else{
if(!_1f.dragRestriction){
this._dragManager.addDragItem(_21,_1f.domNode,p,true);
}else{
dojo.place(_1f.domNode,_21,p);
dojo.attr(_1f.domNode,"tabIndex","0");
}
}
_1f.set("column",_20);
return _1f;
},removeChild:function(_23){
if(this._disabled){
this.inherited(arguments);
}else{
this._dragManager.removeDragItem(_23.domNode.parentNode,_23.domNode);
}
},addService:function(_24,_25,p){
dojo.deprecated("addService is deprecated.","Please use  instead.","Future");
this.addChild(_24,_25,p);
},addChild:function(_26,_27,p){
_26.domNode.id=_26.id;
dojox.layout.GridContainerLite.superclass.addChild.call(this,_26,0);
if(_27<0||_27==undefined){
_27=0;
}
if(p<=0){
p=0;
}
try{
return this._insertChild(_26,_27,p);
}
catch(e){
console.error("Unable to insert child in GridContainer",e);
}
return null;
},_setColWidthsAttr:function(_28){
this.colWidths=dojo.isString(_28)?_28.split(","):(dojo.isArray(_28)?_28:[_28]);
if(this._started){
this._updateColumnsWidth();
}
},_updateColumnsWidth:function(_29){
var _2a=this._grid.length;
var _2b=this.colWidths||[];
var _2c=[];
var _2d;
var _2e=0;
var i;
for(i=0;i<_2a;i++){
if(_2c.length<_2b.length){
_2e+=_2b[i]*1;
_2c.push(_2b[i]);
}else{
if(!_2d){
_2d=(100-_2e)/(this.nbZones-i);
if(_2d<0){
_2d=100/this.nbZones;
}
}
_2c.push(_2d);
_2e+=_2d*1;
}
}
if(_2e>100){
var _2f=100/_2e;
for(i=0;i<_2c.length;i++){
_2c[i]*=_2f;
}
}
for(i=0;i<_2a;i++){
this._grid[i].node.style.width=_2c[i]+"%";
}
},_selectFocus:function(_30){
if(this._disabled){
return;
}
var key=_30.keyCode,k=dojo.keys,_31=null,_32=dijit.getFocus(),_33=_32.node,m=this._dragManager,_34,i,j,r,_35,_36,_37;
if(_33==this.containerNode){
_36=this.gridNode.childNodes;
switch(key){
case k.DOWN_ARROW:
case k.RIGHT_ARROW:
_34=false;
for(i=0;i<_36.length;i++){
_35=_36[i].childNodes;
for(j=0;j<_35.length;j++){
_31=_35[j];
if(_31!=null&&_31.style.display!="none"){
dijit.focus(_31);
dojo.stopEvent(_30);
_34=true;
break;
}
}
if(_34){
break;
}
}
break;
case k.UP_ARROW:
case k.LEFT_ARROW:
_36=this.gridNode.childNodes;
_34=false;
for(i=_36.length-1;i>=0;i--){
_35=_36[i].childNodes;
for(j=_35.length;j>=0;j--){
_31=_35[j];
if(_31!=null&&_31.style.display!="none"){
dijit.focus(_31);
dojo.stopEvent(_30);
_34=true;
break;
}
}
if(_34){
break;
}
}
break;
}
}else{
if(_33.parentNode.parentNode==this.gridNode){
var _38=(key==k.UP_ARROW||key==k.LEFT_ARROW)?"lastChild":"firstChild";
var pos=(key==k.UP_ARROW||key==k.LEFT_ARROW)?"previousSibling":"nextSibling";
switch(key){
case k.UP_ARROW:
case k.DOWN_ARROW:
dojo.stopEvent(_30);
_34=false;
var _39=_33;
while(!_34){
_35=_39.parentNode.childNodes;
var num=0;
for(i=0;i<_35.length;i++){
if(_35[i].style.display!="none"){
num++;
}
if(num>1){
break;
}
}
if(num==1){
return;
}
if(_39[pos]==null){
_31=_39.parentNode[_38];
}else{
_31=_39[pos];
}
if(_31.style.display==="none"){
_39=_31;
}else{
_34=true;
}
}
if(_30.shiftKey){
var _3a=_33.parentNode;
for(i=0;i<this.gridNode.childNodes.length;i++){
if(_3a==this.gridNode.childNodes[i]){
break;
}
}
_35=this.gridNode.childNodes[i].childNodes;
for(j=0;j<_35.length;j++){
if(_31==_35[j]){
break;
}
}
if(dojo.isMoz||dojo.isWebKit){
i--;
}
_37=dijit.byNode(_33);
if(!_37.dragRestriction){
r=m.removeDragItem(_3a,_33);
this.addChild(_37,i,j);
dojo.attr(_33,"tabIndex","0");
dijit.focus(_33);
}else{
dojo.publish("/dojox/layout/gridContainer/moveRestriction",[this]);
}
}else{
dijit.focus(_31);
}
break;
case k.RIGHT_ARROW:
case k.LEFT_ARROW:
dojo.stopEvent(_30);
if(_30.shiftKey){
var z=0;
if(_33.parentNode[pos]==null){
if(dojo.isIE&&key==k.LEFT_ARROW){
z=this.gridNode.childNodes.length-1;
}
}else{
if(_33.parentNode[pos].nodeType==3){
z=this.gridNode.childNodes.length-2;
}else{
for(i=0;i<this.gridNode.childNodes.length;i++){
if(_33.parentNode[pos]==this.gridNode.childNodes[i]){
break;
}
z++;
}
if(dojo.isMoz||dojo.isWebKit){
z--;
}
}
}
_37=dijit.byNode(_33);
var _3b=_33.getAttribute("dndtype");
if(_3b==null){
if(_37&&_37.dndType){
_3b=_37.dndType.split(/\s*,\s*/);
}else{
_3b=["text"];
}
}else{
_3b=_3b.split(/\s*,\s*/);
}
var _3c=false;
for(i=0;i<this.acceptTypes.length;i++){
for(j=0;j<_3b.length;j++){
if(_3b[j]==this.acceptTypes[i]){
_3c=true;
break;
}
}
}
if(_3c&&!_37.dragRestriction){
var _3d=_33.parentNode,_3e=0;
if(k.LEFT_ARROW==key){
var t=z;
if(dojo.isMoz||dojo.isWebKit){
t=z+1;
}
_3e=this.gridNode.childNodes[t].childNodes.length;
}
r=m.removeDragItem(_3d,_33);
this.addChild(_37,z,_3e);
dojo.attr(r,"tabIndex","0");
dijit.focus(r);
}else{
dojo.publish("/dojox/layout/gridContainer/moveRestriction",[this]);
}
}else{
var _3f=_33.parentNode;
while(_31===null){
if(_3f[pos]!==null&&_3f[pos].nodeType!==3){
_3f=_3f[pos];
}else{
if(pos==="previousSibling"){
_3f=_3f.parentNode.childNodes[_3f.parentNode.childNodes.length-1];
}else{
_3f=(dojo.isIE)?_3f.parentNode.childNodes[0]:_3f.parentNode.childNodes[1];
}
}
_31=_3f[_38];
if(_31&&_31.style.display=="none"){
_35=_31.parentNode.childNodes;
var _40=null;
if(pos=="previousSibling"){
for(i=_35.length-1;i>=0;i--){
if(_35[i].style.display!="none"){
_40=_35[i];
break;
}
}
}else{
for(i=0;i<_35.length;i++){
if(_35[i].style.display!="none"){
_40=_35[i];
break;
}
}
}
if(!_40){
_33=_31;
_3f=_33.parentNode;
_31=null;
}else{
_31=_40;
}
}
}
dijit.focus(_31);
}
break;
}
}
}
},destroy:function(){
var m=this._dragManager;
dojo.forEach(this._grid,function(_41){
m.unregister(_41.node);
});
this.inherited(arguments);
}});
dojo.extend(dijit._Widget,{column:"1",dragRestriction:false});
}
