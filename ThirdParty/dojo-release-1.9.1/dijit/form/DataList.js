//>>built
define("dijit/form/DataList",["dojo/_base/declare","dojo/dom","dojo/_base/lang","dojo/query","dojo/store/Memory","../registry"],function(_1,_2,_3,_4,_5,_6){
function _7(_8){
return {id:_8.value,value:_8.value,name:_3.trim(_8.innerText||_8.textContent||"")};
};
return _1("dijit.form.DataList",_5,{constructor:function(_9,_a){
this.domNode=_2.byId(_a);
_3.mixin(this,_9);
if(this.id){
_6.add(this);
}
this.domNode.style.display="none";
this.inherited(arguments,[{data:_4("option",this.domNode).map(_7)}]);
},destroy:function(){
_6.remove(this.id);
},fetchSelectedItem:function(){
var _b=_4("> option[selected]",this.domNode)[0]||_4("> option",this.domNode)[0];
return _b&&_7(_b);
}});
});
