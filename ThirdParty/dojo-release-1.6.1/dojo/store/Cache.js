/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.store.Cache"]){
dojo._hasResource["dojo.store.Cache"]=true;
dojo.provide("dojo.store.Cache");
dojo.getObject("store",true,dojo);
dojo.store.Cache=function(_1,_2,_3){
_3=_3||{};
return dojo.delegate(_1,{query:function(_4,_5){
var _6=_1.query(_4,_5);
_6.forEach(function(_7){
if(!_3.isLoaded||_3.isLoaded(_7)){
_2.put(_7);
}
});
return _6;
},queryEngine:_1.queryEngine||_2.queryEngine,get:function(id,_8){
return dojo.when(_2.get(id),function(_9){
return _9||dojo.when(_1.get(id,_8),function(_a){
if(_a){
_2.put(_a,{id:id});
}
return _a;
});
});
},add:function(_b,_c){
return dojo.when(_1.add(_b,_c),function(_d){
return _2.add(typeof _d=="object"?_d:_b,_c);
});
},put:function(_e,_f){
_2.remove((_f&&_f.id)||this.getIdentity(_e));
return dojo.when(_1.put(_e,_f),function(_10){
return _2.put(typeof _10=="object"?_10:_e,_f);
});
},remove:function(id,_11){
return dojo.when(_1.remove(id,_11),function(_12){
return _2.remove(id,_11);
});
},evict:function(id){
return _2.remove(id);
}});
};
}
