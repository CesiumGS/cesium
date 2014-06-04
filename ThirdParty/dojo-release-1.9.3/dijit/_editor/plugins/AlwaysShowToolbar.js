//>>built
define("dijit/_editor/plugins/AlwaysShowToolbar",["dojo/_base/declare","dojo/dom-class","dojo/dom-construct","dojo/dom-geometry","dojo/_base/lang","dojo/on","dojo/sniff","dojo/_base/window","../_Plugin"],function(_1,_2,_3,_4,_5,on,_6,_7,_8){
return _1("dijit._editor.plugins.AlwaysShowToolbar",_8,{_handleScroll:true,setEditor:function(e){
if(!e.iframe){
return;
}
this.editor=e;
e.onLoadDeferred.then(_5.hitch(this,this.enable));
},enable:function(d){
this._updateHeight();
this.own(on(window,"scroll",_5.hitch(this,"globalOnScrollHandler")),this.editor.on("NormalizedDisplayChanged",_5.hitch(this,"_updateHeight")));
return d;
},_updateHeight:function(){
var e=this.editor;
if(!e.isLoaded){
return;
}
if(e.height){
return;
}
var _9=_4.getMarginSize(e.editNode).h;
if(_6("opera")){
_9=e.editNode.scrollHeight;
}
if(!_9){
_9=_4.getMarginSize(e.document.body).h;
}
if(this._fixEnabled){
_9+=_4.getMarginSize(this.editor.header).h;
}
if(_9==0){
return;
}
if(_6("ie")<=7&&this.editor.minHeight){
var _a=parseInt(this.editor.minHeight);
if(_9<_a){
_9=_a;
}
}
if(_9!=this._lastHeight){
this._lastHeight=_9;
_4.setMarginBox(e.iframe,{h:this._lastHeight});
}
},_lastHeight:0,globalOnScrollHandler:function(){
var _b=_6("ie")<7;
if(!this._handleScroll){
return;
}
var _c=this.editor.header;
if(!this._scrollSetUp){
this._scrollSetUp=true;
this._scrollThreshold=_4.position(_c,true).y;
}
var _d=_4.docScroll(this.editor.ownerDocument).y;
var s=_c.style;
if(_d>this._scrollThreshold&&_d<this._scrollThreshold+this._lastHeight){
if(!this._fixEnabled){
var _e=_4.getMarginSize(_c);
this.editor.iframe.style.marginTop=_e.h+"px";
if(_b){
s.left=_4.position(_c).x;
if(_c.previousSibling){
this._IEOriginalPos=["after",_c.previousSibling];
}else{
if(_c.nextSibling){
this._IEOriginalPos=["before",_c.nextSibling];
}else{
this._IEOriginalPos=["last",_c.parentNode];
}
}
this.editor.ownerDocumentBody.appendChild(_c);
_2.add(_c,"dijitIEFixedToolbar");
}else{
s.position="fixed";
s.top="0px";
}
_4.setMarginBox(_c,{w:_e.w});
s.zIndex=2000;
this._fixEnabled=true;
}
var _f=(this.height)?parseInt(this.editor.height):this.editor._lastHeight;
s.display=(_d>this._scrollThreshold+_f)?"none":"";
}else{
if(this._fixEnabled){
this.editor.iframe.style.marginTop="";
s.position="";
s.top="";
s.zIndex="";
s.display="";
if(_b){
s.left="";
_2.remove(_c,"dijitIEFixedToolbar");
if(this._IEOriginalPos){
_3.place(_c,this._IEOriginalPos[1],this._IEOriginalPos[0]);
this._IEOriginalPos=null;
}else{
_3.place(_c,this.editor.iframe,"before");
}
}
s.width="";
this._fixEnabled=false;
}
}
},destroy:function(){
this._IEOriginalPos=null;
this._handleScroll=false;
this.inherited(arguments);
if(_6("ie")<7){
_2.remove(this.editor.header,"dijitIEFixedToolbar");
}
}});
});
