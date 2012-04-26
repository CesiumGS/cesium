/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gantt.GanttResourceItem"]){
dojo._hasResource["dojox.gantt.GanttResourceItem"]=true;
dojo.provide("dojox.gantt.GanttResourceItem");
dojo.require("dojo.date.locale");
dojo.declare("dojox.gantt.GanttResourceItem",null,{constructor:function(_1){
this.ganttChart=_1;
this.ownerItem=[];
this.ownerNameItem=[];
this.ownerTaskNodeMapping={};
this.ownerTaskNodeMapping_time={};
this.resourceInfo={};
this.ownerTimeConsume={};
},clearAll:function(){
this.clearData();
this.clearItems();
},clearData:function(){
this.ownerItem=[];
this.ownerNameItem=[];
this.ownerTaskNodeMapping={};
this.ownerTaskNodeMapping_time={};
this.resourceInfo={};
this.ownerTimeConsume={};
},clearItems:function(){
dojo.destroy(this.content.firstChild);
},buildResource:function(){
var _2={};
dojo.forEach(this.ganttChart.arrProjects,function(_3){
dojo.forEach(_3.arrTasks,function(_4){
_4.buildResourceInfo(_2);
},this);
},this);
return _2;
},buildOwnerTimeConsume:function(){
var _5={};
for(var _6 in this.resourceInfo){
var _7=this.resourceInfo[_6];
var _8={};
for(var i=0;i<_7.length;i++){
var _9=_7[i];
var _a=_9.taskItem.startTime.getTime(),_b=_9.taskItem.duration*24*60*60*1000/this.ganttChart.hsPerDay;
_8.min=_8.min?Math.min(_8.min,_a):_a;
_8.max=_8.max?Math.max(_8.max,(_a+_b)):(_a+_b);
}
_8.dur=(_8.max-_8.min)*this.ganttChart.hsPerDay/(24*60*60*1000);
_8.min=new Date(_8.min);
_8.max=new Date(_8.max);
_5[_6]=_8;
}
return _5;
},refresh:function(){
this.ownerTimeConsume=this.buildOwnerTimeConsume();
this.contentData.firstChild.style.width=Math.max(1200,this.ganttChart.pixelsPerDay*this.ganttChart.totalDays)+"px";
for(var _c in this.resourceInfo){
this.refreshOwnerEntry(_c);
}
},reConstruct:function(){
this.clearAll();
this.resourceInfo=this.buildResource();
this.ownerTimeConsume=this.buildOwnerTimeConsume();
this.tableControl=dojo.create("table",{cellPadding:"0",cellSpacing:"0",className:"ganttResourceTableControl"});
var _d=this.tableControl.insertRow(this.tableControl.rows.length);
this.contentHeight=this.content.offsetHeight;
this.contentWidth=this.content.offsetWidth;
this.content.appendChild(this.tableControl);
this.contentData=dojo.create("div",{className:"ganttResourceContentDataContainer"});
this.contentData.appendChild(this.createPanelOwners());
dojo.style(this.contentData,"height",(this.contentHeight-this.ganttChart.panelTimeHeight)+"px");
var _e=dojo.create("td",{vAlign:"top"});
this.panelNames=dojo.create("div",{className:"ganttResourcePanelNames"});
this.panelNames.appendChild(this.createPanelNamesOwners());
_e.appendChild(this.panelNames);
_d.appendChild(_e);
_e=dojo.create("td",{vAlign:"top"});
var _f=dojo.create("div",{className:"ganttResourceDivCell"});
_f.appendChild(this.contentData);
_e.appendChild(_f);
_d.appendChild(_e);
dojo.style(this.panelNames,{height:(this.contentHeight-this.ganttChart.panelTimeHeight-this.ganttChart.scrollBarWidth)+"px",width:this.ganttChart.maxWidthPanelNames+"px"});
this.contentData.style.width=(this.contentWidth-this.ganttChart.maxWidthPanelNames)+"px";
this.contentData.firstChild.style.width=this.ganttChart.pixelsPerDay*(this.ganttChart.panelTime.firstChild.firstChild.rows[3].cells.length)+"px";
var _10=this;
this.contentData.onscroll=function(){
if(_10.panelNames){
_10.panelNames.scrollTop=this.scrollTop;
}
};
this.contentData.scrollLeft=this.ganttChart.contentData.scrollLeft;
for(var _11 in this.resourceInfo){
this.createOwnerEntry(_11);
}
this.postAdjustment();
},create:function(){
var _12=dojo.create("div",{innerHTML:"Resource Chart:",className:"ganttResourceHeader"},this.ganttChart.content,"after");
dojo.style(_12,"width",this.ganttChart.contentWidth+"px");
var _13=dojo.create("div",{className:"ganttResourceContent"},_12,"after");
dojo.style(_13,{width:this.ganttChart.contentWidth+"px",height:(this.ganttChart.resourceChartHeight||(this.ganttChart.contentHeight*0.8))+"px"});
this.content=_13||this.content;
this.reConstruct();
},postAdjustment:function(){
this.contentData.firstChild.style.height=(this.ownerItem.length*23)+"px";
this.panelNames.firstChild.style.height=(this.ownerItem.length*23)+"px";
},refreshOwnerEntry:function(_14){
this.refreshOwnerItem(_14);
dojo.forEach(this.resourceInfo[_14],function(_15,i){
var _16=this.ownerTaskNodeMapping[_14].tasks[i][0];
this.refreshDetailedTaskEntry(_14,_16,_15);
},this);
},createOwnerEntry:function(_17){
var _18=this.contentData.firstChild;
var _19=this.ownerItem[this.ownerItem.length-1];
this.ownerTaskNodeMapping[_17]={};
this.ownerTaskNodeMapping[_17][_17]=[];
var pos=dojo.position(_18);
var _1a=(_19?parseInt(_19.style.top):(6-23))+this.ganttChart.heightTaskItem+11;
var _1b=this.createOwnerItem(_17,_1a);
_18.appendChild(_1b);
this.ownerItem.push(_1b);
this.ownerTaskNodeMapping[_17][_17].push(_1b);
if(this.panelNames){
var _1c=this.createOwnerNameItem(_17,_1a);
this.panelNames.firstChild.appendChild(_1c);
this.ownerNameItem.push(_1c);
this.ownerTaskNodeMapping[_17][_17].push(_1c);
}
var _1d=this.ownerItem[this.ownerNameItem.length-1];
var _1e=this.ownerNameItem[this.ownerNameItem.length-1];
if(this.panelNames){
this.checkWidthTaskNameItem(_1e);
var _1f=this.createTreeImg(_1e);
this.panelNames.firstChild.appendChild(_1f);
this.ownerTaskNodeMapping[_17][_17].push(_1f);
}
this.ownerTaskNodeMapping[_17]["taskCount"]=this.resourceInfo[_17].length;
this.ownerTaskNodeMapping[_17]["isOpen"]=false;
this.ownerTaskNodeMapping[_17]["tasks"]=[];
dojo.forEach(this.resourceInfo[_17],function(_20){
this.ownerTaskNodeMapping[_17]["tasks"].push(this.createDetailedTaskEntry(_17,_1e,_20));
},this);
return this;
},createOwnerNameItem:function(_21,_22){
var _23=dojo.create("div",{id:_21,title:_21,innerHTML:_21,className:"ganttOwnerNameItem"});
dojo.style(_23,"top",_22+"px");
return _23;
},refreshOwnerItem:function(_24){
var _25=this.ownerTaskNodeMapping[_24][_24][0];
var _26=this.ownerTimeConsume[_24].min,end=this.ownerTimeConsume[_24].max,dur=this.ownerTimeConsume[_24].dur;
var _27=this.ganttChart.getPosOnDate(_26);
_25.style.left=_27+"px";
_25.style.width=dur*this.ganttChart.pixelsPerWorkHour+"px";
dojo.forEach(this.resourceInfo[_24],function(_28,i){
var _29=this.ganttChart.getPosOnDate(_28.taskItem.startTime);
dojo.style(_25.childNodes[i],{left:(_29-_27)+"px",width:_28.taskItem.duration*this.ganttChart.pixelsPerWorkHour+"px"});
},this);
},createOwnerItem:function(_2a,_2b){
var _2c=this.ownerTimeConsume[_2a].min,end=this.ownerTimeConsume[_2a].max,dur=this.ownerTimeConsume[_2a].dur;
var _2d=this.ganttChart.getPosOnDate(_2c);
var _2e=dojo.create("div",{id:_2a,owner:true,className:"ganttOwnerBar"});
dojo.style(_2e,{left:_2d+"px",top:_2b+"px",width:dur*this.ganttChart.pixelsPerWorkHour+"px",height:this.ganttChart.heightTaskItem+"px"});
dojo.forEach(this.resourceInfo[_2a],function(_2f){
var _30=dojo.create("div",{id:_2a,className:"ganttOwnerTaskBar"},_2e);
var _31=this.ganttChart.getPosOnDate(_2f.taskItem.startTime);
dojo.style(_30,{left:(_31-_2d)+"px",width:_2f.taskItem.duration*this.ganttChart.pixelsPerWorkHour+"px",height:this.ganttChart.heightTaskItem+"px"});
},this);
return _2e;
},refreshDetailedTaskEntry:function(_32,_33,_34){
this.refreshTaskItem(_33,_34);
},createDetailedTaskEntry:function(_35,_36,_37){
var _38=[];
var _39=this.contentData.firstChild;
var _3a=parseInt(_36.style.top);
var _3b=this.createTaskItem(_37,_3a);
_3b.style.display="none";
_39.appendChild(_3b);
this.ownerItem.push(_3b);
_38.push(_3b);
if(this.panelNames){
var _3c=this.createTaskNameItem(_37.taskItem.name,_3a);
this.panelNames.firstChild.appendChild(_3c);
_3c.style.display="none";
this.ownerNameItem.push(_3c);
_38.push(_3c);
}
if(this.panelNames){
this.ownerNameItem[this.ownerNameItem.length-1].style.left=dojo.style(_36,"left")+15+"px";
var _3d=this.createConnectingLinesPN(_36,this.ownerNameItem[this.ownerNameItem.length-1]);
dojo.forEach(_3d,function(_3e){
_3e.style.display="none";
},this);
_38.push({"v":_3d[0],"h":_3d[1]});
this.checkWidthTaskNameItem(this.ownerNameItem[this.ownerNameItem.length-1]);
}
return _38;
},createTaskNameItem:function(_3f,_40){
var _41=dojo.create("div",{id:_3f,className:"ganttTaskNameItem",title:_3f,innerHTML:_3f});
dojo.style(_41,"top",_40+"px");
return _41;
},refreshTaskItem:function(_42,_43){
var _44=this.ganttChart.getPosOnDate(_43.taskItem.startTime);
dojo.style(_42,{left:_44+"px",width:_43.taskItem.duration*this.ganttChart.pixelsPerWorkHour+"px"});
},createTaskItem:function(_45,_46){
var _47=this.ganttChart.getPosOnDate(_45.taskItem.startTime);
var _48=dojo.create("div",{id:_45.taskItem.name,className:"ganttTaskBar"});
dojo.style(_48,{left:_47+"px",top:_46+"px",width:_45.taskItem.duration*this.ganttChart.pixelsPerWorkHour+"px",height:this.ganttChart.heightTaskItem+"px"});
return _48;
},createConnectingLinesPN:function(_49,_4a){
var _4b=[];
var _4c=dojo.create("div",{innerHTML:"&nbsp;",className:"ganttResourceLineVerticalLeft"},this.panelNames.firstChild);
_4c.cNode=_4a;
_4c.pNode=_49;
var _4d=dojo.create("div",{noShade:true,color:"#000000",className:"ganttResourceLineHorizontalLeft"},this.panelNames.firstChild);
_4d.cNode=_4a;
_4d.pNode=_49;
this.panelNames.firstChild.appendChild(_4d);
_4b.push(_4c);
_4b.push(_4d);
return _4b;
},createTreeImg:function(_4e){
var _4f=dojo.create("div",{id:_4e.id,className:"ganttImageTreeExpand"});
dojo.attr(_4f,"tabIndex",0);
var _50=this.ownerTaskNodeMapping[_4e.id];
dojo.forEach(["onclick","onkeydown"],function(e){
this.ganttChart._events.push(dojo.connect(_4f,e,this,function(evt){
if(e=="onkeydown"&&evt.keyCode!=dojo.keys.ENTER){
return;
}
if(_50.isOpen){
dojo.removeClass(_4f,"ganttImageTreeCollapse");
dojo.addClass(_4f,"ganttImageTreeExpand");
_50.isOpen=false;
var _51=false;
for(var _52 in this.ownerTaskNodeMapping){
var _53=this.ownerTaskNodeMapping[_52];
if(_51){
dojo.forEach(_53[_52],function(_54){
dojo.style(_54,"top",dojo.style(_54,"top")-_50.taskCount*23+"px");
},this);
dojo.forEach(_53.tasks,function(_55){
dojo.forEach(_55,function(_56){
var _57=!_56.v&&!_56.h?[_56]:[_56.v,_56.h];
dojo.forEach(_57,function(t){
dojo.style(t,"top",dojo.style(t,"top")-_50.taskCount*23+"px");
},this);
},this);
},this);
}else{
if(_52==_4e.id){
_51=true;
dojo.forEach(_53.tasks,function(_58,i){
dojo.forEach(_58,function(_59){
this.styleOwnerItem(_59,_53[_52][0],"none",0);
},this);
},this);
}
}
}
}else{
dojo.removeClass(_4f,"ganttImageTreeExpand");
dojo.addClass(_4f,"ganttImageTreeCollapse");
_50.isOpen=true;
var _51=false;
for(var _52 in this.ownerTaskNodeMapping){
var _53=this.ownerTaskNodeMapping[_52];
if(_51){
dojo.forEach(_53[_52],function(_5a){
dojo.style(_5a,"top",dojo.style(_5a,"top")+_50.taskCount*23+"px");
},this);
dojo.forEach(_53.tasks,function(_5b){
dojo.forEach(_5b,function(_5c){
var _5d=!_5c.v&&!_5c.h?[_5c]:[_5c.v,_5c.h];
dojo.forEach(_5d,function(t){
dojo.style(t,"top",dojo.style(t,"top")+_50.taskCount*23+"px");
},this);
},this);
},this);
}else{
if(_52==_4e.id){
_51=true;
dojo.forEach(_53.tasks,function(_5e,i){
dojo.forEach(_5e,function(_5f){
this.styleOwnerItem(_5f,_53[_52][0],"inline",(i+1)*23);
},this);
},this);
}
}
}
}
}));
},this);
dojo.addClass(_4f,"ganttResourceTreeImage");
dojo.style(_4f,{left:(dojo.style(_4e,"left")-12)+"px",top:(dojo.style(_4e,"top")+3)+"px"});
return _4f;
},styleOwnerItem:function(_60,_61,_62,_63){
if(_60.v||_60.h){
dojo.style(_60.v,{height:Math.max(1,(_60.v.cNode.offsetTop-_60.v.pNode.offsetTop))+"px",top:(_60.v.pNode.offsetTop+5)+"px",left:(_60.v.pNode.offsetLeft-9)+"px",display:_62});
dojo.style(_60.h,{width:Math.max(1,(_60.h.cNode.offsetLeft-_60.h.pNode.offsetLeft+4))+"px",top:(_60.h.cNode.offsetTop+5)+"px",left:(_60.h.pNode.offsetLeft-9)+"px",display:_62});
}else{
dojo.style(_60,{display:_62,top:parseInt(_61.style.top)+_63+"px"});
}
},checkWidthTaskNameItem:function(_64){
if(_64&&_64.offsetWidth+_64.offsetLeft>this.ganttChart.maxWidthPanelNames){
var _65=_64.offsetWidth+_64.offsetLeft-this.ganttChart.maxWidthPanelNames;
var _66=Math.round(_65/(_64.offsetWidth/_64.firstChild.length));
var _67=_64.id.substring(0,_64.firstChild.length-_66-3);
_67+="...";
_64.innerHTML=_67;
}
},createPanelOwners:function(){
var _68=dojo.create("div",{className:"ganttOwnerPanel"});
dojo.style(_68,{height:(this.contentHeight-this.ganttChart.panelTimeHeight-this.ganttChart.scrollBarWidth)+"px"});
return _68;
},createPanelNamesOwners:function(){
var _69=dojo.create("div",{innerHTML:"&nbsp;",className:"ganttResourcePanelNamesOwners"});
dojo.style(_69,{height:(this.contentHeight-this.ganttChart.panelTimeHeight-this.ganttChart.scrollBarWidth)+"px",width:this.ganttChart.maxWidthPanelNames+"px"});
return _69;
}});
}
