/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.mobile.app.ImageThumbView"]){
dojo._hasResource["dojox.mobile.app.ImageThumbView"]=true;
dojo.provide("dojox.mobile.app.ImageThumbView");
dojo.experimental("dojox.mobile.app.ImageThumbView");
dojo.require("dijit._WidgetBase");
dojo.require("dojo.string");
dojo.declare("dojox.mobile.app.ImageThumbView",dijit._WidgetBase,{items:[],urlParam:"url",labelParam:null,itemTemplate:"<div class=\"mblThumbInner\">"+"<div class=\"mblThumbOverlay\"></div>"+"<div class=\"mblThumbMask\">"+"<div class=\"mblThumbSrc\" style=\"background-image:url(${url})\"></div>"+"</div>"+"</div>",minPadding:4,maxPerRow:3,maxRows:-1,baseClass:"mblImageThumbView",thumbSize:"medium",animationEnabled:true,selectedIndex:-1,cache:null,cacheMustMatch:false,clickEvent:"onclick",cacheBust:false,disableHide:false,constructor:function(_1,_2){
},postCreate:function(){
this.inherited(arguments);
var _3=this;
var _4="mblThumbHover";
this.addThumb=dojo.hitch(this,this.addThumb);
this.handleImgLoad=dojo.hitch(this,this.handleImgLoad);
this.hideCached=dojo.hitch(this,this.hideCached);
this._onLoadImages={};
this.cache=[];
this.visibleImages=[];
this._cacheCounter=0;
this.connect(this.domNode,this.clickEvent,function(_5){
var _6=_3._getItemNodeFromEvent(_5);
if(_6&&!_6._cached){
_3.onSelect(_6._item,_6._index,_3.items);
dojo.query(".selected",this.domNode).removeClass("selected");
dojo.addClass(_6,"selected");
}
});
dojo.addClass(this.domNode,this.thumbSize);
this.resize();
this.render();
},onSelect:function(_7,_8,_9){
},_setAnimationEnabledAttr:function(_a){
this.animationEnabled=_a;
dojo[_a?"addClass":"removeClass"](this.domNode,"animated");
},_setItemsAttr:function(_b){
this.items=_b||[];
var _c={};
var i;
for(i=0;i<this.items.length;i++){
_c[this.items[i][this.urlParam]]=1;
}
var _d=[];
for(var _e in this._onLoadImages){
if(!_c[_e]&&this._onLoadImages[_e]._conn){
dojo.disconnect(this._onLoadImages[_e]._conn);
this._onLoadImages[_e].src=null;
_d.push(_e);
}
}
for(i=0;i<_d.length;i++){
delete this._onLoadImages[_e];
}
this.render();
},_getItemNode:function(_f){
while(_f&&!dojo.hasClass(_f,"mblThumb")&&_f!=this.domNode){
_f=_f.parentNode;
}
return (_f==this.domNode)?null:_f;
},_getItemNodeFromEvent:function(_10){
if(_10.touches&&_10.touches.length>0){
_10=_10.touches[0];
}
return this._getItemNode(_10.target);
},resize:function(){
this._thumbSize=null;
this._size=dojo.contentBox(this.domNode);
this.disableHide=true;
this.render();
this.disableHide=false;
},hideCached:function(){
for(var i=0;i<this.cache.length;i++){
if(this.cache[i]){
dojo.style(this.cache[i],"display","none");
}
}
},render:function(){
var i;
var url;
var _11;
var _12;
while(this.visibleImages&&this.visibleImages.length>0){
_12=this.visibleImages.pop();
this.cache.push(_12);
if(!this.disableHide){
dojo.addClass(_12,"hidden");
}
_12._cached=true;
}
if(this.cache&&this.cache.length>0){
setTimeout(this.hideCached,1000);
}
if(!this.items||this.items.length==0){
return;
}
for(i=0;i<this.items.length;i++){
_11=this.items[i];
url=(dojo.isString(_11)?_11:_11[this.urlParam]);
this.addThumb(_11,url,i);
if(this.maxRows>0&&(i+1)/this.maxPerRow>=this.maxRows){
break;
}
}
if(!this._thumbSize){
return;
}
var _13=0;
var row=-1;
var _14=this._thumbSize.w+(this.padding*2);
var _15=this._thumbSize.h+(this.padding*2);
var _16=this.thumbNodes=dojo.query(".mblThumb",this.domNode);
var pos=0;
_16=this.visibleImages;
for(i=0;i<_16.length;i++){
if(_16[i]._cached){
continue;
}
if(pos%this.maxPerRow==0){
row++;
}
_13=pos%this.maxPerRow;
this.place(_16[i],(_13*_14)+this.padding,(row*_15)+this.padding);
if(!_16[i]._loading){
dojo.removeClass(_16[i],"hidden");
}
if(pos==this.selectedIndex){
dojo[pos==this.selectedIndex?"addClass":"removeClass"](_16[i],"selected");
}
pos++;
}
var _17=Math.ceil(pos/this.maxPerRow);
this._numRows=_17;
this.setContainerHeight((_17*(this._thumbSize.h+this.padding*2)));
},setContainerHeight:function(_18){
dojo.style(this.domNode,"height",_18+"px");
},addThumb:function(_19,url,_1a){
var _1b;
var _1c=false;
if(this.cache.length>0){
var _1d=false;
for(var i=0;i<this.cache.length;i++){
if(this.cache[i]._url==url){
_1b=this.cache.splice(i,1)[0];
_1d=true;
break;
}
}
if(!_1b&&!this.cacheMustMatch){
_1b=this.cache.pop();
dojo.removeClass(_1b,"selected");
}else{
_1c=true;
}
}
if(!_1b){
_1b=dojo.create("div",{"class":"mblThumb hidden",innerHTML:dojo.string.substitute(this.itemTemplate,{url:url},null,this)},this.domNode);
}
if(this.labelParam){
var _1e=dojo.query(".mblThumbLabel",_1b)[0];
if(!_1e){
_1e=dojo.create("div",{"class":"mblThumbLabel"},_1b);
}
_1e.innerHTML=_19[this.labelParam]||"";
}
dojo.style(_1b,"display","");
if(!this.disableHide){
dojo.addClass(_1b,"hidden");
}
if(!_1c){
var _1f=dojo.create("img",{});
_1f._thumbDiv=_1b;
_1f._conn=dojo.connect(_1f,"onload",this.handleImgLoad);
_1f._url=url;
_1b._loading=true;
this._onLoadImages[url]=_1f;
if(_1f){
_1f.src=url;
}
}
this.visibleImages.push(_1b);
_1b._index=_1a;
_1b._item=_19;
_1b._url=url;
_1b._cached=false;
if(!this._thumbSize){
this._thumbSize=dojo.marginBox(_1b);
if(this._thumbSize.h==0){
this._thumbSize.h=100;
this._thumbSize.w=100;
}
if(this.labelParam){
this._thumbSize.h+=8;
}
this.calcPadding();
}
},handleImgLoad:function(_20){
var img=_20.target;
dojo.disconnect(img._conn);
dojo.removeClass(img._thumbDiv,"hidden");
img._thumbDiv._loading=false;
img._conn=null;
var url=img._url;
if(this.cacheBust){
url+=(url.indexOf("?")>-1?"&":"?")+"cacheBust="+(new Date()).getTime()+"_"+(this._cacheCounter++);
}
dojo.query(".mblThumbSrc",img._thumbDiv).style("backgroundImage","url("+url+")");
delete this._onLoadImages[img._url];
},calcPadding:function(){
var _21=this._size.w;
var _22=this._thumbSize.w;
var _23=_22+this.minPadding;
this.maxPerRow=Math.floor(_21/_23);
this.padding=Math.floor((_21-(_22*this.maxPerRow))/(this.maxPerRow*2));
},place:function(_24,x,y){
dojo.style(_24,{"-webkit-transform":"translate("+x+"px,"+y+"px)"});
},destroy:function(){
var img;
var _25=0;
for(var url in this._onLoadImages){
img=this._onLoadImages[url];
if(img){
img.src=null;
_25++;
}
}
this.inherited(arguments);
}});
}
