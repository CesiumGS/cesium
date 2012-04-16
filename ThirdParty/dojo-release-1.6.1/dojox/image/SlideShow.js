/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.image.SlideShow"]){
dojo._hasResource["dojox.image.SlideShow"]=true;
dojo.provide("dojox.image.SlideShow");
dojo.require("dojo.string");
dojo.require("dojo.fx");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.declare("dojox.image.SlideShow",[dijit._Widget,dijit._Templated],{imageHeight:375,imageWidth:500,title:"",titleTemplate:"${title} <span class=\"slideShowCounterText\">(${current} of ${total})</span>",noLink:false,loop:true,hasNav:true,images:[],pageSize:20,autoLoad:true,autoStart:false,fixedHeight:false,imageStore:null,linkAttr:"link",imageLargeAttr:"imageUrl",titleAttr:"title",slideshowInterval:3,templateString:dojo.cache("dojox.image","resources/SlideShow.html","<div dojoAttachPoint=\"outerNode\" class=\"slideShowWrapper\">\n\t<div style=\"position:relative;\" dojoAttachPoint=\"innerWrapper\">\n\t\t<div class=\"slideShowNav\" dojoAttachEvent=\"onclick: _handleClick\">\n\t\t\t<div class=\"dijitInline slideShowTitle\" dojoAttachPoint=\"titleNode\">${title}</div>\n\t\t</div>\n\t\t<div dojoAttachPoint=\"navNode\" class=\"slideShowCtrl\" dojoAttachEvent=\"onclick: _handleClick\">\n\t\t\t<span dojoAttachPoint=\"navPrev\" class=\"slideShowCtrlPrev\"></span>\n\t\t\t<span dojoAttachPoint=\"navPlay\" class=\"slideShowCtrlPlay\"></span>\n\t\t\t<span dojoAttachPoint=\"navNext\" class=\"slideShowCtrlNext\"></span>\n\t\t</div>\n\t\t<div dojoAttachPoint=\"largeNode\" class=\"slideShowImageWrapper\"></div>\t\t\n\t\t<div dojoAttachPoint=\"hiddenNode\" class=\"slideShowHidden\"></div>\n\t</div>\n</div>\n"),_imageCounter:0,_tmpImage:null,_request:null,postCreate:function(){
this.inherited(arguments);
var _1=document.createElement("img");
_1.setAttribute("width",this.imageWidth);
_1.setAttribute("height",this.imageHeight);
if(this.hasNav){
dojo.connect(this.outerNode,"onmouseover",this,function(_2){
try{
this._showNav();
}
catch(e){
}
});
dojo.connect(this.outerNode,"onmouseout",this,function(_3){
try{
this._hideNav(_3);
}
catch(e){
}
});
}
this.outerNode.style.width=this.imageWidth+"px";
_1.setAttribute("src",this._blankGif);
var _4=this;
this.largeNode.appendChild(_1);
this._tmpImage=this._currentImage=_1;
this._fitSize(true);
this._loadImage(0,dojo.hitch(this,"showImage",0));
this._calcNavDimensions();
},setDataStore:function(_5,_6,_7){
this.reset();
var _8=this;
this._request={query:{},start:_6.start||0,count:_6.count||this.pageSize,onBegin:function(_9,_a){
_8.maxPhotos=_9;
}};
if(_6.query){
dojo.mixin(this._request.query,_6.query);
}
if(_7){
dojo.forEach(["imageLargeAttr","linkAttr","titleAttr"],function(_b){
if(_7[_b]){
this[_b]=_7[_b];
}
},this);
}
var _c=function(_d){
_8.maxPhotos=_d.length;
_8._request.onComplete=null;
if(_8.autoStart){
_8.imageIndex=-1;
_8.toggleSlideShow();
}else{
_8.showImage(0);
}
};
this.imageStore=_5;
this._request.onComplete=_c;
this._request.start=0;
this.imageStore.fetch(this._request);
},reset:function(){
dojo.query("> *",this.largeNode).orphan();
this.largeNode.appendChild(this._tmpImage);
dojo.query("> *",this.hiddenNode).orphan();
dojo.forEach(this.images,function(_e){
if(_e&&_e.parentNode){
_e.parentNode.removeChild(_e);
}
});
this.images=[];
this.isInitialized=false;
this._imageCounter=0;
},isImageLoaded:function(_f){
return this.images&&this.images.length>_f&&this.images[_f];
},moveImageLoadingPointer:function(_10){
this._imageCounter=_10;
},destroy:function(){
if(this._slideId){
this._stop();
}
this.inherited(arguments);
},showNextImage:function(_11,_12){
if(_11&&this._timerCancelled){
return false;
}
if(this.imageIndex+1>=this.maxPhotos){
if(_11&&(this.loop||_12)){
this.imageIndex=-1;
}else{
if(this._slideId){
this._stop();
}
return false;
}
}
this.showImage(this.imageIndex+1,dojo.hitch(this,function(){
if(_11){
this._startTimer();
}
}));
return true;
},toggleSlideShow:function(){
if(this._slideId){
this._stop();
}else{
dojo.toggleClass(this.domNode,"slideShowPaused");
this._timerCancelled=false;
var idx=this.imageIndex;
if(idx<0||(this.images[idx]&&this.images[idx]._img.complete)){
var _13=this.showNextImage(true,true);
if(!_13){
this._stop();
}
}else{
var _14=dojo.subscribe(this.getShowTopicName(),dojo.hitch(this,function(_15){
setTimeout(dojo.hitch(this,function(){
if(_15.index==idx){
var _16=this.showNextImage(true,true);
if(!_16){
this._stop();
}
dojo.unsubscribe(_14);
}
}),this.slideshowInterval*1000);
}));
dojo.publish(this.getShowTopicName(),[{index:idx,title:"",url:""}]);
}
}
},getShowTopicName:function(){
return (this.widgetId||this.id)+"/imageShow";
},getLoadTopicName:function(){
return (this.widgetId?this.widgetId:this.id)+"/imageLoad";
},showImage:function(_17,_18){
if(!_18&&this._slideId){
this.toggleSlideShow();
}
var _19=this;
var _1a=this.largeNode.getElementsByTagName("div");
this.imageIndex=_17;
var _1b=function(){
if(_19.images[_17]){
while(_19.largeNode.firstChild){
_19.largeNode.removeChild(_19.largeNode.firstChild);
}
dojo.style(_19.images[_17],"opacity",0);
_19.largeNode.appendChild(_19.images[_17]);
_19._currentImage=_19.images[_17]._img;
_19._fitSize();
var _1c=function(a,b,c){
var img=_19.images[_17].firstChild;
if(img.tagName.toLowerCase()!="img"){
img=img.firstChild;
}
var _1d=img.getAttribute("title")||"";
if(_19._navShowing){
_19._showNav(true);
}
dojo.publish(_19.getShowTopicName(),[{index:_17,title:_1d,url:img.getAttribute("src")}]);
if(_18){
_18(a,b,c);
}
_19._setTitle(_1d);
};
dojo.fadeIn({node:_19.images[_17],duration:300,onEnd:_1c}).play();
}else{
_19._loadImage(_17,function(){
_19.showImage(_17,_18);
});
}
};
if(_1a&&_1a.length>0){
dojo.fadeOut({node:_1a[0],duration:300,onEnd:function(){
_19.hiddenNode.appendChild(_1a[0]);
_1b();
}}).play();
}else{
_1b();
}
},_fitSize:function(_1e){
if(!this.fixedHeight||_1e){
var _1f=(this._currentImage.height+(this.hasNav?20:0));
dojo.style(this.innerWrapper,"height",_1f+"px");
return;
}
dojo.style(this.largeNode,"paddingTop",this._getTopPadding()+"px");
},_getTopPadding:function(){
if(!this.fixedHeight){
return 0;
}
return (this.imageHeight-this._currentImage.height)/2;
},_loadNextImage:function(){
if(!this.autoLoad){
return;
}
while(this.images.length>=this._imageCounter&&this.images[this._imageCounter]){
this._imageCounter++;
}
this._loadImage(this._imageCounter);
},_loadImage:function(_20,_21){
if(this.images[_20]||!this._request){
return;
}
var _22=_20-(_20%(this._request.count||this.pageSize));
this._request.start=_22;
this._request.onComplete=function(_23){
var _24=_20-_22;
if(_23&&_23.length>_24){
_25(_23[_24]);
}else{
}
};
var _26=this;
var _27=this.imageStore;
var _25=function(_28){
var url=_26.imageStore.getValue(_28,_26.imageLargeAttr);
var img=new Image();
var div=dojo.create("div",{id:_26.id+"_imageDiv"+_20});
div._img=img;
var _29=_26.imageStore.getValue(_28,_26.linkAttr);
if(!_29||_26.noLink){
div.appendChild(img);
}else{
var a=dojo.create("a",{"href":_29,"target":"_blank"},div);
a.appendChild(img);
}
dojo.connect(img,"onload",function(){
if(_27!=_26.imageStore){
return;
}
_26._fitImage(img);
dojo.attr(div,{"width":_26.imageWidth,"height":_26.imageHeight});
dojo.publish(_26.getLoadTopicName(),[_20]);
setTimeout(function(){
_26._loadNextImage();
},1);
if(_21){
_21();
}
});
_26.hiddenNode.appendChild(div);
var _2a=dojo.create("div",{className:"slideShowTitle"},div);
_26.images[_20]=div;
dojo.attr(img,"src",url);
var _2b=_26.imageStore.getValue(_28,_26.titleAttr);
if(_2b){
dojo.attr(img,"title",_2b);
}
};
this.imageStore.fetch(this._request);
},_stop:function(){
if(this._slideId){
clearTimeout(this._slideId);
}
this._slideId=null;
this._timerCancelled=true;
dojo.removeClass(this.domNode,"slideShowPaused");
},_prev:function(){
if(this.imageIndex<1){
return;
}
this.showImage(this.imageIndex-1);
},_next:function(){
this.showNextImage();
},_startTimer:function(){
var id=this.id;
this._slideId=setTimeout(function(){
dijit.byId(id).showNextImage(true);
},this.slideshowInterval*1000);
},_calcNavDimensions:function(){
dojo.style(this.navNode,"position","absolute");
dojo.style(this.navNode,"top","-10000px");
dojo._setOpacity(this.navNode,1);
this.navPlay._size=dojo.marginBox(this.navPlay);
this.navPrev._size=dojo.marginBox(this.navPrev);
this.navNext._size=dojo.marginBox(this.navNext);
dojo._setOpacity(this.navNode,0);
dojo.style(this.navNode,{"position":"",top:""});
},_setTitle:function(_2c){
this.titleNode.innerHTML=dojo.string.substitute(this.titleTemplate,{title:_2c,current:1+this.imageIndex,total:this.maxPhotos||""});
},_fitImage:function(img){
var _2d=img.width;
var _2e=img.height;
if(_2d>this.imageWidth){
_2e=Math.floor(_2e*(this.imageWidth/_2d));
img.height=_2e;
img.width=_2d=this.imageWidth;
}
if(_2e>this.imageHeight){
_2d=Math.floor(_2d*(this.imageHeight/_2e));
img.height=this.imageHeight;
img.width=_2d;
}
},_handleClick:function(e){
switch(e.target){
case this.navNext:
this._next();
break;
case this.navPrev:
this._prev();
break;
case this.navPlay:
this.toggleSlideShow();
break;
}
},_showNav:function(_2f){
if(this._navShowing&&!_2f){
return;
}
dojo.style(this.navNode,"marginTop","0px");
var _30=dojo.style(this.navNode,"width")/2-this.navPlay._size.w/2-this.navPrev._size.w;
dojo.style(this.navPlay,"marginLeft",_30+"px");
var _31=dojo.marginBox(this.outerNode);
var _32=this._currentImage.height-this.navPlay._size.h-10+this._getTopPadding();
if(_32>this._currentImage.height){
_32+=10;
}
dojo[this.imageIndex<1?"addClass":"removeClass"](this.navPrev,"slideShowCtrlHide");
dojo[this.imageIndex+1>=this.maxPhotos?"addClass":"removeClass"](this.navNext,"slideShowCtrlHide");
var _33=this;
if(this._navAnim){
this._navAnim.stop();
}
if(this._navShowing){
return;
}
this._navAnim=dojo.fadeIn({node:this.navNode,duration:300,onEnd:function(){
_33._navAnim=null;
}});
this._navAnim.play();
this._navShowing=true;
},_hideNav:function(e){
if(!e||!this._overElement(this.outerNode,e)){
var _34=this;
if(this._navAnim){
this._navAnim.stop();
}
this._navAnim=dojo.fadeOut({node:this.navNode,duration:300,onEnd:function(){
_34._navAnim=null;
}});
this._navAnim.play();
this._navShowing=false;
}
},_overElement:function(_35,e){
if(typeof (dojo)=="undefined"){
return false;
}
_35=dojo.byId(_35);
var m={x:e.pageX,y:e.pageY};
var bb=dojo._getBorderBox(_35);
var _36=dojo.coords(_35,true);
var _37=_36.x;
return (m.x>=_37&&m.x<=(_37+bb.w)&&m.y>=_36.y&&m.y<=(top+bb.h));
}});
}
