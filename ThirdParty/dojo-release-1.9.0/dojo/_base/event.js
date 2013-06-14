/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/

//>>built
define("dojo/_base/event",["./kernel","../on","../has","../dom-geometry"],function(_1,on,_2,_3){
if(on._fixEvent){
var _4=on._fixEvent;
on._fixEvent=function(_5,se){
_5=_4(_5,se);
if(_5){
_3.normalizeEvent(_5);
}
return _5;
};
}
var _6={fix:function(_7,_8){
if(on._fixEvent){
return on._fixEvent(_7,_8);
}
return _7;
},stop:function(_9){
if(_2("dom-addeventlistener")||(_9&&_9.preventDefault)){
_9.preventDefault();
_9.stopPropagation();
}else{
_9=_9||window.event;
_9.cancelBubble=true;
on._preventDefault.call(_9);
}
}};
if(1){
_1.fixEvent=_6.fix;
_1.stopEvent=_6.stop;
}
return _6;
});
