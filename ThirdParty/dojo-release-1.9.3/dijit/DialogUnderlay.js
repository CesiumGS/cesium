//>>built
define("dijit/DialogUnderlay",["dojo/_base/declare","dojo/_base/lang","dojo/aspect","dojo/dom-attr","dojo/dom-style","dojo/on","dojo/window","./_Widget","./_TemplatedMixin","./BackgroundIframe","./Viewport","./main"],function(_1,_2,_3,_4,_5,on,_6,_7,_8,_9,_a,_b){
var _c=_1("dijit.DialogUnderlay",[_7,_8],{templateString:"<div class='dijitDialogUnderlayWrapper'><div class='dijitDialogUnderlay' tabIndex='-1' data-dojo-attach-point='node'></div></div>",dialogId:"","class":"",_modalConnects:[],_setDialogIdAttr:function(id){
_4.set(this.node,"id",id+"_underlay");
this._set("dialogId",id);
},_setClassAttr:function(_d){
this.node.className="dijitDialogUnderlay "+_d;
this._set("class",_d);
},postCreate:function(){
this.ownerDocumentBody.appendChild(this.domNode);
this.own(on(this.domNode,"keydown",_2.hitch(this,"_onKeyDown")));
this.inherited(arguments);
},layout:function(){
var is=this.node.style,os=this.domNode.style;
os.display="none";
var _e=_6.getBox(this.ownerDocument);
os.top=_e.t+"px";
os.left=_e.l+"px";
is.width=_e.w+"px";
is.height=_e.h+"px";
os.display="block";
},show:function(){
this.domNode.style.display="block";
this.open=true;
this.layout();
this.bgIframe=new _9(this.domNode);
var _f=_6.get(this.ownerDocument);
this._modalConnects=[_a.on("resize",_2.hitch(this,"layout")),on(_f,"scroll",_2.hitch(this,"layout"))];
},hide:function(){
this.bgIframe.destroy();
delete this.bgIframe;
this.domNode.style.display="none";
while(this._modalConnects.length){
(this._modalConnects.pop()).remove();
}
this.open=false;
},destroy:function(){
while(this._modalConnects.length){
(this._modalConnects.pop()).remove();
}
this.inherited(arguments);
},_onKeyDown:function(){
}});
_c.show=function(_10,_11){
var _12=_c._singleton;
if(!_12||_12._destroyed){
_12=_b._underlay=_c._singleton=new _c(_10);
}else{
if(_10){
_12.set(_10);
}
}
_5.set(_12.domNode,"zIndex",_11);
if(!_12.open){
_12.show();
}
};
_c.hide=function(){
var _13=_c._singleton;
if(_13&&!_13._destroyed){
_13.hide();
}
};
return _c;
});
