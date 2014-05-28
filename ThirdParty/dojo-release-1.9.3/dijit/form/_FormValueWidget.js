//>>built
define("dijit/form/_FormValueWidget",["dojo/_base/declare","dojo/sniff","./_FormWidget","./_FormValueMixin"],function(_1,_2,_3,_4){
return _1("dijit.form._FormValueWidget",[_3,_4],{_layoutHackIE7:function(){
if(_2("ie")==7){
var _5=this.domNode;
var _6=_5.parentNode;
var _7=_5.firstChild||_5;
var _8=_7.style.filter;
var _9=this;
while(_6&&_6.clientHeight==0){
(function ping(){
var _a=_9.connect(_6,"onscroll",function(){
_9.disconnect(_a);
_7.style.filter=(new Date()).getMilliseconds();
_9.defer(function(){
_7.style.filter=_8;
});
});
})();
_6=_6.parentNode;
}
}
}});
});
