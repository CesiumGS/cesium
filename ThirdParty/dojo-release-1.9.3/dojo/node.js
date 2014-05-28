/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/node",["./has"],function(_1){
if(!0){
throw new Error("node plugin failed to load because environment is not Node.js");
}
var _2;
if(require.nodeRequire){
_2=require.nodeRequire("path");
}else{
throw new Error("node plugin failed to load because it cannot find the original Node.js require");
}
return {load:function(id,_3,_4){
if(!_3.nodeRequire){
throw new Error("Cannot find native require function");
}
_4((function(id,_5){
var _6=define,_7;
define=undefined;
try{
_7=_5(id);
}
finally{
define=_6;
}
return _7;
})(id,_3.nodeRequire));
},normalize:function(id,_8){
if(id.charAt(0)==="."){
var _9=require.toUrl(_8(".")).replace("/",_2.sep),_a=id.split("/");
_a.unshift(_9);
id=_2.join.apply(_2,_a);
}
return id;
}};
});
