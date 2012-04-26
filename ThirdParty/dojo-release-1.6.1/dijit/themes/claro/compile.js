/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


require.paths.unshift("/opt/less/lib","C:/less/lib");
var fs=require("fs"),path=require("path"),less=require("less");
var options={compress:false,optimization:1,silent:false};
var allFiles=[].concat(fs.readdirSync("."),fs.readdirSync("form").map(function(_1){
return "form/"+_1;
}),fs.readdirSync("layout").map(function(_2){
return "layout/"+_2;
})),lessFiles=allFiles.filter(function(_3){
return _3&&_3!="variables.less"&&/\.less$/.test(_3);
});
lessFiles.forEach(function(_4){
fs.readFile(_4,"utf-8",function(e,_5){
if(e){
console.error("lessc: "+e.message);
process.exit(1);
}
new (less.Parser)({paths:[path.dirname(_4)],optimization:options.optimization,filename:_4}).parse(_5,function(_6,_7){
if(_6){
less.writeError(_6,options);
process.exit(1);
}else{
try{
var _8=_7.toCSS({compress:options.compress}),_9=_4.replace(".less",".css");
fd=fs.openSync(_9,"w");
fs.writeSync(fd,_8,0,"utf8");
}
catch(e){
less.writeError(e,options);
process.exit(2);
}
}
});
});
});
