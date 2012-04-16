/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.layout.GridContainer"]){
dojo._hasResource["dojox.layout.GridContainer"]=true;
dojo.provide("dojox.layout.GridContainer");
dojo.require("dojox.layout.GridContainerLite");
dojo.declare("dojox.layout.GridContainer",dojox.layout.GridContainerLite,{hasResizableColumns:true,liveResizeColumns:false,minColWidth:20,minChildWidth:150,mode:"right",isRightFixed:false,isLeftFixed:false,startup:function(){
this.inherited(arguments);
if(this.hasResizableColumns){
for(var i=0;i<this._grid.length-1;i++){
this._createGrip(i);
}
if(!this.getParent()){
dojo.ready(dojo.hitch(this,"_placeGrips"));
}
}
},resizeChildAfterDrop:function(_1,_2,_3){
if(this.inherited(arguments)){
this._placeGrips();
}
},onShow:function(){
this.inherited(arguments);
this._placeGrips();
},resize:function(){
this.inherited(arguments);
if(this._isShown()&&this.hasResizableColumns){
this._placeGrips();
}
},_createGrip:function(_4){
var _5=this._grid[_4],_6=dojo.create("div",{"class":"gridContainerGrip"},this.domNode);
_5.grip=_6;
_5.gripHandler=[this.connect(_6,"onmouseover",function(e){
var _7=false;
for(var i=0;i<this._grid.length-1;i++){
if(dojo.hasClass(this._grid[i].grip,"gridContainerGripShow")){
_7=true;
break;
}
}
if(!_7){
dojo.removeClass(e.target,"gridContainerGrip");
dojo.addClass(e.target,"gridContainerGripShow");
}
})[0],this.connect(_6,"onmouseout",function(e){
if(!this._isResized){
dojo.removeClass(e.target,"gridContainerGripShow");
dojo.addClass(e.target,"gridContainerGrip");
}
})[0],this.connect(_6,"onmousedown","_resizeColumnOn")[0],this.connect(_6,"ondblclick","_onGripDbClick")[0]];
},_placeGrips:function(){
var _8,_9,_a=0,_b;
var _c=this.domNode.style.overflowY;
dojo.forEach(this._grid,function(_d){
if(_d.grip){
_b=_d.grip;
if(!_8){
_8=_b.offsetWidth/2;
}
_a+=dojo.marginBox(_d.node).w;
dojo.style(_b,"left",(_a-_8)+"px");
if(!_9){
_9=dojo.contentBox(this.gridNode).h;
}
if(_9>0){
dojo.style(_b,"height",_9+"px");
}
}
},this);
},_onGripDbClick:function(){
this._updateColumnsWidth(this._dragManager);
this.resize();
},_resizeColumnOn:function(e){
this._activeGrip=e.target;
this._initX=e.pageX;
e.preventDefault();
dojo.body().style.cursor="ew-resize";
this._isResized=true;
var _e=[];
var _f;
var i;
for(i=0;i<this._grid.length;i++){
_e[i]=dojo.contentBox(this._grid[i].node).w;
}
this._oldTabSize=_e;
for(i=0;i<this._grid.length;i++){
_f=this._grid[i];
if(this._activeGrip==_f.grip){
this._currentColumn=_f.node;
this._currentColumnWidth=_e[i];
this._nextColumn=this._grid[i+1].node;
this._nextColumnWidth=_e[i+1];
}
_f.node.style.width=_e[i]+"px";
}
var _10=function(_11,_12){
var _13=0;
var _14=0;
dojo.forEach(_11,function(_15){
if(_15.nodeType==1){
var _16=dojo.getComputedStyle(_15);
var _17=(dojo.isIE)?_12:parseInt(_16.minWidth);
_14=_17+parseInt(_16.marginLeft)+parseInt(_16.marginRight);
if(_13<_14){
_13=_14;
}
}
});
return _13;
};
var _18=_10(this._currentColumn.childNodes,this.minChildWidth);
var _19=_10(this._nextColumn.childNodes,this.minChildWidth);
var _1a=Math.round((dojo.marginBox(this.gridContainerTable).w*this.minColWidth)/100);
this._currentMinCol=_18;
this._nextMinCol=_19;
if(_1a>this._currentMinCol){
this._currentMinCol=_1a;
}
if(_1a>this._nextMinCol){
this._nextMinCol=_1a;
}
this._connectResizeColumnMove=dojo.connect(dojo.doc,"onmousemove",this,"_resizeColumnMove");
this._connectOnGripMouseUp=dojo.connect(dojo.doc,"onmouseup",this,"_onGripMouseUp");
},_onGripMouseUp:function(){
dojo.body().style.cursor="default";
dojo.disconnect(this._connectResizeColumnMove);
dojo.disconnect(this._connectOnGripMouseUp);
this._connectOnGripMouseUp=this._connectResizeColumnMove=null;
if(this._activeGrip){
dojo.removeClass(this._activeGrip,"gridContainerGripShow");
dojo.addClass(this._activeGrip,"gridContainerGrip");
}
this._isResized=false;
},_resizeColumnMove:function(e){
e.preventDefault();
if(!this._connectResizeColumnOff){
dojo.disconnect(this._connectOnGripMouseUp);
this._connectOnGripMouseUp=null;
this._connectResizeColumnOff=dojo.connect(dojo.doc,"onmouseup",this,"_resizeColumnOff");
}
var d=e.pageX-this._initX;
if(d==0){
return;
}
if(!(this._currentColumnWidth+d<this._currentMinCol||this._nextColumnWidth-d<this._nextMinCol)){
this._currentColumnWidth+=d;
this._nextColumnWidth-=d;
this._initX=e.pageX;
this._activeGrip.style.left=parseInt(this._activeGrip.style.left)+d+"px";
if(this.liveResizeColumns){
this._currentColumn.style["width"]=this._currentColumnWidth+"px";
this._nextColumn.style["width"]=this._nextColumnWidth+"px";
this.resize();
}
}
},_resizeColumnOff:function(e){
dojo.body().style.cursor="default";
dojo.disconnect(this._connectResizeColumnMove);
dojo.disconnect(this._connectResizeColumnOff);
this._connectResizeColumnOff=this._connectResizeColumnMove=null;
if(!this.liveResizeColumns){
this._currentColumn.style["width"]=this._currentColumnWidth+"px";
this._nextColumn.style["width"]=this._nextColumnWidth+"px";
}
var _1b=[],_1c=[],_1d=this.gridContainerTable.clientWidth,_1e,_1f=false,i;
for(i=0;i<this._grid.length;i++){
_1e=this._grid[i].node;
if(dojo.isIE){
_1b[i]=dojo.marginBox(_1e).w;
_1c[i]=dojo.contentBox(_1e).w;
}else{
_1b[i]=dojo.contentBox(_1e).w;
_1c=_1b;
}
}
for(i=0;i<_1c.length;i++){
if(_1c[i]!=this._oldTabSize[i]){
_1f=true;
break;
}
}
if(_1f){
var mul=dojo.isIE?100:10000;
for(i=0;i<this._grid.length;i++){
this._grid[i].node.style.width=Math.round((100*mul*_1b[i])/_1d)/mul+"%";
}
this.resize();
}
if(this._activeGrip){
dojo.removeClass(this._activeGrip,"gridContainerGripShow");
dojo.addClass(this._activeGrip,"gridContainerGrip");
}
this._isResized=false;
},setColumns:function(_20){
var z,j;
if(_20>0){
var _21=this._grid.length,_22=_21-_20;
if(_22>0){
var _23=[],_24,_25,end,_26;
if(this.mode=="right"){
end=(this.isLeftFixed&&_21>0)?1:0;
_25=(this.isRightFixed)?_21-2:_21-1;
for(z=_25;z>=end;z--){
_26=0;
_24=this._grid[z].node;
for(j=0;j<_24.childNodes.length;j++){
if(_24.childNodes[j].nodeType==1&&!(_24.childNodes[j].id=="")){
_26++;
break;
}
}
if(_26==0){
_23[_23.length]=z;
}
if(_23.length>=_22){
this._deleteColumn(_23);
break;
}
}
if(_23.length<_22){
dojo.publish("/dojox/layout/gridContainer/noEmptyColumn",[this]);
}
}else{
_25=(this.isLeftFixed&&_21>0)?1:0;
end=(this.isRightFixed)?_21-1:_21;
for(z=_25;z<end;z++){
_26=0;
_24=this._grid[z].node;
for(j=0;j<_24.childNodes.length;j++){
if(_24.childNodes[j].nodeType==1&&!(_24.childNodes[j].id=="")){
_26++;
break;
}
}
if(_26==0){
_23[_23.length]=z;
}
if(_23.length>=_22){
this._deleteColumn(_23);
break;
}
}
if(_23.length<_22){
dojo.publish("/dojox/layout/gridContainer/noEmptyColumn",[this]);
}
}
}else{
if(_22<0){
this._addColumn(Math.abs(_22));
}
}
if(this.hasResizableColumns){
this._placeGrips();
}
}
},_addColumn:function(_27){
var _28=this._grid,_29,_2a,_2b,_2c,_2d=(this.mode=="right"),_2e=this.acceptTypes.join(","),m=this._dragManager;
if(this.hasResizableColumns&&((!this.isRightFixed&&_2d)||(this.isLeftFixed&&!_2d&&this.nbZones==1))){
this._createGrip(_28.length-1);
}
for(var i=0;i<_27;i++){
_2a=dojo.create("td",{"class":"gridContainerZone dojoxDndArea","accept":_2e,"id":this.id+"_dz"+this.nbZones});
_2c=_28.length;
if(_2d){
if(this.isRightFixed){
_2b=_2c-1;
_28.splice(_2b,0,{"node":_28[_2b].node.parentNode.insertBefore(_2a,_28[_2b].node)});
}else{
_2b=_2c;
_28.push({"node":this.gridNode.appendChild(_2a)});
}
}else{
if(this.isLeftFixed){
_2b=(_2c==1)?0:1;
this._grid.splice(1,0,{"node":this._grid[_2b].node.parentNode.appendChild(_2a,this._grid[_2b].node)});
_2b=1;
}else{
_2b=_2c-this.nbZones;
this._grid.splice(_2b,0,{"node":_28[_2b].node.parentNode.insertBefore(_2a,_28[_2b].node)});
}
}
if(this.hasResizableColumns){
if((!_2d&&this.nbZones!=1)||(!_2d&&this.nbZones==1&&!this.isLeftFixed)||(_2d&&i<_27-1)||(_2d&&i==_27-1&&this.isRightFixed)){
this._createGrip(_2b);
}
}
m.registerByNode(_28[_2b].node);
this.nbZones++;
}
this._updateColumnsWidth(m);
},_deleteColumn:function(_2f){
var _30,_31,_32,_33=0,_34=_2f.length,m=this._dragManager;
for(var i=0;i<_34;i++){
_32=(this.mode=="right")?_2f[i]:_2f[i]-_33;
_31=this._grid[_32];
if(this.hasResizableColumns&&_31.grip){
dojo.forEach(_31.gripHandler,function(_35){
dojo.disconnect(_35);
});
dojo.destroy(this.domNode.removeChild(_31.grip));
_31.grip=null;
}
m.unregister(_31.node);
dojo.destroy(this.gridNode.removeChild(_31.node));
this._grid.splice(_32,1);
this.nbZones--;
_33++;
}
var _36=this._grid[this.nbZones-1];
if(_36.grip){
dojo.forEach(_36.gripHandler,dojo.disconnect);
dojo.destroy(this.domNode.removeChild(_36.grip));
_36.grip=null;
}
this._updateColumnsWidth(m);
},_updateColumnsWidth:function(_37){
this.inherited(arguments);
_37._dropMode.updateAreas(_37._areaList);
},destroy:function(){
dojo.unsubscribe(this._dropHandler);
this.inherited(arguments);
}});
}
