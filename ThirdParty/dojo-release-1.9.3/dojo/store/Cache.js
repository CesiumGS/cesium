/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/store/Cache",["../_base/lang","../when"],function(_1,_2){
var _3=function(_4,_5,_6){
_6=_6||{};
return _1.delegate(_4,{query:function(_7,_8){
var _9=_4.query(_7,_8);
_9.forEach(function(_a){
if(!_6.isLoaded||_6.isLoaded(_a)){
_5.put(_a);
}
});
return _9;
},queryEngine:_4.queryEngine||_5.queryEngine,get:function(id,_b){
return _2(_5.get(id),function(_c){
return _c||_2(_4.get(id,_b),function(_d){
if(_d){
_5.put(_d,{id:id});
}
return _d;
});
});
},add:function(_e,_f){
return _2(_4.add(_e,_f),function(_10){
_5.add(_e&&typeof _10=="object"?_10:_e,_f);
return _10;
});
},put:function(_11,_12){
_5.remove((_12&&_12.id)||this.getIdentity(_11));
return _2(_4.put(_11,_12),function(_13){
_5.put(_11&&typeof _13=="object"?_13:_11,_12);
return _13;
});
},remove:function(id,_14){
return _2(_4.remove(id,_14),function(_15){
return _5.remove(id,_14);
});
},evict:function(id){
return _5.remove(id);
}});
};
_1.setObject("dojo.store.Cache",_3);
return _3;
});
