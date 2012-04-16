/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojo.AdapterRegistry"]){
dojo._hasResource["dojo.AdapterRegistry"]=true;
dojo.provide("dojo.AdapterRegistry");
dojo.AdapterRegistry=function(_1){
this.pairs=[];
this.returnWrappers=_1||false;
};
dojo.extend(dojo.AdapterRegistry,{register:function(_2,_3,_4,_5,_6){
this.pairs[((_6)?"unshift":"push")]([_2,_3,_4,_5]);
},match:function(){
for(var i=0;i<this.pairs.length;i++){
var _7=this.pairs[i];
if(_7[1].apply(this,arguments)){
if((_7[3])||(this.returnWrappers)){
return _7[2];
}else{
return _7[2].apply(this,arguments);
}
}
}
throw new Error("No match found");
},unregister:function(_8){
for(var i=0;i<this.pairs.length;i++){
var _9=this.pairs[i];
if(_9[0]==_8){
this.pairs.splice(i,1);
return true;
}
}
return false;
}});
}
