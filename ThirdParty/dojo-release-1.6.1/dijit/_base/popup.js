/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dijit._base.popup"]){
dojo._hasResource["dijit._base.popup"]=true;
dojo.provide("dijit._base.popup");
dojo.require("dijit._base.focus");
dojo.require("dijit._base.place");
dojo.require("dijit._base.window");
dijit.popup={_stack:[],_beginZIndex:1000,_idGen:1,_createWrapper:function(_1){
var _2=_1.declaredClass?_1._popupWrapper:(_1.parentNode&&dojo.hasClass(_1.parentNode,"dijitPopup")),_3=_1.domNode||_1;
if(!_2){
_2=dojo.create("div",{"class":"dijitPopup",style:{display:"none"},role:"presentation"},dojo.body());
_2.appendChild(_3);
var s=_3.style;
s.display="";
s.visibility="";
s.position="";
s.top="0px";
if(_1.declaredClass){
_1._popupWrapper=_2;
dojo.connect(_1,"destroy",function(){
dojo.destroy(_2);
delete _1._popupWrapper;
});
}
}
return _2;
},moveOffScreen:function(_4){
var _5=this._createWrapper(_4);
dojo.style(_5,{visibility:"hidden",top:"-9999px",display:""});
},hide:function(_6){
var _7=this._createWrapper(_6);
dojo.style(_7,"display","none");
},getTopPopup:function(){
var _8=this._stack;
for(var pi=_8.length-1;pi>0&&_8[pi].parent===_8[pi-1].widget;pi--){
}
return _8[pi];
},open:function(_9){
var _a=this._stack,_b=_9.popup,_c=_9.orient||((_9.parent?_9.parent.isLeftToRight():dojo._isBodyLtr())?{"BL":"TL","BR":"TR","TL":"BL","TR":"BR"}:{"BR":"TR","BL":"TL","TR":"BR","TL":"BL"}),_d=_9.around,id=(_9.around&&_9.around.id)?(_9.around.id+"_dropdown"):("popup_"+this._idGen++);
while(_a.length&&(!_9.parent||!dojo.isDescendant(_9.parent.domNode,_a[_a.length-1].widget.domNode))){
dijit.popup.close(_a[_a.length-1].widget);
}
var _e=this._createWrapper(_b);
dojo.attr(_e,{id:id,style:{zIndex:this._beginZIndex+_a.length},"class":"dijitPopup "+(_b.baseClass||_b["class"]||"").split(" ")[0]+"Popup",dijitPopupParent:_9.parent?_9.parent.id:""});
if(dojo.isIE||dojo.isMoz){
if(!_b.bgIframe){
_b.bgIframe=new dijit.BackgroundIframe(_e);
}
}
var _f=_d?dijit.placeOnScreenAroundElement(_e,_d,_c,_b.orient?dojo.hitch(_b,"orient"):null):dijit.placeOnScreen(_e,_9,_c=="R"?["TR","BR","TL","BL"]:["TL","BL","TR","BR"],_9.padding);
_e.style.display="";
_e.style.visibility="visible";
_b.domNode.style.visibility="visible";
var _10=[];
_10.push(dojo.connect(_e,"onkeypress",this,function(evt){
if(evt.charOrCode==dojo.keys.ESCAPE&&_9.onCancel){
dojo.stopEvent(evt);
_9.onCancel();
}else{
if(evt.charOrCode===dojo.keys.TAB){
dojo.stopEvent(evt);
var _11=this.getTopPopup();
if(_11&&_11.onCancel){
_11.onCancel();
}
}
}
}));
if(_b.onCancel){
_10.push(dojo.connect(_b,"onCancel",_9.onCancel));
}
_10.push(dojo.connect(_b,_b.onExecute?"onExecute":"onChange",this,function(){
var _12=this.getTopPopup();
if(_12&&_12.onExecute){
_12.onExecute();
}
}));
_a.push({widget:_b,parent:_9.parent,onExecute:_9.onExecute,onCancel:_9.onCancel,onClose:_9.onClose,handlers:_10});
if(_b.onOpen){
_b.onOpen(_f);
}
return _f;
},close:function(_13){
var _14=this._stack;
while((_13&&dojo.some(_14,function(_15){
return _15.widget==_13;
}))||(!_13&&_14.length)){
var top=_14.pop(),_16=top.widget,_17=top.onClose;
if(_16.onClose){
_16.onClose();
}
dojo.forEach(top.handlers,dojo.disconnect);
if(_16&&_16.domNode){
this.hide(_16);
}
if(_17){
_17();
}
}
}};
dijit._frames=new function(){
var _18=[];
this.pop=function(){
var _19;
if(_18.length){
_19=_18.pop();
_19.style.display="";
}else{
if(dojo.isIE<9){
var _1a=dojo.config["dojoBlankHtmlUrl"]||(dojo.moduleUrl("dojo","resources/blank.html")+"")||"javascript:\"\"";
var _1b="<iframe src='"+_1a+"'"+" style='position: absolute; left: 0px; top: 0px;"+"z-index: -1; filter:Alpha(Opacity=\"0\");'>";
_19=dojo.doc.createElement(_1b);
}else{
_19=dojo.create("iframe");
_19.src="javascript:\"\"";
_19.className="dijitBackgroundIframe";
dojo.style(_19,"opacity",0.1);
}
_19.tabIndex=-1;
dijit.setWaiRole(_19,"presentation");
}
return _19;
};
this.push=function(_1c){
_1c.style.display="none";
_18.push(_1c);
};
}();
dijit.BackgroundIframe=function(_1d){
if(!_1d.id){
throw new Error("no id");
}
if(dojo.isIE||dojo.isMoz){
var _1e=(this.iframe=dijit._frames.pop());
_1d.appendChild(_1e);
if(dojo.isIE<7||dojo.isQuirks){
this.resize(_1d);
this._conn=dojo.connect(_1d,"onresize",this,function(){
this.resize(_1d);
});
}else{
dojo.style(_1e,{width:"100%",height:"100%"});
}
}
};
dojo.extend(dijit.BackgroundIframe,{resize:function(_1f){
if(this.iframe){
dojo.style(this.iframe,{width:_1f.offsetWidth+"px",height:_1f.offsetHeight+"px"});
}
},destroy:function(){
if(this._conn){
dojo.disconnect(this._conn);
this._conn=null;
}
if(this.iframe){
dijit._frames.push(this.iframe);
delete this.iframe;
}
}});
}
