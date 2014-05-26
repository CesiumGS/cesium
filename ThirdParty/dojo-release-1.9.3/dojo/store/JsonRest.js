/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/store/JsonRest",["../_base/xhr","../_base/lang","../json","../_base/declare","./util/QueryResults"],function(_1,_2,_3,_4,_5){
var _6=null;
return _4("dojo.store.JsonRest",_6,{constructor:function(_7){
this.headers={};
_4.safeMixin(this,_7);
},headers:{},target:"",idProperty:"id",ascendingPrefix:"+",descendingPrefix:"-",get:function(id,_8){
_8=_8||{};
var _9=_2.mixin({Accept:this.accepts},this.headers,_8.headers||_8);
return _1("GET",{url:this.target+id,handleAs:"json",headers:_9});
},accepts:"application/javascript, application/json",getIdentity:function(_a){
return _a[this.idProperty];
},put:function(_b,_c){
_c=_c||{};
var id=("id" in _c)?_c.id:this.getIdentity(_b);
var _d=typeof id!="undefined";
return _1(_d&&!_c.incremental?"PUT":"POST",{url:_d?this.target+id:this.target,postData:_3.stringify(_b),handleAs:"json",headers:_2.mixin({"Content-Type":"application/json",Accept:this.accepts,"If-Match":_c.overwrite===true?"*":null,"If-None-Match":_c.overwrite===false?"*":null},this.headers,_c.headers)});
},add:function(_e,_f){
_f=_f||{};
_f.overwrite=false;
return this.put(_e,_f);
},remove:function(id,_10){
_10=_10||{};
return _1("DELETE",{url:this.target+id,headers:_2.mixin({},this.headers,_10.headers)});
},query:function(_11,_12){
_12=_12||{};
var _13=_2.mixin({Accept:this.accepts},this.headers,_12.headers);
if(_12.start>=0||_12.count>=0){
_13.Range=_13["X-Range"]="items="+(_12.start||"0")+"-"+(("count" in _12&&_12.count!=Infinity)?(_12.count+(_12.start||0)-1):"");
}
var _14=this.target.indexOf("?")>-1;
if(_11&&typeof _11=="object"){
_11=_1.objectToQuery(_11);
_11=_11?(_14?"&":"?")+_11:"";
}
if(_12&&_12.sort){
var _15=this.sortParam;
_11+=(_11||_14?"&":"?")+(_15?_15+"=":"sort(");
for(var i=0;i<_12.sort.length;i++){
var _16=_12.sort[i];
_11+=(i>0?",":"")+(_16.descending?this.descendingPrefix:this.ascendingPrefix)+encodeURIComponent(_16.attribute);
}
if(!_15){
_11+=")";
}
}
var _17=_1("GET",{url:this.target+(_11||""),handleAs:"json",headers:_13});
_17.total=_17.then(function(){
var _18=_17.ioArgs.xhr.getResponseHeader("Content-Range");
return _18&&(_18=_18.match(/\/(.*)/))&&+_18[1];
});
return _5(_17);
}});
});
