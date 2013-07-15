/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/request/default",["exports","require","../has"],function(_1,_2,_3){
var _4=_3("config-requestProvider"),_5;
if(1){
_5="./xhr";
}else{
if(0){
_5="./node";
}
}
if(!_4){
_4=_5;
}
_1.getPlatformDefaultId=function(){
return _5;
};
_1.load=function(id,_6,_7,_8){
_2([id=="platform"?_5:_4],function(_9){
_7(_9);
});
};
});
