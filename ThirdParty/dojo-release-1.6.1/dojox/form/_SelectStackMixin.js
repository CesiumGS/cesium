/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.form._SelectStackMixin"]){
dojo._hasResource["dojox.form._SelectStackMixin"]=true;
dojo.provide("dojox.form._SelectStackMixin");
dojo.declare("dojox.form._SelectStackMixin",null,{stackId:"",stackPrefix:"",_paneIdFromOption:function(_1){
return (this.stackPrefix||"")+_1;
},_optionValFromPane:function(id){
var sp=this.stackPrefix;
if(sp&&id.indexOf(sp)===0){
return id.substring(sp.length);
}
return id;
},_togglePane:function(_2,_3){
if(_2._shown!=undefined&&_2._shown==_3){
return;
}
var _4=dojo.filter(_2.getDescendants(),"return item.name;");
if(!_3){
_5={};
dojo.forEach(_4,function(w){
_5[w.id]=w.disabled;
w.set("disabled",true);
});
_2._savedStates=_5;
}else{
var _5=_2._savedStates||{};
dojo.forEach(_4,function(w){
var _6=_5[w.id];
if(_6==undefined){
_6=false;
}
w.set("disabled",_6);
});
delete _2._savedStates;
}
_2._shown=_3;
},_connectTitle:function(_7,_8){
var fx=dojo.hitch(this,function(_9){
this.updateOption({value:_8,label:_9});
});
if(_7._setTitleAttr){
this.connect(_7,"_setTitleAttr",fx);
}else{
this.connect(_7,"attr",function(_a,_b){
if(_a=="title"&&arguments.length>1){
fx(_b);
}
});
}
},onAddChild:function(_c,_d){
if(!this._panes[_c.id]){
this._panes[_c.id]=_c;
var v=this._optionValFromPane(_c.id);
this.addOption({value:v,label:_c.title});
this._connectTitle(_c,v);
}
if(!_c.onShow||!_c.onHide||_c._shown==undefined){
_c.onShow=dojo.hitch(this,"_togglePane",_c,true);
_c.onHide=dojo.hitch(this,"_togglePane",_c,false);
_c.onHide();
}
},_setValueAttr:function(v){
if("_savedValue" in this){
return;
}
this.inherited(arguments);
},attr:function(_e,_f){
if(_e=="value"&&arguments.length==2&&"_savedValue" in this){
this._savedValue=_f;
}
return this.inherited(arguments);
},onRemoveChild:function(_10){
if(this._panes[_10.id]){
delete this._panes[_10.id];
this.removeOption(this._optionValFromPane(_10.id));
}
},onSelectChild:function(_11){
this._setValueAttr(this._optionValFromPane(_11.id));
},onStartup:function(_12){
var _13=_12.selected;
this.addOption(dojo.filter(dojo.map(_12.children,function(c){
var v=this._optionValFromPane(c.id);
this._connectTitle(c,v);
var _14=null;
if(!this._panes[c.id]){
this._panes[c.id]=c;
_14={value:v,label:c.title};
}
if(!c.onShow||!c.onHide||c._shown==undefined){
c.onShow=dojo.hitch(this,"_togglePane",c,true);
c.onHide=dojo.hitch(this,"_togglePane",c,false);
c.onHide();
}
if("_savedValue" in this&&v===this._savedValue){
_13=c;
}
return _14;
},this),function(i){
return i;
}));
var _15=this;
var fx=function(){
delete _15._savedValue;
_15.onSelectChild(_13);
if(!_13._shown){
_15._togglePane(_13,true);
}
};
if(_13!==_12.selected){
var _16=dijit.byId(this.stackId);
var c=this.connect(_16,"_showChild",function(sel){
this.disconnect(c);
fx();
});
}else{
fx();
}
},postMixInProperties:function(){
this._savedValue=this.value;
this.inherited(arguments);
this.connect(this,"onChange","_handleSelfOnChange");
},postCreate:function(){
this.inherited(arguments);
this._panes={};
this._subscriptions=[dojo.subscribe(this.stackId+"-startup",this,"onStartup"),dojo.subscribe(this.stackId+"-addChild",this,"onAddChild"),dojo.subscribe(this.stackId+"-removeChild",this,"onRemoveChild"),dojo.subscribe(this.stackId+"-selectChild",this,"onSelectChild")];
var _17=dijit.byId(this.stackId);
if(_17&&_17._started){
this.onStartup({children:_17.getChildren(),selected:_17.selectedChildWidget});
}
},destroy:function(){
dojo.forEach(this._subscriptions,dojo.unsubscribe);
delete this._panes;
this.inherited("destroy",arguments);
},_handleSelfOnChange:function(val){
var _18=this._panes[this._paneIdFromOption(val)];
if(_18){
var s=dijit.byId(this.stackId);
if(_18==s.selectedChildWidget){
s._transition(_18);
}else{
s.selectChild(_18);
}
}
}});
}
