//>>built
define("dijit/WidgetSet",["dojo/_base/array","dojo/_base/declare","dojo/_base/kernel","./registry"],function(_1,_2,_3,_4){
var _5=_2("dijit.WidgetSet",null,{constructor:function(){
this._hash={};
this.length=0;
},add:function(_6){
if(this._hash[_6.id]){
throw new Error("Tried to register widget with id=="+_6.id+" but that id is already registered");
}
this._hash[_6.id]=_6;
this.length++;
},remove:function(id){
if(this._hash[id]){
delete this._hash[id];
this.length--;
}
},forEach:function(_7,_8){
_8=_8||_3.global;
var i=0,id;
for(id in this._hash){
_7.call(_8,this._hash[id],i++,this._hash);
}
return this;
},filter:function(_9,_a){
_a=_a||_3.global;
var _b=new _5(),i=0,id;
for(id in this._hash){
var w=this._hash[id];
if(_9.call(_a,w,i++,this._hash)){
_b.add(w);
}
}
return _b;
},byId:function(id){
return this._hash[id];
},byClass:function(_c){
var _d=new _5(),id,_e;
for(id in this._hash){
_e=this._hash[id];
if(_e.declaredClass==_c){
_d.add(_e);
}
}
return _d;
},toArray:function(){
var ar=[];
for(var id in this._hash){
ar.push(this._hash[id]);
}
return ar;
},map:function(_f,_10){
return _1.map(this.toArray(),_f,_10);
},every:function(_11,_12){
_12=_12||_3.global;
var x=0,i;
for(i in this._hash){
if(!_11.call(_12,this._hash[i],x++,this._hash)){
return false;
}
}
return true;
},some:function(_13,_14){
_14=_14||_3.global;
var x=0,i;
for(i in this._hash){
if(_13.call(_14,this._hash[i],x++,this._hash)){
return true;
}
}
return false;
}});
_1.forEach(["forEach","filter","byClass","map","every","some"],function(_15){
_4[_15]=_5.prototype[_15];
});
return _5;
});
