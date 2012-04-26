/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.image.Lightbox"]){
dojo._hasResource["dojox.image.Lightbox"]=true;
dojo.provide("dojox.image.Lightbox");
dojo.experimental("dojox.image.Lightbox");
dojo.require("dojo.window");
dojo.require("dijit.Dialog");
dojo.require("dojox.fx._base");
dojo.declare("dojox.image.Lightbox",dijit._Widget,{group:"",title:"",href:"",duration:500,modal:false,_allowPassthru:false,_attachedDialog:null,startup:function(){
this.inherited(arguments);
var _1=dijit.byId("dojoxLightboxDialog");
if(_1){
this._attachedDialog=_1;
}else{
this._attachedDialog=new dojox.image.LightboxDialog({id:"dojoxLightboxDialog"});
this._attachedDialog.startup();
}
if(!this.store){
this._addSelf();
this.connect(this.domNode,"onclick","_handleClick");
}
},_addSelf:function(){
this._attachedDialog.addImage({href:this.href,title:this.title},this.group||null);
},_handleClick:function(e){
if(!this._allowPassthru){
e.preventDefault();
}else{
return;
}
this.show();
},show:function(){
this._attachedDialog.show(this);
},hide:function(){
this._attachedDialog.hide();
},disable:function(){
this._allowPassthru=true;
},enable:function(){
this._allowPassthru=false;
},onClick:function(){
},destroy:function(){
this._attachedDialog.removeImage(this);
this.inherited(arguments);
}});
dojo.declare("dojox.image.LightboxDialog",dijit.Dialog,{title:"",inGroup:null,imgUrl:dijit._Widget.prototype._blankGif,errorMessage:"Image not found.",adjust:true,modal:false,errorImg:dojo.moduleUrl("dojox.image","resources/images/warning.png"),templateString:dojo.cache("dojox.image","resources/Lightbox.html","<div class=\"dojoxLightbox\" dojoAttachPoint=\"containerNode\">\n\t<div style=\"position:relative\">\n\t\t<div dojoAttachPoint=\"imageContainer\" class=\"dojoxLightboxContainer\" dojoAttachEvent=\"onclick: _onImageClick\">\n\t\t\t<img dojoAttachPoint=\"imgNode\" src=\"${imgUrl}\" class=\"dojoxLightboxImage\" alt=\"${title}\">\n\t\t\t<div class=\"dojoxLightboxFooter\" dojoAttachPoint=\"titleNode\">\n\t\t\t\t<div class=\"dijitInline LightboxClose\" dojoAttachPoint=\"closeButtonNode\"></div>\n\t\t\t\t<div class=\"dijitInline LightboxNext\" dojoAttachPoint=\"nextButtonNode\"></div>\t\n\t\t\t\t<div class=\"dijitInline LightboxPrev\" dojoAttachPoint=\"prevButtonNode\"></div>\n\t\t\t\t<div class=\"dojoxLightboxText\" dojoAttachPoint=\"titleTextNode\"><span dojoAttachPoint=\"textNode\">${title}</span><span dojoAttachPoint=\"groupCount\" class=\"dojoxLightboxGroupText\"></span></div>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>\n"),constructor:function(_2){
this._groups=this._groups||(_2&&_2._groups)||{XnoGroupX:[]};
},startup:function(){
this.inherited(arguments);
this._animConnects=[];
this.connect(this.nextButtonNode,"onclick","_nextImage");
this.connect(this.prevButtonNode,"onclick","_prevImage");
this.connect(this.closeButtonNode,"onclick","hide");
this._makeAnims();
this._vp=dojo.window.getBox();
return this;
},show:function(_3){
var _4=this;
this._lastGroup=_3;
if(!_4.open){
_4.inherited(arguments);
_4._modalconnects.push(dojo.connect(dojo.global,"onscroll",this,"_position"),dojo.connect(dojo.global,"onresize",this,"_position"),dojo.connect(dojo.body(),"onkeypress",this,"_handleKey"));
if(!_3.modal){
_4._modalconnects.push(dojo.connect(dijit._underlay.domNode,"onclick",this,"onCancel"));
}
}
if(this._wasStyled){
var _5=dojo.create("img",null,_4.imgNode,"after");
dojo.destroy(_4.imgNode);
_4.imgNode=_5;
_4._makeAnims();
_4._wasStyled=false;
}
dojo.style(_4.imgNode,"opacity","0");
dojo.style(_4.titleNode,"opacity","0");
var _6=_3.href;
if((_3.group&&_3!=="XnoGroupX")||_4.inGroup){
if(!_4.inGroup){
_4.inGroup=_4._groups[(_3.group)];
dojo.forEach(_4.inGroup,function(g,i){
if(g.href==_3.href){
_4._index=i;
}
});
}
if(!_4._index){
_4._index=0;
var sr=_4.inGroup[_4._index];
_6=(sr&&sr.href)||_4.errorImg;
}
_4.groupCount.innerHTML=" ("+(_4._index+1)+" of "+Math.max(1,_4.inGroup.length)+")";
_4.prevButtonNode.style.visibility="visible";
_4.nextButtonNode.style.visibility="visible";
}else{
_4.groupCount.innerHTML="";
_4.prevButtonNode.style.visibility="hidden";
_4.nextButtonNode.style.visibility="hidden";
}
if(!_3.leaveTitle){
_4.textNode.innerHTML=_3.title;
}
_4._ready(_6);
},_ready:function(_7){
var _8=this;
_8._imgError=dojo.connect(_8.imgNode,"error",_8,function(){
dojo.disconnect(_8._imgError);
_8.imgNode.src=_8.errorImg;
_8.textNode.innerHTML=_8.errorMessage;
});
_8._imgConnect=dojo.connect(_8.imgNode,"load",_8,function(e){
_8.resizeTo({w:_8.imgNode.width,h:_8.imgNode.height,duration:_8.duration});
dojo.disconnect(_8._imgConnect);
if(_8._imgError){
dojo.disconnect(_8._imgError);
}
});
_8.imgNode.src=_7;
},_nextImage:function(){
if(!this.inGroup){
return;
}
if(this._index+1<this.inGroup.length){
this._index++;
}else{
this._index=0;
}
this._loadImage();
},_prevImage:function(){
if(this.inGroup){
if(this._index==0){
this._index=this.inGroup.length-1;
}else{
this._index--;
}
this._loadImage();
}
},_loadImage:function(){
this._loadingAnim.play(1);
},_prepNodes:function(){
this._imageReady=false;
if(this.inGroup&&this.inGroup[this._index]){
this.show({href:this.inGroup[this._index].href,title:this.inGroup[this._index].title});
}else{
this.show({title:this.errorMessage,href:this.errorImg});
}
},_calcTitleSize:function(){
var _9=dojo.map(dojo.query("> *",this.titleNode).position(),function(s){
return s.h;
});
return {h:Math.max.apply(Math,_9)};
},resizeTo:function(_a,_b){
var _c=dojo.boxModel=="border-box"?dojo._getBorderExtents(this.domNode).w:0,_d=_b||this._calcTitleSize();
this._lastTitleSize=_d;
if(this.adjust&&(_a.h+_d.h+_c+80>this._vp.h||_a.w+_c+60>this._vp.w)){
this._lastSize=_a;
_a=this._scaleToFit(_a);
}
this._currentSize=_a;
var _e=dojox.fx.sizeTo({node:this.containerNode,duration:_a.duration||this.duration,width:_a.w+_c,height:_a.h+_d.h+_c});
this.connect(_e,"onEnd","_showImage");
_e.play(15);
},_scaleToFit:function(_f){
var ns={},nvp={w:this._vp.w-80,h:this._vp.h-60-this._lastTitleSize.h};
var _10=nvp.w/nvp.h,_11=_f.w/_f.h;
if(_11>=_10){
ns.h=nvp.w/_11;
ns.w=nvp.w;
}else{
ns.w=_11*nvp.h;
ns.h=nvp.h;
}
this._wasStyled=true;
this._setImageSize(ns);
ns.duration=_f.duration;
return ns;
},_setImageSize:function(_12){
var s=this.imgNode;
s.height=_12.h;
s.width=_12.w;
},_size:function(){
},_position:function(e){
this._vp=dojo.window.getBox();
this.inherited(arguments);
if(e&&e.type=="resize"){
if(this._wasStyled){
this._setImageSize(this._lastSize);
this.resizeTo(this._lastSize);
}else{
if(this.imgNode.height+80>this._vp.h||this.imgNode.width+60>this._vp.h){
this.resizeTo({w:this.imgNode.width,h:this.imgNode.height});
}
}
}
},_showImage:function(){
this._showImageAnim.play(1);
},_showNav:function(){
var _13=dojo.marginBox(this.titleNode);
if(_13.h>this._lastTitleSize.h){
this.resizeTo(this._wasStyled?this._lastSize:this._currentSize,_13);
}else{
this._showNavAnim.play(1);
}
},hide:function(){
dojo.fadeOut({node:this.titleNode,duration:200,onEnd:dojo.hitch(this,function(){
this.imgNode.src=this._blankGif;
})}).play(5);
this.inherited(arguments);
this.inGroup=null;
this._index=null;
},addImage:function(_14,_15){
var g=_15;
if(!_14.href){
return;
}
if(g){
if(!this._groups[g]){
this._groups[g]=[];
}
this._groups[g].push(_14);
}else{
this._groups["XnoGroupX"].push(_14);
}
},removeImage:function(_16){
var g=_16.group||"XnoGroupX";
dojo.every(this._groups[g],function(_17,i,ar){
if(_17.href==_16.href){
ar.splice(i,1);
return false;
}
return true;
});
},removeGroup:function(_18){
if(this._groups[_18]){
this._groups[_18]=[];
}
},_handleKey:function(e){
if(!this.open){
return;
}
var dk=dojo.keys;
switch(e.charOrCode){
case dk.ESCAPE:
this.hide();
break;
case dk.DOWN_ARROW:
case dk.RIGHT_ARROW:
case 78:
this._nextImage();
break;
case dk.UP_ARROW:
case dk.LEFT_ARROW:
case 80:
this._prevImage();
break;
}
},_makeAnims:function(){
dojo.forEach(this._animConnects,dojo.disconnect);
this._animConnects=[];
this._showImageAnim=dojo.fadeIn({node:this.imgNode,duration:this.duration});
this._animConnects.push(dojo.connect(this._showImageAnim,"onEnd",this,"_showNav"));
this._loadingAnim=dojo.fx.combine([dojo.fadeOut({node:this.imgNode,duration:175}),dojo.fadeOut({node:this.titleNode,duration:175})]);
this._animConnects.push(dojo.connect(this._loadingAnim,"onEnd",this,"_prepNodes"));
this._showNavAnim=dojo.fadeIn({node:this.titleNode,duration:225});
},onClick:function(_19){
},_onImageClick:function(e){
if(e&&e.target==this.imgNode){
this.onClick(this._lastGroup);
if(this._lastGroup.declaredClass){
this._lastGroup.onClick(this._lastGroup);
}
}
}});
}
