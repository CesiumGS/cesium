/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.Rotator"]){
dojo._hasResource["dojox.widget.Rotator"]=true;
dojo.provide("dojox.widget.Rotator");
dojo.require("dojo.parser");
(function(d){
var _1="dojox.widget.rotator.swap",_2=500,_3="display",_4="none",_5="zIndex";
d.declare("dojox.widget.Rotator",null,{transition:_1,transitionParams:"duration:"+_2,panes:null,constructor:function(_6,_7){
d.mixin(this,_6);
var _8=this,t=_8.transition,tt=_8._transitions={},_9=_8._idMap={},tp=_8.transitionParams=eval("({ "+_8.transitionParams+" })"),_7=_8._domNode=dojo.byId(_7),cb=_8._domNodeContentBox=d.contentBox(_7),p={left:0,top:0},_a=function(bt,dt){
console.warn(_8.declaredClass," - Unable to find transition \"",bt,"\", defaulting to \"",dt,"\".");
};
_8.id=_7.id||(new Date()).getTime();
if(d.style(_7,"position")=="static"){
d.style(_7,"position","relative");
}
tt[t]=d.getObject(t);
if(!tt[t]){
_a(t,_1);
tt[_8.transition=_1]=d.getObject(_1);
}
if(!tp.duration){
tp.duration=_2;
}
d.forEach(_8.panes,function(p){
d.create("div",p,_7);
});
var pp=_8.panes=[];
d.query(">",_7).forEach(function(n,i){
var q={node:n,idx:i,params:d.mixin({},tp,eval("({ "+(d.attr(n,"transitionParams")||"")+" })"))},r=q.trans=d.attr(n,"transition")||_8.transition;
d.forEach(["id","title","duration","waitForEvent"],function(a){
q[a]=d.attr(n,a);
});
if(q.id){
_9[q.id]=i;
}
if(!tt[r]&&!(tt[r]=d.getObject(r))){
_a(r,q.trans=_8.transition);
}
p.position="absolute";
p.display=_4;
if(_8.idx==null||d.attr(n,"selected")){
if(_8.idx!=null){
d.style(pp[_8.idx].node,_3,_4);
}
_8.idx=i;
p.display="";
}
d.style(n,p);
d.query("> script[type^='dojo/method']",n).orphan().forEach(function(s){
var e=d.attr(s,"event");
if(e){
q[e]=d.parser._functionFromScript(s);
}
});
pp.push(q);
});
_8._controlSub=d.subscribe(_8.id+"/rotator/control",_8,"control");
},destroy:function(){
d.forEach([this._controlSub,this.wfe],d.unsubscribe);
d.destroy(this._domNode);
},next:function(){
return this.go(this.idx+1);
},prev:function(){
return this.go(this.idx-1);
},go:function(p){
var _b=this,i=_b.idx,pp=_b.panes,_c=pp.length,_d=_b._idMap[p];
_b._resetWaitForEvent();
p=_d!=null?_d:(p||0);
p=p<_c?(p<0?_c-1:p):0;
if(p==i||_b.anim){
return null;
}
var _e=pp[i],_f=pp[p];
d.style(_e.node,_5,2);
d.style(_f.node,_5,1);
var _10={current:_e,next:_f,rotator:_b},_11=_b.anim=_b._transitions[_f.trans](d.mixin({rotatorBox:_b._domNodeContentBox},_10,_f.params));
if(_11){
var def=new d.Deferred(),ev=_f.waitForEvent,h=d.connect(_11,"onEnd",function(){
d.style(_e.node,{display:_4,left:0,opacity:1,top:0,zIndex:0});
d.disconnect(h);
_b.anim=null;
_b.idx=p;
if(_e.onAfterOut){
_e.onAfterOut(_10);
}
if(_f.onAfterIn){
_f.onAfterIn(_10);
}
_b.onUpdate("onAfterTransition");
if(!ev){
_b._resetWaitForEvent();
def.callback();
}
});
_b.wfe=ev?d.subscribe(ev,function(){
_b._resetWaitForEvent();
def.callback(true);
}):null;
_b.onUpdate("onBeforeTransition");
if(_e.onBeforeOut){
_e.onBeforeOut(_10);
}
if(_f.onBeforeIn){
_f.onBeforeIn(_10);
}
_11.play();
return def;
}
},onUpdate:function(_12,_13){
d.publish(this.id+"/rotator/update",[_12,this,_13||{}]);
},_resetWaitForEvent:function(){
if(this.wfe){
d.unsubscribe(this.wfe);
this.wfe=null;
}
},control:function(_14){
var _15=d._toArray(arguments),_16=this;
_15.shift();
_16._resetWaitForEvent();
if(_16[_14]){
var def=_16[_14].apply(_16,_15);
if(def){
def.addCallback(function(){
_16.onUpdate(_14);
});
}
_16.onManualChange(_14);
}else{
console.warn(_16.declaredClass," - Unsupported action \"",_14,"\".");
}
},resize:function(_17,_18){
var b=this._domNodeContentBox={w:_17,h:_18};
d.contentBox(this._domNode,b);
d.forEach(this.panes,function(p){
d.contentBox(p.node,b);
});
},onManualChange:function(){
}});
d.setObject(_1,function(_19){
return new d._Animation({play:function(){
d.style(_19.current.node,_3,_4);
d.style(_19.next.node,_3,"");
this._fire("onEnd");
}});
});
})(dojo);
}
