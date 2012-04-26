/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gfx3d.vector"]){
dojo._hasResource["dojox.gfx3d.vector"]=true;
dojo.provide("dojox.gfx3d.vector");
dojo.mixin(dojox.gfx3d.vector,{sum:function(){
var v={x:0,y:0,z:0};
dojo.forEach(arguments,function(_1){
v.x+=_1.x;
v.y+=_1.y;
v.z+=_1.z;
});
return v;
},center:function(){
var l=arguments.length;
if(l==0){
return {x:0,y:0,z:0};
}
var v=dojox.gfx3d.vector.sum(arguments);
return {x:v.x/l,y:v.y/l,z:v.z/l};
},substract:function(a,b){
return {x:a.x-b.x,y:a.y-b.y,z:a.z-b.z};
},_crossProduct:function(x,y,z,u,v,w){
return {x:y*w-z*v,y:z*u-x*w,z:x*v-y*u};
},crossProduct:function(a,b,c,d,e,f){
if(arguments.length==6&&dojo.every(arguments,function(_2){
return typeof _2=="number";
})){
return dojox.gfx3d.vector._crossProduct(a,b,c,d,e,f);
}
return dojox.gfx3d.vector._crossProduct(a.x,a.y,a.z,b.x,b.y,b.z);
},_dotProduct:function(x,y,z,u,v,w){
return x*u+y*v+z*w;
},dotProduct:function(a,b,c,d,e,f){
if(arguments.length==6&&dojo.every(arguments,function(_3){
return typeof _3=="number";
})){
return dojox.gfx3d.vector._dotProduct(a,b,c,d,e,f);
}
return dojox.gfx3d.vector._dotProduct(a.x,a.y,a.z,b.x,b.y,b.z);
},normalize:function(a,b,c){
var l,m,n;
if(a instanceof Array){
l=a[0];
m=a[1];
n=a[2];
}else{
l=a;
m=b;
n=c;
}
var u=dojox.gfx3d.vector.substract(m,l);
var v=dojox.gfx3d.vector.substract(n,l);
return dojox.gfx3d.vector.crossProduct(u,v);
}});
}
