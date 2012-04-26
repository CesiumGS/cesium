/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.lang.functional.sequence"]){
dojo._hasResource["dojox.lang.functional.sequence"]=true;
dojo.provide("dojox.lang.functional.sequence");
dojo.require("dojox.lang.functional.lambda");
(function(){
var d=dojo,df=dojox.lang.functional;
d.mixin(df,{repeat:function(n,f,z,o){
o=o||d.global;
f=df.lambda(f);
var t=new Array(n),i=1;
t[0]=z;
for(;i<n;t[i]=z=f.call(o,z),++i){
}
return t;
},until:function(pr,f,z,o){
o=o||d.global;
f=df.lambda(f);
pr=df.lambda(pr);
var t=[];
for(;!pr.call(o,z);t.push(z),z=f.call(o,z)){
}
return t;
}});
})();
}
