/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._Scroller"]){
dojo._hasResource["dojox.grid._Scroller"]=true;
dojo.provide("dojox.grid._Scroller");
(function(){
var _1=function(_2){
var i=0,n,p=_2.parentNode;
while((n=p.childNodes[i++])){
if(n==_2){
return i-1;
}
}
return -1;
};
var _3=function(_4){
if(!_4){
return;
}
var _5=function(_6){
return _6.domNode&&dojo.isDescendant(_6.domNode,_4,true);
};
var ws=dijit.registry.filter(_5);
for(var i=0,w;(w=ws[i]);i++){
w.destroy();
}
delete ws;
};
var _7=function(_8){
var _9=dojo.byId(_8);
return (_9&&_9.tagName?_9.tagName.toLowerCase():"");
};
var _a=function(_b,_c){
var _d=[];
var i=0,n;
while((n=_b.childNodes[i])){
i++;
if(_7(n)==_c){
_d.push(n);
}
}
return _d;
};
var _e=function(_f){
return _a(_f,"div");
};
dojo.declare("dojox.grid._Scroller",null,{constructor:function(_10){
this.setContentNodes(_10);
this.pageHeights=[];
this.pageNodes=[];
this.stack=[];
},rowCount:0,defaultRowHeight:32,keepRows:100,contentNode:null,scrollboxNode:null,defaultPageHeight:0,keepPages:10,pageCount:0,windowHeight:0,firstVisibleRow:0,lastVisibleRow:0,averageRowHeight:0,page:0,pageTop:0,init:function(_11,_12,_13){
switch(arguments.length){
case 3:
this.rowsPerPage=_13;
case 2:
this.keepRows=_12;
case 1:
this.rowCount=_11;
default:
break;
}
this.defaultPageHeight=this.defaultRowHeight*this.rowsPerPage;
this.pageCount=this._getPageCount(this.rowCount,this.rowsPerPage);
this.setKeepInfo(this.keepRows);
this.invalidate();
if(this.scrollboxNode){
this.scrollboxNode.scrollTop=0;
this.scroll(0);
this.scrollboxNode.onscroll=dojo.hitch(this,"onscroll");
}
},_getPageCount:function(_14,_15){
return _14?(Math.ceil(_14/_15)||1):0;
},destroy:function(){
this.invalidateNodes();
delete this.contentNodes;
delete this.contentNode;
delete this.scrollboxNode;
},setKeepInfo:function(_16){
this.keepRows=_16;
this.keepPages=!this.keepRows?this.keepPages:Math.max(Math.ceil(this.keepRows/this.rowsPerPage),2);
},setContentNodes:function(_17){
this.contentNodes=_17;
this.colCount=(this.contentNodes?this.contentNodes.length:0);
this.pageNodes=[];
for(var i=0;i<this.colCount;i++){
this.pageNodes[i]=[];
}
},getDefaultNodes:function(){
return this.pageNodes[0]||[];
},invalidate:function(){
this._invalidating=true;
this.invalidateNodes();
this.pageHeights=[];
this.height=(this.pageCount?(this.pageCount-1)*this.defaultPageHeight+this.calcLastPageHeight():0);
this.resize();
this._invalidating=false;
},updateRowCount:function(_18){
this.invalidateNodes();
this.rowCount=_18;
var _19=this.pageCount;
if(_19===0){
this.height=1;
}
this.pageCount=this._getPageCount(this.rowCount,this.rowsPerPage);
if(this.pageCount<_19){
for(var i=_19-1;i>=this.pageCount;i--){
this.height-=this.getPageHeight(i);
delete this.pageHeights[i];
}
}else{
if(this.pageCount>_19){
this.height+=this.defaultPageHeight*(this.pageCount-_19-1)+this.calcLastPageHeight();
}
}
this.resize();
},pageExists:function(_1a){
return Boolean(this.getDefaultPageNode(_1a));
},measurePage:function(_1b){
if(this.grid.rowHeight){
var _1c=this.grid.rowHeight+1;
return ((_1b+1)*this.rowsPerPage>this.rowCount?this.rowCount-_1b*this.rowsPerPage:this.rowsPerPage)*_1c;
}
var n=this.getDefaultPageNode(_1b);
return (n&&n.innerHTML)?n.offsetHeight:undefined;
},positionPage:function(_1d,_1e){
for(var i=0;i<this.colCount;i++){
this.pageNodes[i][_1d].style.top=_1e+"px";
}
},repositionPages:function(_1f){
var _20=this.getDefaultNodes();
var _21=0;
for(var i=0;i<this.stack.length;i++){
_21=Math.max(this.stack[i],_21);
}
var n=_20[_1f];
var y=(n?this.getPageNodePosition(n)+this.getPageHeight(_1f):0);
for(var p=_1f+1;p<=_21;p++){
n=_20[p];
if(n){
if(this.getPageNodePosition(n)==y){
return;
}
this.positionPage(p,y);
}
y+=this.getPageHeight(p);
}
},installPage:function(_22){
for(var i=0;i<this.colCount;i++){
this.contentNodes[i].appendChild(this.pageNodes[i][_22]);
}
},preparePage:function(_23,_24){
var p=(_24?this.popPage():null);
for(var i=0;i<this.colCount;i++){
var _25=this.pageNodes[i];
var _26=(p===null?this.createPageNode():this.invalidatePageNode(p,_25));
_26.pageIndex=_23;
_25[_23]=_26;
}
},renderPage:function(_27){
var _28=[];
var i,j;
for(i=0;i<this.colCount;i++){
_28[i]=this.pageNodes[i][_27];
}
for(i=0,j=_27*this.rowsPerPage;(i<this.rowsPerPage)&&(j<this.rowCount);i++,j++){
this.renderRow(j,_28);
}
},removePage:function(_29){
for(var i=0,j=_29*this.rowsPerPage;i<this.rowsPerPage;i++,j++){
this.removeRow(j);
}
},destroyPage:function(_2a){
for(var i=0;i<this.colCount;i++){
var n=this.invalidatePageNode(_2a,this.pageNodes[i]);
if(n){
dojo.destroy(n);
}
}
},pacify:function(_2b){
},pacifying:false,pacifyTicks:200,setPacifying:function(_2c){
if(this.pacifying!=_2c){
this.pacifying=_2c;
this.pacify(this.pacifying);
}
},startPacify:function(){
this.startPacifyTicks=new Date().getTime();
},doPacify:function(){
var _2d=(new Date().getTime()-this.startPacifyTicks)>this.pacifyTicks;
this.setPacifying(true);
this.startPacify();
return _2d;
},endPacify:function(){
this.setPacifying(false);
},resize:function(){
if(this.scrollboxNode){
this.windowHeight=this.scrollboxNode.clientHeight;
}
for(var i=0;i<this.colCount;i++){
dojox.grid.util.setStyleHeightPx(this.contentNodes[i],Math.max(1,this.height));
}
var _2e=(!this._invalidating);
if(!_2e){
var ah=this.grid.get("autoHeight");
if(typeof ah=="number"&&ah<=Math.min(this.rowsPerPage,this.rowCount)){
_2e=true;
}
}
if(_2e){
this.needPage(this.page,this.pageTop);
}
var _2f=(this.page<this.pageCount-1)?this.rowsPerPage:((this.rowCount%this.rowsPerPage)||this.rowsPerPage);
var _30=this.getPageHeight(this.page);
this.averageRowHeight=(_30>0&&_2f>0)?(_30/_2f):0;
},calcLastPageHeight:function(){
if(!this.pageCount){
return 0;
}
var _31=this.pageCount-1;
var _32=((this.rowCount%this.rowsPerPage)||(this.rowsPerPage))*this.defaultRowHeight;
this.pageHeights[_31]=_32;
return _32;
},updateContentHeight:function(_33){
this.height+=_33;
this.resize();
},updatePageHeight:function(_34,_35,_36){
if(this.pageExists(_34)){
var oh=this.getPageHeight(_34);
var h=(this.measurePage(_34));
if(h===undefined){
h=oh;
}
this.pageHeights[_34]=h;
if(oh!=h){
this.updateContentHeight(h-oh);
var ah=this.grid.get("autoHeight");
if((typeof ah=="number"&&ah>this.rowCount)||(ah===true&&!_35)){
if(!_36){
this.grid.sizeChange();
}else{
var ns=this.grid.viewsNode.style;
ns.height=parseInt(ns.height)+h-oh+"px";
this.repositionPages(_34);
}
}else{
this.repositionPages(_34);
}
}
return h;
}
return 0;
},rowHeightChanged:function(_37,_38){
this.updatePageHeight(Math.floor(_37/this.rowsPerPage),false,_38);
},invalidateNodes:function(){
while(this.stack.length){
this.destroyPage(this.popPage());
}
},createPageNode:function(){
var p=document.createElement("div");
dojo.attr(p,"role","presentation");
p.style.position="absolute";
p.style[dojo._isBodyLtr()?"left":"right"]="0";
return p;
},getPageHeight:function(_39){
var ph=this.pageHeights[_39];
return (ph!==undefined?ph:this.defaultPageHeight);
},pushPage:function(_3a){
return this.stack.push(_3a);
},popPage:function(){
return this.stack.shift();
},findPage:function(_3b){
var i=0,h=0;
for(var ph=0;i<this.pageCount;i++,h+=ph){
ph=this.getPageHeight(i);
if(h+ph>=_3b){
break;
}
}
this.page=i;
this.pageTop=h;
},buildPage:function(_3c,_3d,_3e){
this.preparePage(_3c,_3d);
this.positionPage(_3c,_3e);
this.installPage(_3c);
this.renderPage(_3c);
this.pushPage(_3c);
},needPage:function(_3f,_40){
var h=this.getPageHeight(_3f),oh=h;
if(!this.pageExists(_3f)){
this.buildPage(_3f,(!this.grid._autoHeight&&this.keepPages&&(this.stack.length>=this.keepPages)),_40);
h=this.updatePageHeight(_3f,true);
}else{
this.positionPage(_3f,_40);
}
return h;
},onscroll:function(){
this.scroll(this.scrollboxNode.scrollTop);
},scroll:function(_41){
this.grid.scrollTop=_41;
if(this.colCount){
this.startPacify();
this.findPage(_41);
var h=this.height;
var b=this.getScrollBottom(_41);
for(var p=this.page,y=this.pageTop;(p<this.pageCount)&&((b<0)||(y<b));p++){
y+=this.needPage(p,y);
}
this.firstVisibleRow=this.getFirstVisibleRow(this.page,this.pageTop,_41);
this.lastVisibleRow=this.getLastVisibleRow(p-1,y,b);
if(h!=this.height){
this.repositionPages(p-1);
}
this.endPacify();
}
},getScrollBottom:function(_42){
return (this.windowHeight>=0?_42+this.windowHeight:-1);
},processNodeEvent:function(e,_43){
var t=e.target;
while(t&&(t!=_43)&&t.parentNode&&(t.parentNode.parentNode!=_43)){
t=t.parentNode;
}
if(!t||!t.parentNode||(t.parentNode.parentNode!=_43)){
return false;
}
var _44=t.parentNode;
e.topRowIndex=_44.pageIndex*this.rowsPerPage;
e.rowIndex=e.topRowIndex+_1(t);
e.rowTarget=t;
return true;
},processEvent:function(e){
return this.processNodeEvent(e,this.contentNode);
},renderRow:function(_45,_46){
},removeRow:function(_47){
},getDefaultPageNode:function(_48){
return this.getDefaultNodes()[_48];
},positionPageNode:function(_49,_4a){
},getPageNodePosition:function(_4b){
return _4b.offsetTop;
},invalidatePageNode:function(_4c,_4d){
var p=_4d[_4c];
if(p){
delete _4d[_4c];
this.removePage(_4c,p);
_3(p);
p.innerHTML="";
}
return p;
},getPageRow:function(_4e){
return _4e*this.rowsPerPage;
},getLastPageRow:function(_4f){
return Math.min(this.rowCount,this.getPageRow(_4f+1))-1;
},getFirstVisibleRow:function(_50,_51,_52){
if(!this.pageExists(_50)){
return 0;
}
var row=this.getPageRow(_50);
var _53=this.getDefaultNodes();
var _54=_e(_53[_50]);
for(var i=0,l=_54.length;i<l&&_51<_52;i++,row++){
_51+=_54[i].offsetHeight;
}
return (row?row-1:row);
},getLastVisibleRow:function(_55,_56,_57){
if(!this.pageExists(_55)){
return 0;
}
var _58=this.getDefaultNodes();
var row=this.getLastPageRow(_55);
var _59=_e(_58[_55]);
for(var i=_59.length-1;i>=0&&_56>_57;i--,row--){
_56-=_59[i].offsetHeight;
}
return row+1;
},findTopRow:function(_5a){
var _5b=this.getDefaultNodes();
var _5c=_e(_5b[this.page]);
for(var i=0,l=_5c.length,t=this.pageTop,h;i<l;i++){
h=_5c[i].offsetHeight;
t+=h;
if(t>=_5a){
this.offset=h-(t-_5a);
return i+this.page*this.rowsPerPage;
}
}
return -1;
},findScrollTop:function(_5d){
var _5e=Math.floor(_5d/this.rowsPerPage);
var t=0;
var i,l;
for(i=0;i<_5e;i++){
t+=this.getPageHeight(i);
}
this.pageTop=t;
this.page=_5e;
this.needPage(_5e,this.pageTop);
var _5f=this.getDefaultNodes();
var _60=_e(_5f[_5e]);
var r=_5d-this.rowsPerPage*_5e;
for(i=0,l=_60.length;i<l&&i<r;i++){
t+=_60[i].offsetHeight;
}
return t;
},dummy:0});
})();
}
