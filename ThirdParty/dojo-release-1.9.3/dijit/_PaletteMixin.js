//>>built
define("dijit/_PaletteMixin",["dojo/_base/declare","dojo/dom-attr","dojo/dom-class","dojo/dom-construct","dojo/keys","dojo/_base/lang","dojo/on","./_CssStateMixin","./a11yclick","./focus","./typematic"],function(_1,_2,_3,_4,_5,_6,on,_7,_8,_9,_a){
var _b=_1("dijit._PaletteMixin",_7,{defaultTimeout:500,timeoutChangeRate:0.9,value:"",_selectedCell:-1,tabIndex:"0",cellClass:"dijitPaletteCell",dyeClass:null,_dyeFactory:function(_c){
var _d=typeof this.dyeClass=="string"?_6.getObject(this.dyeClass):this.dyeClass;
return new _d(_c);
},_preparePalette:function(_e,_f){
this._cells=[];
var url=this._blankGif;
this.own(on(this.gridNode,_8,_6.hitch(this,"_onCellClick")));
for(var row=0;row<_e.length;row++){
var _10=_4.create("tr",{tabIndex:"-1",role:"row"},this.gridNode);
for(var col=0;col<_e[row].length;col++){
var _11=_e[row][col];
if(_11){
var _12=this._dyeFactory(_11,row,col,_f[_11]);
var _13=_4.create("td",{"class":this.cellClass,tabIndex:"-1",title:_f[_11],role:"gridcell"},_10);
_12.fillCell(_13,url);
_13.idx=this._cells.length;
this._cells.push({node:_13,dye:_12});
}
}
}
this._xDim=_e[0].length;
this._yDim=_e.length;
var _14={UP_ARROW:-this._xDim,DOWN_ARROW:this._xDim,RIGHT_ARROW:this.isLeftToRight()?1:-1,LEFT_ARROW:this.isLeftToRight()?-1:1};
for(var key in _14){
this.own(_a.addKeyListener(this.domNode,{keyCode:_5[key],ctrlKey:false,altKey:false,shiftKey:false},this,function(){
var _15=_14[key];
return function(_16){
this._navigateByKey(_15,_16);
};
}(),this.timeoutChangeRate,this.defaultTimeout));
}
},postCreate:function(){
this.inherited(arguments);
this._setCurrent(this._cells[0].node);
},focus:function(){
_9.focus(this._currentFocus);
},_onCellClick:function(evt){
var _17=evt.target;
while(_17.tagName!="TD"){
if(!_17.parentNode||_17==this.gridNode){
return;
}
_17=_17.parentNode;
}
var _18=this._getDye(_17).getValue();
this._setCurrent(_17);
_9.focus(_17);
this._setValueAttr(_18,true);
evt.stopPropagation();
evt.preventDefault();
},_setCurrent:function(_19){
if("_currentFocus" in this){
_2.set(this._currentFocus,"tabIndex","-1");
}
this._currentFocus=_19;
if(_19){
_2.set(_19,"tabIndex",this.tabIndex);
}
},_setValueAttr:function(_1a,_1b){
if(this._selectedCell>=0){
_3.remove(this._cells[this._selectedCell].node,this.cellClass+"Selected");
}
this._selectedCell=-1;
if(_1a){
for(var i=0;i<this._cells.length;i++){
if(_1a==this._cells[i].dye.getValue()){
this._selectedCell=i;
_3.add(this._cells[i].node,this.cellClass+"Selected");
break;
}
}
}
this._set("value",this._selectedCell>=0?_1a:null);
if(_1b||_1b===undefined){
this.onChange(_1a);
}
},onChange:function(){
},_navigateByKey:function(_1c,_1d){
if(_1d==-1){
return;
}
var _1e=this._currentFocus.idx+_1c;
if(_1e<this._cells.length&&_1e>-1){
var _1f=this._cells[_1e].node;
this._setCurrent(_1f);
this.defer(_6.hitch(_9,"focus",_1f));
}
},_getDye:function(_20){
return this._cells[_20.idx].dye;
}});
return _b;
});
