/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.image.ThumbnailPicker"]){
dojo._hasResource["dojox.image.ThumbnailPicker"]=true;
dojo.provide("dojox.image.ThumbnailPicker");
dojo.experimental("dojox.image.ThumbnailPicker");
dojo.require("dojox.fx.scroll");
dojo.require("dojo.fx.easing");
dojo.require("dojo.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.declare("dojox.image.ThumbnailPicker",[dijit._Widget,dijit._Templated],{imageStore:null,request:null,size:500,thumbHeight:75,thumbWidth:100,useLoadNotifier:false,useHyperlink:false,hyperlinkTarget:"new",isClickable:true,isScrollable:true,isHorizontal:true,autoLoad:true,linkAttr:"link",imageThumbAttr:"imageUrlThumb",imageLargeAttr:"imageUrl",pageSize:20,titleAttr:"title",templateString:dojo.cache("dojox.image","resources/ThumbnailPicker.html","<div dojoAttachPoint=\"outerNode\" class=\"thumbOuter\">\n\t<div dojoAttachPoint=\"navPrev\" class=\"thumbNav thumbClickable\">\n\t  <img src=\"\" dojoAttachPoint=\"navPrevImg\"/>    \n\t</div>\n\t<div dojoAttachPoint=\"thumbScroller\" class=\"thumbScroller\">\n\t  <div dojoAttachPoint=\"thumbsNode\" class=\"thumbWrapper\"></div>\n\t</div>\n\t<div dojoAttachPoint=\"navNext\" class=\"thumbNav thumbClickable\">\n\t  <img src=\"\" dojoAttachPoint=\"navNextImg\"/>  \n\t</div>\n</div>\n"),_thumbs:[],_thumbIndex:0,_maxPhotos:0,_loadedImages:{},postCreate:function(){
this.widgetid=this.id;
this.inherited(arguments);
this.pageSize=Number(this.pageSize);
this._scrollerSize=this.size-(51*2);
var _1=this._sizeProperty=this.isHorizontal?"width":"height";
dojo.style(this.outerNode,"textAlign","center");
dojo.style(this.outerNode,_1,this.size+"px");
dojo.style(this.thumbScroller,_1,this._scrollerSize+"px");
if(this.useHyperlink){
dojo.subscribe(this.getClickTopicName(),this,function(_2){
var _3=_2.index;
var _4=this.imageStore.getValue(_2.data,this.linkAttr);
if(!_4){
return;
}
if(this.hyperlinkTarget=="new"){
window.open(_4);
}else{
window.location=_4;
}
});
}
if(this.isClickable){
dojo.addClass(this.thumbsNode,"thumbClickable");
}
this._totalSize=0;
this.init();
},init:function(){
if(this.isInitialized){
return false;
}
var _5=this.isHorizontal?"Horiz":"Vert";
dojo.addClass(this.navPrev,"prev"+_5);
dojo.addClass(this.navNext,"next"+_5);
dojo.addClass(this.thumbsNode,"thumb"+_5);
dojo.addClass(this.outerNode,"thumb"+_5);
dojo.attr(this.navNextImg,"src",this._blankGif);
dojo.attr(this.navPrevImg,"src",this._blankGif);
this.connect(this.navPrev,"onclick","_prev");
this.connect(this.navNext,"onclick","_next");
this.isInitialized=true;
if(this.isHorizontal){
this._offsetAttr="offsetLeft";
this._sizeAttr="offsetWidth";
this._scrollAttr="scrollLeft";
}else{
this._offsetAttr="offsetTop";
this._sizeAttr="offsetHeight";
this._scrollAttr="scrollTop";
}
this._updateNavControls();
if(this.imageStore&&this.request){
this._loadNextPage();
}
return true;
},getClickTopicName:function(){
return (this.widgetId||this.id)+"/select";
},getShowTopicName:function(){
return (this.widgetId||this.id)+"/show";
},setDataStore:function(_6,_7,_8){
this.reset();
this.request={query:{},start:_7.start||0,count:_7.count||10,onBegin:dojo.hitch(this,function(_9){
this._maxPhotos=_9;
})};
if(_7.query){
dojo.mixin(this.request.query,_7.query);
}
if(_8){
dojo.forEach(["imageThumbAttr","imageLargeAttr","linkAttr","titleAttr"],function(_a){
if(_8[_a]){
this[_a]=_8[_a];
}
},this);
}
this.request.start=0;
this.request.count=this.pageSize;
this.imageStore=_6;
this._loadInProgress=false;
if(!this.init()){
this._loadNextPage();
}
},reset:function(){
this._loadedImages={};
dojo.forEach(this._thumbs,function(_b){
if(_b&&_b.parentNode){
dojo.destroy(_b);
}
});
this._thumbs=[];
this.isInitialized=false;
this._noImages=true;
},isVisible:function(_c){
var _d=this._thumbs[_c];
if(!_d){
return false;
}
var _e=this.isHorizontal?"offsetLeft":"offsetTop";
var _f=this.isHorizontal?"offsetWidth":"offsetHeight";
var _10=this.isHorizontal?"scrollLeft":"scrollTop";
var _11=_d[_e]-this.thumbsNode[_e];
return (_11>=this.thumbScroller[_10]&&_11+_d[_f]<=this.thumbScroller[_10]+this._scrollerSize);
},resize:function(dim){
var _12=this.isHorizontal?"w":"h";
var _13=0;
if(this._thumbs.length>0&&dojo.marginBox(this._thumbs[0]).w==0){
return;
}
dojo.forEach(this._thumbs,dojo.hitch(this,function(_14){
var mb=dojo.marginBox(_14.firstChild);
var _15=mb[_12];
_13+=(Number(_15)+10);
if(this.useLoadNotifier&&mb.w>0){
dojo.style(_14.lastChild,"width",(mb.w-4)+"px");
}
dojo.style(_14,"width",mb.w+"px");
}));
dojo.style(this.thumbsNode,this._sizeProperty,_13+"px");
this._updateNavControls();
},_next:function(){
var pos=this.isHorizontal?"offsetLeft":"offsetTop";
var _16=this.isHorizontal?"offsetWidth":"offsetHeight";
var _17=this.thumbsNode[pos];
var _18=this._thumbs[this._thumbIndex];
var _19=_18[pos]-_17;
var _1a=-1,img;
for(var i=this._thumbIndex+1;i<this._thumbs.length;i++){
img=this._thumbs[i];
if(img[pos]-_17+img[_16]-_19>this._scrollerSize){
this._showThumbs(i);
return;
}
}
},_prev:function(){
if(this.thumbScroller[this.isHorizontal?"scrollLeft":"scrollTop"]==0){
return;
}
var pos=this.isHorizontal?"offsetLeft":"offsetTop";
var _1b=this.isHorizontal?"offsetWidth":"offsetHeight";
var _1c=this._thumbs[this._thumbIndex];
var _1d=_1c[pos]-this.thumbsNode[pos];
var _1e=-1,img;
for(var i=this._thumbIndex-1;i>-1;i--){
img=this._thumbs[i];
if(_1d-img[pos]>this._scrollerSize){
this._showThumbs(i+1);
return;
}
}
this._showThumbs(0);
},_checkLoad:function(img,_1f){
dojo.publish(this.getShowTopicName(),[{index:_1f}]);
this._updateNavControls();
this._loadingImages={};
this._thumbIndex=_1f;
if(this.thumbsNode.offsetWidth-img.offsetLeft<(this._scrollerSize*2)){
this._loadNextPage();
}
},_showThumbs:function(_20){
_20=Math.min(Math.max(_20,0),this._maxPhotos);
if(_20>=this._maxPhotos){
return;
}
var img=this._thumbs[_20];
if(!img){
return;
}
var _21=img.offsetLeft-this.thumbsNode.offsetLeft;
var top=img.offsetTop-this.thumbsNode.offsetTop;
var _22=this.isHorizontal?_21:top;
if((_22>=this.thumbScroller[this._scrollAttr])&&(_22+img[this._sizeAttr]<=this.thumbScroller[this._scrollAttr]+this._scrollerSize)){
return;
}
if(this.isScrollable){
var _23=this.isHorizontal?{x:_21,y:0}:{x:0,y:top};
dojox.fx.smoothScroll({target:_23,win:this.thumbScroller,duration:300,easing:dojo.fx.easing.easeOut,onEnd:dojo.hitch(this,"_checkLoad",img,_20)}).play(10);
}else{
if(this.isHorizontal){
this.thumbScroller.scrollLeft=_21;
}else{
this.thumbScroller.scrollTop=top;
}
this._checkLoad(img,_20);
}
},markImageLoaded:function(_24){
var _25=dojo.byId("loadingDiv_"+this.widgetid+"_"+_24);
if(_25){
this._setThumbClass(_25,"thumbLoaded");
}
this._loadedImages[_24]=true;
},_setThumbClass:function(_26,_27){
if(!this.autoLoad){
return;
}
dojo.addClass(_26,_27);
},_loadNextPage:function(){
if(this._loadInProgress){
return;
}
this._loadInProgress=true;
var _28=this.request.start+(this._noImages?0:this.pageSize);
var pos=_28;
while(pos<this._thumbs.length&&this._thumbs[pos]){
pos++;
}
var _29=this.imageStore;
var _2a=function(_2b,_2c){
if(_29!=this.imageStore){
return;
}
if(_2b&&_2b.length){
var _2d=0;
var _2e=dojo.hitch(this,function(){
if(_2d>=_2b.length){
this._loadInProgress=false;
return;
}
var _2f=_2d++;
this._loadImage(_2b[_2f],pos+_2f,_2e);
});
_2e();
this._updateNavControls();
}else{
this._loadInProgress=false;
}
};
var _30=function(){
this._loadInProgress=false;
};
this.request.onComplete=dojo.hitch(this,_2a);
this.request.onError=dojo.hitch(this,_30);
this.request.start=_28;
this._noImages=false;
this.imageStore.fetch(this.request);
},_loadImage:function(_31,_32,_33){
var _34=this.imageStore;
var url=_34.getValue(_31,this.imageThumbAttr);
var _35=dojo.create("div",{id:"img_"+this.widgetid+"_"+_32});
var img=dojo.create("img",{},_35);
img._index=_32;
img._data=_31;
this._thumbs[_32]=_35;
var _36;
if(this.useLoadNotifier){
_36=dojo.create("div",{id:"loadingDiv_"+this.widgetid+"_"+_32},_35);
this._setThumbClass(_36,this._loadedImages[_32]?"thumbLoaded":"thumbNotifier");
}
var _37=dojo.marginBox(this.thumbsNode);
var _38;
var _39;
if(this.isHorizontal){
_38=this.thumbWidth;
_39="w";
}else{
_38=this.thumbHeight;
_39="h";
}
_37=_37[_39];
var sl=this.thumbScroller.scrollLeft,st=this.thumbScroller.scrollTop;
dojo.style(this.thumbsNode,this._sizeProperty,(_37+_38+20)+"px");
this.thumbScroller.scrollLeft=sl;
this.thumbScroller.scrollTop=st;
this.thumbsNode.appendChild(_35);
dojo.connect(img,"onload",this,dojo.hitch(this,function(){
if(_34!=this.imageStore){
return false;
}
this.resize();
setTimeout(_33,0);
return false;
}));
dojo.connect(img,"onclick",this,function(evt){
dojo.publish(this.getClickTopicName(),[{index:evt.target._index,data:evt.target._data,url:img.getAttribute("src"),largeUrl:this.imageStore.getValue(_31,this.imageLargeAttr),title:this.imageStore.getValue(_31,this.titleAttr),link:this.imageStore.getValue(_31,this.linkAttr)}]);
return false;
});
dojo.addClass(img,"imageGalleryThumb");
img.setAttribute("src",url);
var _3a=this.imageStore.getValue(_31,this.titleAttr);
if(_3a){
img.setAttribute("title",_3a);
}
this._updateNavControls();
},_updateNavControls:function(){
var _3b=[];
var _3c=function(_3d,add){
var fn=add?"addClass":"removeClass";
dojo[fn](_3d,"enabled");
dojo[fn](_3d,"thumbClickable");
};
var pos=this.isHorizontal?"scrollLeft":"scrollTop";
var _3e=this.isHorizontal?"offsetWidth":"offsetHeight";
_3c(this.navPrev,(this.thumbScroller[pos]>0));
var _3f=this._thumbs[this._thumbs.length-1];
var _40=(this.thumbScroller[pos]+this._scrollerSize<this.thumbsNode[_3e]);
_3c(this.navNext,_40);
}});
}
