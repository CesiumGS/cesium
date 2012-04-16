/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.grid._ViewManager"]){
dojo._hasResource["dojox.grid._ViewManager"]=true;
dojo.provide("dojox.grid._ViewManager");
dojo.declare("dojox.grid._ViewManager",null,{constructor:function(_1){
this.grid=_1;
},defaultWidth:200,views:[],resize:function(){
this.onEach("resize");
},render:function(){
this.onEach("render");
},addView:function(_2){
_2.idx=this.views.length;
this.views.push(_2);
},destroyViews:function(){
for(var i=0,v;v=this.views[i];i++){
v.destroy();
}
this.views=[];
},getContentNodes:function(){
var _3=[];
for(var i=0,v;v=this.views[i];i++){
_3.push(v.contentNode);
}
return _3;
},forEach:function(_4){
for(var i=0,v;v=this.views[i];i++){
_4(v,i);
}
},onEach:function(_5,_6){
_6=_6||[];
for(var i=0,v;v=this.views[i];i++){
if(_5 in v){
v[_5].apply(v,_6);
}
}
},normalizeHeaderNodeHeight:function(){
var _7=[];
for(var i=0,v;(v=this.views[i]);i++){
if(v.headerContentNode.firstChild){
_7.push(v.headerContentNode);
}
}
this.normalizeRowNodeHeights(_7);
},normalizeRowNodeHeights:function(_8){
var h=0;
var _9=[];
if(this.grid.rowHeight){
h=this.grid.rowHeight;
}else{
if(_8.length<=1){
return;
}
for(var i=0,n;(n=_8[i]);i++){
if(!dojo.hasClass(n,"dojoxGridNonNormalizedCell")){
_9[i]=n.firstChild.offsetHeight;
h=Math.max(h,_9[i]);
}
}
h=(h>=0?h:0);
if(dojo.isMoz&&h){
h++;
}
}
for(i=0;(n=_8[i]);i++){
if(_9[i]!=h){
n.firstChild.style.height=h+"px";
}
}
},resetHeaderNodeHeight:function(){
for(var i=0,v,n;(v=this.views[i]);i++){
n=v.headerContentNode.firstChild;
if(n){
n.style.height="";
}
}
},renormalizeRow:function(_a){
var _b=[];
for(var i=0,v,n;(v=this.views[i])&&(n=v.getRowNode(_a));i++){
n.firstChild.style.height="";
_b.push(n);
}
this.normalizeRowNodeHeights(_b);
},getViewWidth:function(_c){
return this.views[_c].getWidth()||this.defaultWidth;
},measureHeader:function(){
this.resetHeaderNodeHeight();
this.forEach(function(_d){
_d.headerContentNode.style.height="";
});
var h=0;
this.forEach(function(_e){
h=Math.max(_e.headerNode.offsetHeight,h);
});
return h;
},measureContent:function(){
var h=0;
this.forEach(function(_f){
h=Math.max(_f.domNode.offsetHeight,h);
});
return h;
},findClient:function(_10){
var c=this.grid.elasticView||-1;
if(c<0){
for(var i=1,v;(v=this.views[i]);i++){
if(v.viewWidth){
for(i=1;(v=this.views[i]);i++){
if(!v.viewWidth){
c=i;
break;
}
}
break;
}
}
}
if(c<0){
c=Math.floor(this.views.length/2);
}
return c;
},arrange:function(l,w){
var i,v,vw,len=this.views.length;
var c=(w<=0?len:this.findClient());
var _11=function(v,l){
var ds=v.domNode.style;
var hs=v.headerNode.style;
if(!dojo._isBodyLtr()){
ds.right=l+"px";
if(dojo.isMoz){
hs.right=l+v.getScrollbarWidth()+"px";
hs.width=parseInt(hs.width,10)-v.getScrollbarWidth()+"px";
}else{
hs.right=l+"px";
}
}else{
ds.left=l+"px";
hs.left=l+"px";
}
ds.top=0+"px";
hs.top=0;
};
for(i=0;(v=this.views[i])&&(i<c);i++){
vw=this.getViewWidth(i);
v.setSize(vw,0);
_11(v,l);
if(v.headerContentNode&&v.headerContentNode.firstChild){
vw=v.getColumnsWidth()+v.getScrollbarWidth();
}else{
vw=v.domNode.offsetWidth;
}
l+=vw;
}
i++;
var r=w;
for(var j=len-1;(v=this.views[j])&&(i<=j);j--){
vw=this.getViewWidth(j);
v.setSize(vw,0);
vw=v.domNode.offsetWidth;
r-=vw;
_11(v,r);
}
if(c<len){
v=this.views[c];
vw=Math.max(1,r-l);
v.setSize(vw+"px",0);
_11(v,l);
}
return l;
},renderRow:function(_12,_13,_14){
var _15=[];
for(var i=0,v,n,_16;(v=this.views[i])&&(n=_13[i]);i++){
_16=v.renderRow(_12);
n.appendChild(_16);
_15.push(_16);
}
if(!_14){
this.normalizeRowNodeHeights(_15);
}
},rowRemoved:function(_17){
this.onEach("rowRemoved",[_17]);
},updateRow:function(_18,_19){
for(var i=0,v;v=this.views[i];i++){
v.updateRow(_18);
}
if(!_19){
this.renormalizeRow(_18);
}
},updateRowStyles:function(_1a){
this.onEach("updateRowStyles",[_1a]);
},setScrollTop:function(_1b){
var top=_1b;
for(var i=0,v;v=this.views[i];i++){
top=v.setScrollTop(_1b);
if(dojo.isIE&&v.headerNode&&v.scrollboxNode){
v.headerNode.scrollLeft=v.scrollboxNode.scrollLeft;
}
}
return top;
},getFirstScrollingView:function(){
for(var i=0,v;(v=this.views[i]);i++){
if(v.hasHScrollbar()||v.hasVScrollbar()){
return v;
}
}
return null;
}});
}
