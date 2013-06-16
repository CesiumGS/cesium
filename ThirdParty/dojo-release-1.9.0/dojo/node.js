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
return {load:function(id,_2,_3){
if(!_2.nodeRequire){
throw new Error("Cannot find native require function");
}
_3((function(id,_4){
var _5=define,_6;
define=undefined;
try{
_6=_4(id);
}
finally{
define=_5;
}
return _6;
})(id,_2.nodeRequire));
},normalize:function(id){
if(id.charAt(0)==="."){
id=require.baseUrl+id;
}
return id;
}};
});
