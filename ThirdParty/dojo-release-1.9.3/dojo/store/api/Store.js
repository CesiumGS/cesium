/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/store/api/Store",["../../_base/declare"],function(_1){
var _2=_1(null,{idProperty:"id",queryEngine:null,get:function(id){
},getIdentity:function(_3){
},put:function(_4,_5){
},add:function(_6,_7){
},remove:function(id){
delete this.index[id];
var _8=this.data,_9=this.idProperty;
for(var i=0,l=_8.length;i<l;i++){
if(_8[i][_9]==id){
_8.splice(i,1);
return;
}
}
},query:function(_a,_b){
},transaction:function(){
},getChildren:function(_c,_d){
},getMetadata:function(_e){
}});
_2.PutDirectives=_1(null,{});
_2.SortInformation=_1(null,{});
_2.QueryOptions=_1(null,{});
_2.QueryResults=_1(null,{forEach:function(_f,_10){
},filter:function(_11,_12){
},map:function(_13,_14){
},then:function(_15,_16){
},observe:function(_17,_18){
},total:0});
_2.Transaction=_1(null,{commit:function(){
},abort:function(_19,_1a){
}});
return _2;
});
