//>>built
define("dijit/a11yclick",["dojo/keys","dojo/mouse","dojo/on","dojo/touch"],function(_1,_2,on,_3){
function _4(e){
if((e.keyCode===_1.ENTER||e.keyCode===_1.SPACE)&&!/input|button|textarea/i.test(e.target.nodeName)){
for(var _5=e.target;_5;_5=_5.parentNode){
if(_5.dojoClick){
return true;
}
}
}
};
var _6;
on(document,"keydown",function(e){
if(_4(e)){
_6=e.target;
e.preventDefault();
}else{
_6=null;
}
});
on(document,"keyup",function(e){
if(_4(e)&&e.target==_6){
_6=null;
on.emit(e.target,"click",{cancelable:true,bubbles:true,ctrlKey:e.ctrlKey,shiftKey:e.shiftKey,metaKey:e.metaKey,altKey:e.altKey,_origType:e.type});
}
});
var _7=function(_8,_9){
_8.dojoClick=true;
return on(_8,"click",_9);
};
_7.click=_7;
_7.press=function(_a,_b){
var _c=on(_a,_3.press,function(_d){
if(_d.type=="mousedown"&&!_2.isLeft(_d)){
return;
}
_b(_d);
}),_e=on(_a,"keydown",function(_f){
if(_f.keyCode===_1.ENTER||_f.keyCode===_1.SPACE){
_b(_f);
}
});
return {remove:function(){
_c.remove();
_e.remove();
}};
};
_7.release=function(_10,_11){
var _12=on(_10,_3.release,function(evt){
if(evt.type=="mouseup"&&!_2.isLeft(evt)){
return;
}
_11(evt);
}),_13=on(_10,"keyup",function(evt){
if(evt.keyCode===_1.ENTER||evt.keyCode===_1.SPACE){
_11(evt);
}
});
return {remove:function(){
_12.remove();
_13.remove();
}};
};
_7.move=_3.move;
return _7;
});
