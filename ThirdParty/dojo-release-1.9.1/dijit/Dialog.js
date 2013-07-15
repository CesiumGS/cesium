//>>built
require({cache:{"url:dijit/templates/Dialog.html":"<div class=\"dijitDialog\" role=\"dialog\" aria-labelledby=\"${id}_title\">\n\t<div data-dojo-attach-point=\"titleBar\" class=\"dijitDialogTitleBar\">\n\t\t<span data-dojo-attach-point=\"titleNode\" class=\"dijitDialogTitle\" id=\"${id}_title\"\n\t\t\t\trole=\"heading\" level=\"1\"></span>\n\t\t<span data-dojo-attach-point=\"closeButtonNode\" class=\"dijitDialogCloseIcon\" data-dojo-attach-event=\"ondijitclick: onCancel\" title=\"${buttonCancel}\" role=\"button\" tabindex=\"0\">\n\t\t\t<span data-dojo-attach-point=\"closeText\" class=\"closeText\" title=\"${buttonCancel}\">x</span>\n\t\t</span>\n\t</div>\n\t<div data-dojo-attach-point=\"containerNode\" class=\"dijitDialogPaneContent\"></div>\n</div>\n"}});
define("dijit/Dialog",["require","dojo/_base/array","dojo/aspect","dojo/_base/declare","dojo/Deferred","dojo/dom","dojo/dom-class","dojo/dom-geometry","dojo/dom-style","dojo/_base/fx","dojo/i18n","dojo/keys","dojo/_base/lang","dojo/on","dojo/ready","dojo/sniff","dojo/window","dojo/dnd/Moveable","dojo/dnd/TimedMoveable","./focus","./_base/manager","./_Widget","./_TemplatedMixin","./_CssStateMixin","./form/_FormMixin","./_DialogMixin","./DialogUnderlay","./layout/ContentPane","dojo/text!./templates/Dialog.html","dojo/i18n!./nls/common"],function(_1,_2,_3,_4,_5,_6,_7,_8,_9,fx,_a,_b,_c,on,_d,_e,_f,_10,_11,_12,_13,_14,_15,_16,_17,_18,_19,_1a,_1b){
var _1c=_4("dijit._DialogBase"+(_e("dojo-bidi")?"_NoBidi":""),[_15,_17,_18,_16],{templateString:_1b,baseClass:"dijitDialog",cssStateNodes:{closeButtonNode:"dijitDialogCloseIcon"},_setTitleAttr:{node:"titleNode",type:"innerHTML"},open:false,duration:_13.defaultDuration,refocus:true,autofocus:true,_firstFocusItem:null,_lastFocusItem:null,doLayout:false,draggable:true,_setDraggableAttr:function(val){
this._set("draggable",val);
},maxRatio:0.9,closable:true,_setClosableAttr:function(val){
this.closeButtonNode.style.display=val?"":"none";
this._set("closable",val);
},postMixInProperties:function(){
var _1d=_a.getLocalization("dijit","common");
_c.mixin(this,_1d);
this.inherited(arguments);
},postCreate:function(){
_9.set(this.domNode,{display:"none",position:"absolute"});
this.ownerDocumentBody.appendChild(this.domNode);
this.inherited(arguments);
_3.after(this,"onExecute",_c.hitch(this,"hide"),true);
_3.after(this,"onCancel",_c.hitch(this,"hide"),true);
this._modalconnects=[];
},onLoad:function(){
this._size();
this._position();
if(this.autofocus&&_1e.isTop(this)){
this._getFocusItems(this.domNode);
_12.focus(this._firstFocusItem);
}
this.inherited(arguments);
},focus:function(){
this._getFocusItems(this.domNode);
_12.focus(this._firstFocusItem);
},_endDrag:function(){
var _1f=_8.position(this.domNode),_20=_f.getBox(this.ownerDocument);
_1f.y=Math.min(Math.max(_1f.y,0),(_20.h-_1f.h));
_1f.x=Math.min(Math.max(_1f.x,0),(_20.w-_1f.w));
this._relativePosition=_1f;
this._position();
},_setup:function(){
var _21=this.domNode;
if(this.titleBar&&this.draggable){
this._moveable=new ((_e("ie")==6)?_11:_10)(_21,{handle:this.titleBar});
_3.after(this._moveable,"onMoveStop",_c.hitch(this,"_endDrag"),true);
}else{
_7.add(_21,"dijitDialogFixed");
}
this.underlayAttrs={dialogId:this.id,"class":_2.map(this["class"].split(/\s/),function(s){
return s+"_underlay";
}).join(" "),_onKeyDown:_c.hitch(this,"_onKey"),ownerDocument:this.ownerDocument};
},_size:function(){
this._checkIfSingleChild();
if(this._singleChild){
if(typeof this._singleChildOriginalStyle!="undefined"){
this._singleChild.domNode.style.cssText=this._singleChildOriginalStyle;
delete this._singleChildOriginalStyle;
}
}else{
_9.set(this.containerNode,{width:"auto",height:"auto"});
}
var bb=_8.position(this.domNode);
var _22=_f.getBox(this.ownerDocument);
_22.w*=this.maxRatio;
_22.h*=this.maxRatio;
if(bb.w>=_22.w||bb.h>=_22.h){
var _23=_8.position(this.containerNode),w=Math.min(bb.w,_22.w)-(bb.w-_23.w),h=Math.min(bb.h,_22.h)-(bb.h-_23.h);
if(this._singleChild&&this._singleChild.resize){
if(typeof this._singleChildOriginalStyle=="undefined"){
this._singleChildOriginalStyle=this._singleChild.domNode.style.cssText;
}
this._singleChild.resize({w:w,h:h});
}else{
_9.set(this.containerNode,{width:w+"px",height:h+"px",overflow:"auto",position:"relative"});
}
}else{
if(this._singleChild&&this._singleChild.resize){
this._singleChild.resize();
}
}
},_position:function(){
if(!_7.contains(this.ownerDocumentBody,"dojoMove")){
var _24=this.domNode,_25=_f.getBox(this.ownerDocument),p=this._relativePosition,bb=p?null:_8.position(_24),l=Math.floor(_25.l+(p?p.x:(_25.w-bb.w)/2)),t=Math.floor(_25.t+(p?p.y:(_25.h-bb.h)/2));
_9.set(_24,{left:l+"px",top:t+"px"});
}
},_onKey:function(evt){
if(evt.keyCode==_b.TAB){
this._getFocusItems(this.domNode);
var _26=evt.target;
if(this._firstFocusItem==this._lastFocusItem){
evt.stopPropagation();
evt.preventDefault();
}else{
if(_26==this._firstFocusItem&&evt.shiftKey){
_12.focus(this._lastFocusItem);
evt.stopPropagation();
evt.preventDefault();
}else{
if(_26==this._lastFocusItem&&!evt.shiftKey){
_12.focus(this._firstFocusItem);
evt.stopPropagation();
evt.preventDefault();
}
}
}
}else{
if(this.closable&&evt.keyCode==_b.ESCAPE){
this.onCancel();
evt.stopPropagation();
evt.preventDefault();
}
}
},show:function(){
if(this.open){
return;
}
if(!this._started){
this.startup();
}
if(!this._alreadyInitialized){
this._setup();
this._alreadyInitialized=true;
}
if(this._fadeOutDeferred){
this._fadeOutDeferred.cancel();
_1e.hide(this);
}
var win=_f.get(this.ownerDocument);
this._modalconnects.push(on(win,"scroll",_c.hitch(this,"resize")));
this._modalconnects.push(on(this.domNode,"keydown",_c.hitch(this,"_onKey")));
_9.set(this.domNode,{opacity:0,display:""});
this._set("open",true);
this._onShow();
this._size();
this._position();
var _27;
this._fadeInDeferred=new _5(_c.hitch(this,function(){
_27.stop();
delete this._fadeInDeferred;
}));
var _28=this._fadeInDeferred.promise;
_27=fx.fadeIn({node:this.domNode,duration:this.duration,beforeBegin:_c.hitch(this,function(){
_1e.show(this,this.underlayAttrs);
}),onEnd:_c.hitch(this,function(){
if(this.autofocus&&_1e.isTop(this)){
this._getFocusItems(this.domNode);
_12.focus(this._firstFocusItem);
}
this._fadeInDeferred.resolve(true);
delete this._fadeInDeferred;
})}).play();
return _28;
},hide:function(){
if(!this._alreadyInitialized||!this.open){
return;
}
if(this._fadeInDeferred){
this._fadeInDeferred.cancel();
}
var _29;
this._fadeOutDeferred=new _5(_c.hitch(this,function(){
_29.stop();
delete this._fadeOutDeferred;
}));
this._fadeOutDeferred.then(_c.hitch(this,"onHide"));
var _2a=this._fadeOutDeferred.promise;
_29=fx.fadeOut({node:this.domNode,duration:this.duration,onEnd:_c.hitch(this,function(){
this.domNode.style.display="none";
_1e.hide(this);
this._fadeOutDeferred.resolve(true);
delete this._fadeOutDeferred;
})}).play();
if(this._scrollConnected){
this._scrollConnected=false;
}
var h;
while(h=this._modalconnects.pop()){
h.remove();
}
if(this._relativePosition){
delete this._relativePosition;
}
this._set("open",false);
return _2a;
},resize:function(){
if(this.domNode.style.display!="none"){
this._size();
if(!_e("touch")){
this._position();
}
}
},destroy:function(){
if(this._fadeInDeferred){
this._fadeInDeferred.cancel();
}
if(this._fadeOutDeferred){
this._fadeOutDeferred.cancel();
}
if(this._moveable){
this._moveable.destroy();
}
var h;
while(h=this._modalconnects.pop()){
h.remove();
}
_1e.hide(this);
this.inherited(arguments);
}});
if(_e("dojo-bidi")){
_1c=_4("dijit._DialogBase",_1c,{_setTitleAttr:function(_2b){
this._set("title",_2b);
this.titleNode.innerHTML=_2b;
this.applyTextDir(this.titleNode);
},_setTextDirAttr:function(_2c){
if(this._created&&this.textDir!=_2c){
this._set("textDir",_2c);
this.set("title",this.title);
}
}});
}
var _2d=_4("dijit.Dialog",[_1a,_1c],{});
_2d._DialogBase=_1c;
var _1e=_2d._DialogLevelManager={_beginZIndex:950,show:function(_2e,_2f){
ds[ds.length-1].focus=_12.curNode;
var _30=ds[ds.length-1].dialog?ds[ds.length-1].zIndex+2:_2d._DialogLevelManager._beginZIndex;
_9.set(_2e.domNode,"zIndex",_30);
_19.show(_2f,_30-1);
ds.push({dialog:_2e,underlayAttrs:_2f,zIndex:_30});
},hide:function(_31){
if(ds[ds.length-1].dialog==_31){
ds.pop();
var pd=ds[ds.length-1];
if(ds.length==1){
_19.hide();
}else{
_19.show(pd.underlayAttrs,pd.zIndex-1);
}
if(_31.refocus){
var _32=pd.focus;
if(pd.dialog&&(!_32||!_6.isDescendant(_32,pd.dialog.domNode))){
pd.dialog._getFocusItems(pd.dialog.domNode);
_32=pd.dialog._firstFocusItem;
}
if(_32){
try{
_32.focus();
}
catch(e){
}
}
}
}else{
var idx=_2.indexOf(_2.map(ds,function(_33){
return _33.dialog;
}),_31);
if(idx!=-1){
ds.splice(idx,1);
}
}
},isTop:function(_34){
return ds[ds.length-1].dialog==_34;
}};
var ds=_2d._dialogStack=[{dialog:null,focus:null,underlayAttrs:null}];
_12.watch("curNode",function(_35,_36,_37){
var _38=ds[ds.length-1].dialog;
if(_37&&_38&&!_38._fadeOutDeferred&&_37.ownerDocument==_38.ownerDocument){
do{
if(_37==_38.domNode||_7.contains(_37,"dijitPopup")){
return;
}
}while(_37=_37.parentNode);
_38.focus();
}
});
if(_e("dijit-legacy-requires")){
_d(0,function(){
var _39=["dijit/TooltipDialog"];
_1(_39);
});
}
return _2d;
});
