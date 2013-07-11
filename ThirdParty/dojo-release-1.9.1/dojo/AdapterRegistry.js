/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/AdapterRegistry",["./_base/kernel","./_base/lang"],function(_1,_2){
var _3=_1.AdapterRegistry=function(_4){
this.pairs=[];
this.returnWrappers=_4||false;
};
_2.extend(_3,{register:function(_5,_6,_7,_8,_9){
this.pairs[((_9)?"unshift":"push")]([_5,_6,_7,_8]);
},match:function(){
for(var i=0;i<this.pairs.length;i++){
var _a=this.pairs[i];
if(_a[1].apply(this,arguments)){
if((_a[3])||(this.returnWrappers)){
return _a[2];
}else{
return _a[2].apply(this,arguments);
}
}
}
throw new Error("No match found");
},unregister:function(_b){
for(var i=0;i<this.pairs.length;i++){
var _c=this.pairs[i];
if(_c[0]==_b){
this.pairs.splice(i,1);
return true;
}
}
return false;
}});
return _3;
});
