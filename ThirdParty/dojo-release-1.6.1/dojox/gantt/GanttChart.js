/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.gantt.GanttChart"]){
dojo._hasResource["dojox.gantt.GanttChart"]=true;
dojo.provide("dojox.gantt.GanttChart");
dojo.require("dijit.Tooltip");
dojo.require("dojox.gantt.GanttProjectItem");
dojo.require("dojox.gantt.GanttResourceItem");
dojo.require("dojox.gantt.TabMenu");
dojo.require("dojo.date.locale");
(function(){
dojo.declare("dojox.gantt.GanttChart",null,{constructor:function(_1,_2){
this.resourceChartHeight=_1.resourceChartHeight!==undefined?_1.resourceChartHeight:false;
this.withResource=_1.withResource!==undefined?_1.withResource:true;
this.correctError=_1.autoCorrectError!==undefined?_1.autoCorrectError:false;
this.isShowConMenu=this.isContentEditable=!_1.readOnly;
this.withTaskId=_1.withTaskId!==undefined?_1.withTaskId:!_1.readOnly;
this.animation=_1.animation!==undefined?_1.animation:true;
this.saveProgramPath=_1.saveProgramPath||"saveGanttData.php";
this.dataFilePath=_1.dataFilePath||"gantt_default.json";
this.contentHeight=_1.height||400;
this.contentWidth=_1.width||600;
this.content=dojo.byId(_2);
this.scrollBarWidth=18;
this.panelTimeHeight=102;
this.maxWidthPanelNames=150;
this.maxWidthTaskNames=150;
this.minWorkLength=8;
this.heightTaskItem=12;
this.heightTaskItemExtra=11;
this.pixelsPerDay=24;
this.hsPerDay=8;
this.pixelsPerWorkHour=this.pixelsPerDay/this.hsPerDay;
this.pixelsPerHour=this.pixelsPerDay/24;
this.countDays=0;
this.totalDays=0;
this.startDate=null;
this.initialPos=0;
this.contentDataHeight=0;
this.panelTimeExpandDelta=20;
this.divTimeInfo=null;
this.panelNames=null;
this.panelTime=null;
this.contentData=null;
this.tabMenu=null;
this.project=[];
this.arrProjects=[];
this.xmlLoader=null;
this.isMoving=false;
this.isResizing=false;
this.animationNodes=[];
this.scale=1;
this.tempDayInPixels=0;
this.resource=null;
this.months=dojo.date.locale.getNames("months","wide");
this._events=[];
},getProject:function(id){
return dojo.filter(this.arrProjects,function(_3){
return _3.project.id==id;
},this)[0];
},checkPosPreviousTask:function(_4,_5){
var _6=this.getWidthOnDuration(_4.duration);
var _7=this.getPosOnDate(_4.startTime);
var _8=this.getPosOnDate(_5.startTime);
if((_6+_7)>_8){
return false;
}
return true;
},correctPosPreviousTask:function(_9,_a,_b){
var _c=new Date(_9.startTime);
_c.setHours(_c.getHours()+(_9.duration/this.hsPerDay*24));
if(_c.getHours()>0){
_c.setHours(0);
_c.setDate(_c.getDate()+1);
}
_b?(_b.setStartTime(_c,true)):(_a.startTime=_c);
if(_a.parentTask){
if(!this.checkPosParentTask(_a.parentTask,_a)){
var _d=new Date(_a.parentTask.startTime);
_d.setHours(_d.getHours()+(_a.parentTask.duration/this.hsPerDay*24));
_a.duration=parseInt((parseInt((_d-_a.startTime)/(1000*60*60)))*this.hsPerDay/24);
}
}
},correctPosParentTask:function(_e,_f){
if(!_f.previousTask){
if(_e.startTime>_f.startTime){
_f.startTime=new Date(_e.startTime);
}
if(!this.checkPosParentTask(_e,_f)){
_f.duration=_e.duration;
}
}else{
this.correctPosPreviousTask(_f.previousTask,_f);
}
},checkPosParentTaskInTree:function(_10){
var _11=false;
for(var i=0;i<_10.cldTasks.length;i++){
var _12=_10.cldTasks[i];
if(!this.checkPosParentTask(_10,_12)){
if(!this.correctError){
return true;
}else{
this.correctPosParentTask(_10,_12);
}
}
if(_10.startTime>_12.startTime){
if(!this.correctError){
return true;
}else{
this.correctPosParentTask(_10,_12);
}
}
if(_12.cldTasks.length>0){
_11=this.checkPosParentTaskInTree(_12);
}
}
return _11;
},setPreviousTask:function(_13){
var _14=false;
for(var i=0;i<_13.parentTasks.length;i++){
var _15=_13.parentTasks[i];
if(_15.previousTaskId){
_15.previousTask=_13.getTaskById(_15.previousTaskId);
if(!_15.previousTask){
if(!this.correctError){
return true;
}
}
_15.previousTask.cldPreTasks.push(_15);
}
if(_15.previousTask){
if(!this.checkPosPreviousTask(_15.previousTask,_15)){
if(!this.correctError){
return true;
}else{
this.correctPosPreviousTask(_15.previousTask,_15);
}
}
}
_14=this.setPreviousTaskInTree(_15);
}
return _14;
},setPreviousTaskInTree:function(_16){
var _17=false;
for(var i=0;i<_16.cldTasks.length;i++){
var _18=_16.cldTasks[i];
if(_18.previousTaskId){
_18.previousTask=_16.project.getTaskById(_18.previousTaskId);
if(!_18.previousTask){
if(!this.correctError){
return true;
}
}
if(!this.checkPosPreviousTask(_18.previousTask,_18)){
if(!this.correctError){
return true;
}else{
this.correctPosPreviousTask(_18.previousTask,_18);
}
}
_18.previousTask.cldPreTasks.push(_18);
}
if(_18.cldTasks.length>0){
_17=this.setPreviousTaskInTree(_18);
}
}
return _17;
},checkPosParentTask:function(_19,_1a){
var _1b=this.getWidthOnDuration(_19.duration);
var _1c=this.getPosOnDate(_19.startTime);
var _1d=this.getPosOnDate(_1a.startTime);
var _1e=this.getWidthOnDuration(_1a.duration);
return (_1b+_1c)>=(_1d+_1e);
},addProject:function(_1f){
this.project.push(_1f);
},deleteProject:function(id){
var _20=this.getProject(id);
if(_20){
if(_20.arrTasks.length>0){
while(_20.arrTasks.length>0){
_20.deleteChildTask(_20.arrTasks[0]);
}
}
var _21=this.heightTaskItemExtra+this.heightTaskItem;
_20.nextProject&&_20.shiftNextProject(_20,-_21);
this.project=dojo.filter(this.project,function(_22){
return _22.id!=_20.project.id;
},this);
if((_20.previousProject)&&(_20.nextProject)){
var _23=_20.previousProject;
_23.nextProject=_20.nextProject;
}
if((_20.previousProject)&&!(_20.nextProject)){
var _23=_20.previousProject;
_23.nextProject=null;
}
if(!(_20.previousProject)&&(_20.nextProject)){
var _24=_20.nextProject;
_24.previousProject=null;
}
for(var i=0;i<this.arrProjects.length;i++){
if(this.arrProjects[i].project.id==id){
this.arrProjects.splice(i,1);
}
}
_20.projectItem[0].parentNode.removeChild(_20.projectItem[0]);
_20.descrProject.parentNode.removeChild(_20.descrProject);
_20.projectNameItem.parentNode.removeChild(_20.projectNameItem);
this.contentDataHeight-=this.heightTaskItemExtra+this.heightTaskItem;
if(this.project.length==0){
var d=new Date(this.startDate);
var t=new Date(d.setDate(d.getDate()+1));
var pi=new dojox.gantt.GanttProjectItem({id:1,name:"New Project",startDate:t});
this.project.push(pi);
var _20=new dojox.gantt.GanttProjectControl(this,pi);
_20.create();
this.arrProjects.push(_20);
this.contentDataHeight+=this.heightTaskItemExtra+this.heightTaskItem;
}
this.checkPosition();
}
},insertProject:function(id,_25,_26){
if(this.startDate>=_26){
return false;
}
if(this.getProject(id)){
return false;
}
this.checkHeighPanelTasks();
var _27=new dojox.gantt.GanttProjectItem({id:id,name:_25,startDate:_26});
this.project.push(_27);
var _28=new dojox.gantt.GanttProjectControl(this,_27);
for(var i=0;i<this.arrProjects.length;i++){
var _29=this.arrProjects[i],_2a=this.arrProjects[i-1],_2b=this.arrProjects[i+1];
if(_26<_29.project.startDate){
this.arrProjects.splice(i,0,_28);
if(i>0){
_28.previousProject=_2a;
_2a.nextProject=_28;
}
if(i+1<=this.arrProjects.length){
_28.nextProject=_2b;
_2b.previousProject=_28;
var _2c=this.heightTaskItem+this.heightTaskItemExtra;
_28.shiftNextProject(_28,_2c);
}
_28.create();
_28.hideDescrProject();
this.checkPosition();
return _28;
}
}
if(this.arrProjects.length>0){
this.arrProjects[this.arrProjects.length-1].nextProject=_28;
_28.previousProject=this.arrProjects[this.arrProjects.length-1];
}
this.arrProjects.push(_28);
_28.create();
_28.hideDescrProject();
this.checkPosition();
return _28;
},openTree:function(_2d){
var _2e=this.getLastCloseParent(_2d);
this.openNode(_2e);
_2d.taskItem.id!=_2e.taskItem.id&&this.openTree(_2d);
},openNode:function(_2f){
if(!_2f.isExpanded){
dojo.removeClass(_2f.cTaskNameItem[2],"ganttImageTreeExpand");
dojo.addClass(_2f.cTaskNameItem[2],"ganttImageTreeCollapse");
_2f.isExpanded=true;
_2f.shiftCurrentTasks(_2f,_2f.hideTasksHeight);
_2f.showChildTasks(_2f,_2f.isExpanded);
_2f.hideTasksHeight=0;
}
},getLastCloseParent:function(_30){
if(_30.parentTask){
if((!_30.parentTask.isExpanded)||(_30.parentTask.cTaskNameItem[2].style.display=="none")){
return this.getLastCloseParent(_30.parentTask);
}else{
return _30;
}
}else{
return _30;
}
},getProjectItemById:function(id){
return dojo.filter(this.project,function(_31){
return _31.id==id;
},this)[0];
},clearAll:function(){
this.contentDataHeight=0;
this.startDate=null;
this.clearData();
this.clearItems();
this.clearEvents();
},clearEvents:function(){
dojo.forEach(this._events,dojo.disconnect);
this._events=[];
},clearData:function(){
this.project=[];
this.arrProjects=[];
},clearItems:function(){
this.contentData.removeChild(this.contentData.firstChild);
this.contentData.appendChild(this.createPanelTasks());
this.panelNames.removeChild(this.panelNames.firstChild);
this.panelNames.appendChild(this.createPanelNamesTasks());
this.panelTime.removeChild(this.panelTime.firstChild);
},buildUIContent:function(){
this.project.sort(this.sortProjStartDate);
this.startDate=this.getStartDate();
this.panelTime.appendChild(this.createPanelTime());
for(var i=0;i<this.project.length;i++){
var _32=this.project[i];
for(var k=0;k<_32.parentTasks.length;k++){
var _33=_32.parentTasks[k];
if(_33.startTime){
this.setStartTimeChild(_33);
}else{
return;
}
if(this.setPreviousTask(_32)){
return;
}
}
for(var k=0;k<_32.parentTasks.length;k++){
var _33=_32.parentTasks[k];
if(_33.startTime<_32.startDate){
return;
}
if(this.checkPosParentTaskInTree(_33)){
return;
}
}
this.sortTasksByStartTime(_32);
}
for(var i=0;i<this.project.length;i++){
var _32=this.project[i];
var _34=new dojox.gantt.GanttProjectControl(this,_32);
if(this.arrProjects.length>0){
var _35=this.arrProjects[this.arrProjects.length-1];
_34.previousProject=_35;
_35.nextProject=_34;
}
_34.create();
this.checkHeighPanelTasks();
this.arrProjects.push(_34);
this.createTasks(_34);
}
this.resource&&this.resource.reConstruct();
this.postLoadData();
this.postBindEvents();
},loadJSONData:function(_36){
var _37=this;
_37.dataFilePath=_36||_37.dataFilePath;
dojo.xhrGet({url:_37.dataFilePath,sync:true,load:function(_38,_39){
_37.loadJSONString(_38);
_37.buildUIContent();
alert("Successfully! Loaded data from: "+_37.dataFilePath);
},error:function(err,_3a){
alert("Failed! Load error: "+_37.dataFilePath);
}});
},loadJSONString:function(_3b){
if(!_3b){
return;
}
this.clearAll();
var _3c=dojo.fromJson(_3b);
var _3d=_3c.items;
dojo.forEach(_3d,function(_3e){
var _3f=_3e.startdate.split("-");
var _40=new dojox.gantt.GanttProjectItem({id:_3e.id,name:_3e.name,startDate:new Date(_3f[0],(parseInt(_3f[1])-1),_3f[2])});
var _41=_3e.tasks;
dojo.forEach(_41,function(_42){
var id=_42.id,_43=_42.name,_44=_42.starttime.split("-");
duration=_42.duration,percentage=_42.percentage,previousTaskId=_42.previousTaskId,taskOwner=_42.taskOwner;
var _45=new dojox.gantt.GanttTaskItem({id:id,name:_43,startTime:new Date(_44[0],(parseInt(_44[1])-1),_44[2]),duration:duration,percentage:percentage,previousTaskId:previousTaskId,taskOwner:taskOwner});
var _46=_42.children;
if(_46.length!=0){
this.buildChildTasksData(_45,_46);
}
_40.addTask(_45);
},this);
this.addProject(_40);
},this);
},buildChildTasksData:function(_47,_48){
_48&&dojo.forEach(_48,function(_49){
var id=_49.id,_4a=_49.name,_4b=_49.starttime.split("-"),_4c=_49.duration,_4d=_49.percentage,_4e=_49.previousTaskId,_4f=_49.taskOwner;
var _50=new dojox.gantt.GanttTaskItem({id:id,name:_4a,startTime:new Date(_4b[0],(parseInt(_4b[1])-1),_4b[2]),duration:_4c,percentage:_4d,previousTaskId:_4e,taskOwner:_4f});
_50.parentTask=_47;
_47.addChildTask(_50);
var _51=_49.children;
if(_51.length!=0){
this.buildChildTasksData(_50,_51);
}
},this);
},getJSONData:function(){
var _52={identifier:"id",items:[]};
dojo.forEach(this.project,function(_53){
var _54={id:_53.id,name:_53.name,startdate:_53.startDate.getFullYear()+"-"+(_53.startDate.getMonth()+1)+"-"+_53.startDate.getDate(),tasks:[]};
_52.items.push(_54);
dojo.forEach(_53.parentTasks,function(_55){
var _56={id:_55.id,name:_55.name,starttime:_55.startTime.getFullYear()+"-"+(_55.startTime.getMonth()+1)+"-"+_55.startTime.getDate(),duration:_55.duration,percentage:_55.percentage,previousTaskId:(_55.previousTaskId||""),taskOwner:(_55.taskOwner||""),children:this.getChildTasksData(_55.cldTasks)};
_54.tasks.push(_56);
},this);
},this);
return _52;
},getChildTasksData:function(_57){
var _58=[];
_57&&_57.length>0&&dojo.forEach(_57,function(_59){
var _5a={id:_59.id,name:_59.name,starttime:_59.startTime.getFullYear()+"-"+(_59.startTime.getMonth()+1)+"-"+_59.startTime.getDate(),duration:_59.duration,percentage:_59.percentage,previousTaskId:(_59.previousTaskId||""),taskOwner:(_59.taskOwner||""),children:this.getChildTasksData(_59.cldTasks)};
_58.push(_5a);
},this);
return _58;
},saveJSONData:function(_5b){
var _5c=this;
_5c.dataFilePath=(_5b&&dojo.trim(_5b).length>0)?_5b:this.dataFilePath;
try{
var td=dojo.xhrPost({url:_5c.saveProgramPath,content:{filename:_5c.dataFilePath,data:dojo.toJson(_5c.getJSONData())},handle:function(res,_5d){
if((dojo._isDocumentOk(_5d.xhr))||(_5d.xhr.status==405)){
alert("Successfully! Saved data to "+_5c.dataFilePath);
}else{
alert("Failed! Saved error");
}
}});
}
catch(e){
alert("exception: "+e.message);
}
},sortTaskStartTime:function(a,b){
return a.startTime<b.startTime?-1:(a.startTime>b.startTime?1:0);
},sortProjStartDate:function(a,b){
return a.startDate<b.startDate?-1:(a.startDate>b.startDate?1:0);
},setStartTimeChild:function(_5e){
dojo.forEach(_5e.cldTasks,function(_5f){
if(!_5f.startTime){
_5f.startTime=_5e.startTime;
}
if(_5f.cldTasks.length!=0){
this.setStartTimeChild(_5f);
}
},this);
},createPanelTasks:function(){
var _60=dojo.create("div",{className:"ganttTaskPanel"});
dojo.style(_60,{height:(this.contentHeight-this.panelTimeHeight-this.scrollBarWidth)+"px"});
return _60;
},refreshParams:function(_61){
this.pixelsPerDay=_61;
this.pixelsPerWorkHour=this.pixelsPerDay/this.hsPerDay;
this.pixelsPerHour=this.pixelsPerDay/24;
},createPanelNamesTasksHeader:function(){
var _62=this;
var _63=dojo.create("div",{className:"ganttPanelHeader"});
var _64=dojo.create("table",{cellPadding:"0px",border:"0px",cellSpacing:"0px",bgColor:"#FFFFFF",className:"ganttToolbar"},_63);
var _65=_64.insertRow(_64.rows.length);
var _66=_64.insertRow(_64.rows.length);
var _67=_64.insertRow(_64.rows.length);
var _68=_64.insertRow(_64.rows.length);
var _69=dojo.create("td",{align:"center",vAlign:"middle",className:"ganttToolbarZoomIn"},_65);
var _6a=dojo.hitch(this,function(){
if(this.scale*2>5){
return;
}
this.scale=this.scale*2;
this.switchTeleMicroView(this.pixelsPerDay*this.scale);
});
dojo.disconnect(this.zoomInClickEvent);
this.zoomInClickEvent=dojo.connect(_69,"onclick",this,_6a);
dojo.disconnect(this.zoomInKeyEvent);
this.zoomInKeyEvent=dojo.connect(_69,"onkeydown",this,function(e){
if(e.keyCode!=dojo.keys.ENTER){
return;
}
_6a();
});
dojo.attr(_69,"tabIndex",0);
var _6b=dojo.create("td",{align:"center",vAlign:"middle",className:"ganttToolbarZoomOut"},_65);
var _6c=dojo.hitch(this,function(){
if(this.scale*0.5<0.2){
return;
}
this.scale=this.scale*0.5;
this.switchTeleMicroView(this.pixelsPerDay*this.scale);
});
dojo.disconnect(this.zoomOutClickEvent);
this.zoomOutClickEvent=dojo.connect(_6b,"onclick",this,_6c);
dojo.disconnect(this.zoomOutKeyEvent);
this.zoomOutKeyEvent=dojo.connect(_6b,"onkeydown",this,function(e){
if(e.keyCode!=dojo.keys.ENTER){
return;
}
_6c();
});
dojo.attr(_6b,"tabIndex",0);
var _6d=dojo.create("td",{align:"center",vAlign:"middle",className:"ganttToolbarMicro"},_66);
dojo.disconnect(this.microClickEvent);
this.microClickEvent=dojo.connect(_6d,"onclick",this,dojo.hitch(this,this.refresh,this.animation?15:1,0,2));
dojo.disconnect(this.microKeyEvent);
this.microKeyEvent=dojo.connect(_6d,"onkeydown",this,function(e){
if(e.keyCode!=dojo.keys.ENTER){
return;
}
_6d.blur();
this.refresh(this.animation?15:1,0,2);
});
dojo.attr(_6d,"tabIndex",0);
var _6e=dojo.create("td",{align:"center",vAlign:"middle",className:"ganttToolbarTele"},_66);
dojo.disconnect(this.teleClickEvent);
this.teleClickEvent=dojo.connect(_6e,"onclick",this,dojo.hitch(this,this.refresh,this.animation?15:1,0,0.5));
dojo.disconnect(this.teleKeyEvent);
this.teleKeyEvent=dojo.connect(_6e,"onkeydown",this,function(e){
if(e.keyCode!=dojo.keys.ENTER){
return;
}
_6e.blur();
this.refresh(this.animation?15:1,0,0.5);
});
dojo.attr(_6e,"tabIndex",0);
var _6f=dojo.create("td",{align:"center",vAlign:"middle",className:"ganttToolbarSave"},_67);
dojo.disconnect(this.saveClickEvent);
this.saveClickEvent=dojo.connect(_6f,"onclick",this,dojo.hitch(this,this.saveJSONData,""));
dojo.disconnect(this.saveKeyEvent);
this.saveKeyEvent=dojo.connect(_6f,"onkeydown",this,function(e){
if(e.keyCode!=dojo.keys.ENTER){
return;
}
this.saveJSONData("");
});
dojo.attr(_6f,"tabIndex",0);
var _70=dojo.create("td",{align:"center",vAlign:"middle",className:"ganttToolbarLoad"},_67);
dojo.disconnect(this.loadClickEvent);
this.loadClickEvent=dojo.connect(_70,"onclick",this,dojo.hitch(this,this.loadJSONData,""));
dojo.disconnect(this.loadKeyEvent);
this.loadKeyEvent=dojo.connect(_70,"onkeydown",this,function(e){
if(e.keyCode!=dojo.keys.ENTER){
return;
}
this.loadJSONData("");
});
dojo.attr(_70,"tabIndex",0);
var _71=[_69,_6b,_6d,_6e,_6f,_70],_72=["Enlarge timeline","Shrink timeline","Zoom in time zone(microscope view)","Zoom out time zone(telescope view)","Save gantt data to json file","Load gantt data from json file"];
dojo.forEach(_71,function(_73,i){
var _74=_72[i];
var _75=function(){
dojo.addClass(_73,"ganttToolbarActionHover");
dijit.showTooltip(_74,_73,["above","below"]);
};
_73.onmouseover=_75;
_73.onfocus=_75;
var _76=function(){
dojo.removeClass(_73,"ganttToolbarActionHover");
_73&&dijit.hideTooltip(_73);
};
_73.onmouseout=_76;
_73.onblur=_76;
},this);
return _63;
},createPanelNamesTasks:function(){
var _77=dojo.create("div",{innerHTML:"&nbsp;",className:"ganttPanelNames"});
dojo.style(_77,{height:(this.contentHeight-this.panelTimeHeight-this.scrollBarWidth)+"px",width:this.maxWidthPanelNames+"px"});
return _77;
},createPanelTime:function(){
var _78=dojo.create("div",{className:"ganttPanelTime"});
var _79=dojo.create("table",{cellPadding:"0px",border:"0px",cellSpacing:"0px",bgColor:"#FFFFFF",className:"ganttTblTime"},_78);
this.totalDays=this.countDays;
var _7a=_79.insertRow(_79.rows.length),_7b=oldYear=new Date(this.startDate).getFullYear(),_7c=0;
for(var i=0;i<this.countDays;i++,_7c++){
var _7d=new Date(this.startDate);
_7d.setDate(_7d.getDate()+i);
_7b=_7d.getFullYear();
if(_7b!=oldYear){
this.addYearInPanelTime(_7a,_7c,oldYear);
_7c=0;
oldYear=_7b;
}
}
this.addYearInPanelTime(_7a,_7c,_7b);
dojo.style(_7a,"display","none");
var _7e=_79.insertRow(_79.rows.length),_7f=oldMonth=new Date(this.startDate).getMonth(),_80=0,_81=1970;
for(var i=0;i<this.countDays;i++,_80++){
var _7d=new Date(this.startDate);
_7d.setDate(_7d.getDate()+i);
_7f=_7d.getMonth();
_81=_7d.getFullYear();
if(_7f!=oldMonth){
this.addMonthInPanelTime(_7e,_80,oldMonth,_81);
_80=0;
oldMonth=_7f;
}
}
this.addMonthInPanelTime(_7e,_80,_7f,_81);
var _82=_79.insertRow(_79.rows.length),_83=oldWeek=dojo.date.locale._getWeekOfYear(new Date(this.startDate)),_80=0;
for(var i=0;i<this.countDays;i++,_80++){
var _7d=new Date(this.startDate);
_7d.setDate(_7d.getDate()+i);
_83=dojo.date.locale._getWeekOfYear(_7d);
if(_83!=oldWeek){
this.addWeekInPanelTime(_82,_80,oldWeek);
_80=0;
oldWeek=_83;
}
}
this.addWeekInPanelTime(_82,_80,_83);
var _84=_79.insertRow(_79.rows.length);
for(var i=0;i<this.countDays;i++){
this.addDayInPanelTime(_84);
}
var _85=_79.insertRow(_79.rows.length);
for(var i=0;i<this.countDays;i++){
this.addHourInPanelTime(_85);
}
dojo.style(_85,"display","none");
return _78;
},adjustPanelTime:function(_86){
var _87=dojo.map(this.arrProjects,function(_88){
return (parseInt(_88.projectItem[0].style.left)+parseInt(_88.projectItem[0].firstChild.style.width)+_88.descrProject.offsetWidth+this.panelTimeExpandDelta);
},this).sort(function(a,b){
return b-a;
})[0];
if(this.maxTaskEndPos!=_87){
var _89=this.panelTime.firstChild.firstChild.rows;
for(var i=0;i<=4;i++){
this.removeCell(_89[i]);
}
var _8a=Math.round((_87+this.panelTimeExpandDelta)/this.pixelsPerDay);
this.totalDays=_8a;
var _8b=oldYear=new Date(this.startDate).getFullYear(),_8c=0;
for(var i=0;i<_8a;i++,_8c++){
var _8d=new Date(this.startDate);
_8d.setDate(_8d.getDate()+i);
_8b=_8d.getFullYear();
if(_8b!=oldYear){
this.addYearInPanelTime(_89[0],_8c,oldYear);
_8c=0;
oldYear=_8b;
}
}
this.addYearInPanelTime(_89[0],_8c,_8b);
var _8e=oldMonth=new Date(this.startDate).getMonth(),_8f=0,_90=1970;
for(var i=0;i<_8a;i++,_8f++){
var _8d=new Date(this.startDate);
_8d.setDate(_8d.getDate()+i);
_8e=_8d.getMonth();
_90=_8d.getFullYear();
if(_8e!=oldMonth){
this.addMonthInPanelTime(_89[1],_8f,oldMonth,_90);
_8f=0;
oldMonth=_8e;
}
}
this.addMonthInPanelTime(_89[1],_8f,_8e,_90);
var _91=oldWeek=dojo.date.locale._getWeekOfYear(new Date(this.startDate)),_8f=0;
for(var i=0;i<_8a;i++,_8f++){
var _8d=new Date(this.startDate);
_8d.setDate(_8d.getDate()+i);
_91=dojo.date.locale._getWeekOfYear(_8d);
if(_91!=oldWeek){
this.addWeekInPanelTime(_89[2],_8f,oldWeek);
_8f=0;
oldWeek=_91;
}
}
this.addWeekInPanelTime(_89[2],_8f,_91);
for(var i=0;i<_8a;i++){
this.addDayInPanelTime(_89[3]);
}
for(var i=0;i<_8a;i++){
this.addHourInPanelTime(_89[4]);
}
this.panelTime.firstChild.firstChild.style.width=this.pixelsPerDay*(_89[3].cells.length)+"px";
this.contentData.firstChild.style.width=this.pixelsPerDay*(_89[3].cells.length)+"px";
this.maxTaskEndPos=_87;
}
},addYearInPanelTime:function(row,_92,_93){
var _94="Year   "+_93;
var _95=dojo.create("td",{colSpan:_92,align:"center",vAlign:"middle",className:"ganttYearNumber",innerHTML:this.pixelsPerDay*_92>20?_94:"",innerHTMLData:_94},row);
dojo.style(_95,"width",(this.pixelsPerDay*_92)+"px");
},addMonthInPanelTime:function(row,_96,_97,_98){
var _99=this.months[_97]+(_98?" of "+_98:"");
var _9a=dojo.create("td",{colSpan:_96,align:"center",vAlign:"middle",className:"ganttMonthNumber",innerHTML:this.pixelsPerDay*_96>30?_99:"",innerHTMLData:_99},row);
dojo.style(_9a,"width",(this.pixelsPerDay*_96)+"px");
},addWeekInPanelTime:function(row,_9b,_9c){
var _9d="Week   "+_9c;
var _9e=dojo.create("td",{colSpan:_9b,align:"center",vAlign:"middle",className:"ganttWeekNumber",innerHTML:this.pixelsPerDay*_9b>20?_9d:"",innerHTMLData:_9d},row);
dojo.style(_9e,"width",(this.pixelsPerDay*_9b)+"px");
},addDayInPanelTime:function(row){
var _9f=new Date(this.startDate);
_9f.setDate(_9f.getDate()+parseInt(row.cells.length));
var _a0=dojo.create("td",{align:"center",vAlign:"middle",className:"ganttDayNumber",innerHTML:this.pixelsPerDay>20?_9f.getDate():"",innerHTMLData:String(_9f.getDate()),data:row.cells.length},row);
dojo.style(_a0,"width",this.pixelsPerDay+"px");
(_9f.getDay()>=5)&&dojo.addClass(_a0,"ganttDayNumberWeekend");
this._events.push(dojo.connect(_a0,"onmouseover",this,function(_a1){
var _a2=_a1.target||_a1.srcElement;
var _a3=new Date(this.startDate.getTime());
_a3.setDate(_a3.getDate()+parseInt(dojo.attr(_a2,"data")));
dijit.showTooltip(_a3.getFullYear()+"."+(_a3.getMonth()+1)+"."+_a3.getDate(),_a0,["above","below"]);
}));
this._events.push(dojo.connect(_a0,"onmouseout",this,function(_a4){
var _a5=_a4.target||_a4.srcElement;
_a5&&dijit.hideTooltip(_a5);
}));
},addHourInPanelTime:function(row){
var _a6=dojo.create("td",{align:"center",vAlign:"middle",className:"ganttHourNumber",data:row.cells.length},row);
dojo.style(_a6,"width",this.pixelsPerDay+"px");
var _a7=dojo.create("table",{cellPadding:"0",cellSpacing:"0"},_a6);
var _a8=_a7.insertRow(_a7.rows.length);
for(var i=0;i<this.hsPerDay;i++){
var _a9=dojo.create("td",{className:"ganttHourClass"},_a8);
dojo.style(_a9,"width",(this.pixelsPerDay/this.hsPerDay)+"px");
dojo.attr(_a9,"innerHTMLData",String(9+i));
if(this.pixelsPerDay/this.hsPerDay>5){
dojo.attr(_a9,"innerHTML",String(9+i));
}
dojo.addClass(_a9,i<=3?"ganttHourNumberAM":"ganttHourNumberPM");
}
},incHeightPanelTasks:function(_aa){
var _ab=this.contentData.firstChild;
_ab.style.height=parseInt(_ab.style.height)+_aa+"px";
},incHeightPanelNames:function(_ac){
var _ad=this.panelNames.firstChild;
_ad.style.height=parseInt(_ad.style.height)+_ac+"px";
},checkPosition:function(){
dojo.forEach(this.arrProjects,function(_ae){
dojo.forEach(_ae.arrTasks,function(_af){
_af.checkPosition();
},this);
},this);
},checkHeighPanelTasks:function(){
this.contentDataHeight+=this.heightTaskItemExtra+this.heightTaskItem;
if((parseInt(this.contentData.firstChild.style.height)<=this.contentDataHeight)){
this.incHeightPanelTasks(this.heightTaskItem+this.heightTaskItemExtra);
this.incHeightPanelNames(this.heightTaskItem+this.heightTaskItemExtra);
}
},sortTasksByStartTime:function(_b0){
_b0.parentTasks.sort(this.sortTaskStartTime);
for(var i=0;i<_b0.parentTasks.length;i++){
_b0.parentTasks[i]=this.sortChildTasks(_b0.parentTasks[i]);
}
},sortChildTasks:function(_b1){
_b1.cldTasks.sort(this.sortTaskStartTime);
for(var i=0;i<_b1.cldTasks.length;i++){
if(_b1.cldTasks[i].cldTasks.length>0){
this.sortChildTasks(_b1.cldTasks[i]);
}
}
return _b1;
},refresh:function(_b2,_b3,_b4){
if(this.arrProjects.length<=0){
return;
}
if(this.arrProjects[0].arrTasks.length<=0){
return;
}
if(!_b2||_b3>_b2){
this.refreshController();
if(this.resource){
this.resource.refresh();
}
this.tempDayInPixels=0;
this.panelNameHeadersCover&&dojo.style(this.panelNameHeadersCover,"display","none");
return;
}
if(this.tempDayInPixels==0){
this.tempDayInPixels=this.pixelsPerDay;
}
this.panelNameHeadersCover&&dojo.style(this.panelNameHeadersCover,"display","");
var dip=this.tempDayInPixels+this.tempDayInPixels*(_b4-1)*Math.pow((_b3/_b2),2);
this.refreshParams(dip);
dojo.forEach(this.arrProjects,function(_b5){
dojo.forEach(_b5.arrTasks,function(_b6){
_b6.refresh();
},this);
_b5.refresh();
},this);
setTimeout(dojo.hitch(this,function(){
this.refresh(_b2,++_b3,_b4);
}),15);
},switchTeleMicroView:function(dip){
var _b7=this.panelTime.firstChild.firstChild;
for(var i=0;i<5;i++){
if(dip>40){
dojo.style(_b7.rows[i],"display",(i==0||i==1)?"none":"");
}else{
if(dip<20){
dojo.style(_b7.rows[i],"display",(i==2||i==4)?"none":"");
}else{
dojo.style(_b7.rows[i],"display",(i==0||i==4)?"none":"");
}
}
}
},refreshController:function(){
this.contentData.firstChild.style.width=Math.max(1200,this.pixelsPerDay*this.totalDays)+"px";
this.panelTime.firstChild.style.width=this.pixelsPerDay*this.totalDays+"px";
this.panelTime.firstChild.firstChild.style.width=this.pixelsPerDay*this.totalDays+"px";
this.switchTeleMicroView(this.pixelsPerDay);
dojo.forEach(this.panelTime.firstChild.firstChild.rows,function(row){
dojo.forEach(row.childNodes,function(td){
var cs=parseInt(dojo.attr(td,"colSpan")||1);
var _b8=dojo.trim(dojo.attr(td,"innerHTMLData")||"");
if(_b8.length>0){
dojo.attr(td,"innerHTML",this.pixelsPerDay*cs<20?"":_b8);
}else{
dojo.forEach(td.firstChild.rows[0].childNodes,function(td){
var _b9=dojo.trim(dojo.attr(td,"innerHTMLData")||"");
dojo.attr(td,"innerHTML",this.pixelsPerDay/this.hsPerDay>10?_b9:"");
},this);
}
if(cs==1){
dojo.style(td,"width",(this.pixelsPerDay*cs)+"px");
if(_b8.length<=0){
dojo.forEach(td.firstChild.rows[0].childNodes,function(td){
dojo.style(td,"width",(this.pixelsPerDay*cs/this.hsPerDay)+"px");
},this);
}
}
},this);
},this);
},init:function(){
this.startDate=this.getStartDate();
dojo.style(this.content,{width:this.contentWidth+"px",height:this.contentHeight+"px"});
this.tableControl=dojo.create("table",{cellPadding:"0",cellSpacing:"0",className:"ganttTabelControl"});
var _ba=this.tableControl.insertRow(this.tableControl.rows.length);
this.content.appendChild(this.tableControl);
this.countDays=this.getCountDays();
this.panelTime=dojo.create("div",{className:"ganttPanelTimeContainer"});
dojo.style(this.panelTime,"height",this.panelTimeHeight+"px");
this.panelTime.appendChild(this.createPanelTime());
this.contentData=dojo.create("div",{className:"ganttContentDataContainer"});
dojo.style(this.contentData,"height",(this.contentHeight-this.panelTimeHeight)+"px");
this.contentData.appendChild(this.createPanelTasks());
var _bb=dojo.create("td",{vAlign:"top"});
this.panelNameHeaders=dojo.create("div",{className:"ganttPanelNameHeaders"},_bb);
dojo.style(this.panelNameHeaders,{height:this.panelTimeHeight+"px",width:this.maxWidthPanelNames+"px"});
this.panelNameHeaders.appendChild(this.createPanelNamesTasksHeader());
this.panelNames=dojo.create("div",{className:"ganttPanelNamesContainer"},_bb);
this.panelNames.appendChild(this.createPanelNamesTasks());
_ba.appendChild(_bb);
_bb=dojo.create("td",{vAlign:"top"});
var _bc=dojo.create("div",{className:"ganttDivCell"});
_bc.appendChild(this.panelTime);
_bc.appendChild(this.contentData);
_bb.appendChild(_bc);
_ba.appendChild(_bb);
dojo.style(this.panelNames,"height",(this.contentHeight-this.panelTimeHeight-this.scrollBarWidth)+"px");
dojo.style(this.panelNames,"width",this.maxWidthPanelNames+"px");
dojo.style(this.contentData,"width",(this.contentWidth-this.maxWidthPanelNames)+"px");
dojo.style(this.contentData.firstChild,"width",this.pixelsPerDay*this.countDays+"px");
dojo.style(this.panelTime,"width",(this.contentWidth-this.maxWidthPanelNames-this.scrollBarWidth)+"px");
dojo.style(this.panelTime.firstChild,"width",this.pixelsPerDay*this.countDays+"px");
if(this.isShowConMenu){
this.tabMenu=new dojox.gantt.TabMenu(this);
}
var _bd=this;
this.contentData.onscroll=function(){
_bd.panelTime.scrollLeft=this.scrollLeft;
if(_bd.panelNames){
_bd.panelNames.scrollTop=this.scrollTop;
if(_bd.isShowConMenu){
_bd.tabMenu.hide();
}
}
if(_bd.resource){
_bd.resource.contentData.scrollLeft=this.scrollLeft;
}
};
this.project.sort(this.sortProjStartDate);
for(var i=0;i<this.project.length;i++){
var _be=this.project[i];
for(var k=0;k<_be.parentTasks.length;k++){
var _bf=_be.parentTasks[k];
if(!_bf.startTime){
_bf.startTime=_be.startDate;
}
this.setStartTimeChild(_bf);
if(this.setPreviousTask(_be)){
return;
}
}
for(var k=0;k<_be.parentTasks.length;k++){
var _bf=_be.parentTasks[k];
if(_bf.startTime<_be.startDate){
if(!this.correctError){
return;
}else{
_bf.startTime=_be.startDate;
}
}
if(this.checkPosParentTaskInTree(_bf)){
return;
}
}
this.sortTasksByStartTime(_be);
}
for(var i=0;i<this.project.length;i++){
var _be=this.project[i];
var _c0=new dojox.gantt.GanttProjectControl(this,_be);
if(this.arrProjects.length>0){
var _c1=this.arrProjects[this.arrProjects.length-1];
_c0.previousProject=_c1;
_c1.nextProject=_c0;
}
_c0.create();
this.checkHeighPanelTasks();
this.arrProjects.push(_c0);
this.createTasks(_c0);
}
if(this.withResource){
this.resource=new dojox.gantt.GanttResourceItem(this);
this.resource.create();
}
this.postLoadData();
this.postBindEvents();
return this;
},postLoadData:function(){
dojo.forEach(this.arrProjects,function(_c2){
dojo.forEach(_c2.arrTasks,function(_c3){
_c3.postLoadData();
},this);
_c2.postLoadData();
},this);
var _c4=dojo.coords(this.panelNameHeaders);
if(!this.panelNameHeadersCover){
this.panelNameHeadersCover=dojo.create("div",{className:"ganttHeaderCover"},this.panelNameHeaders.parentNode);
dojo.style(this.panelNameHeadersCover,{left:_c4.l+"px",top:_c4.t+"px",height:_c4.h+"px",width:_c4.w+"px",display:"none"});
}
},postBindEvents:function(){
var pos=dojo.position(this.tableControl,true);
!dojo.isIE&&this._events.push(dojo.connect(this.tableControl,"onmousemove",this,function(_c5){
var _c6=_c5.srcElement||_c5.target;
if(_c6==this.panelNames.firstChild||_c6==this.contentData.firstChild){
var _c7=this.heightTaskItem+this.heightTaskItemExtra;
var _c8=parseInt(_c5.layerY/_c7)*_c7+this.panelTimeHeight-this.contentData.scrollTop;
if(_c8!=this.oldHLTop&&_c8<(pos.h-50)){
if(this.highLightDiv){
dojo.style(this.highLightDiv,"top",(pos.y+_c8)+"px");
}else{
this.highLightDiv=dojo.create("div",{className:"ganttRowHighlight"},dojo.body());
dojo.style(this.highLightDiv,{top:(pos.y+_c8)+"px",left:pos.x+"px",width:(pos.w-20)+"px",height:_c7+"px"});
}
}
this.oldHLTop=_c8;
}
}));
},getStartDate:function(){
dojo.forEach(this.project,function(_c9){
if(this.startDate){
if(_c9.startDate<this.startDate){
this.startDate=new Date(_c9.startDate);
}
}else{
this.startDate=new Date(_c9.startDate);
}
},this);
this.initialPos=24*this.pixelsPerHour;
return this.startDate?new Date(this.startDate.setHours(this.startDate.getHours()-24)):new Date();
},getCountDays:function(){
return parseInt((this.contentWidth-this.maxWidthPanelNames)/(this.pixelsPerHour*24));
},createTasks:function(_ca){
dojo.forEach(_ca.project.parentTasks,function(_cb,i){
if(i>0){
_ca.project.parentTasks[i-1].nextParentTask=_cb;
_cb.previousParentTask=_ca.project.parentTasks[i-1];
}
var _cc=new dojox.gantt.GanttTaskControl(_cb,_ca,this);
_ca.arrTasks.push(_cc);
_cc.create();
this.checkHeighPanelTasks();
if(_cb.cldTasks.length>0){
this.createChildItemControls(_cb.cldTasks,_ca);
}
},this);
},createChildItemControls:function(_cd,_ce){
_cd&&dojo.forEach(_cd,function(_cf,i){
if(i>0){
_cf.previousChildTask=_cd[i-1];
_cd[i-1].nextChildTask=_cf;
}
var _d0=new dojox.gantt.GanttTaskControl(_cf,_ce,this);
_d0.create();
this.checkHeighPanelTasks();
if(_cf.cldTasks.length>0){
this.createChildItemControls(_cf.cldTasks,_ce);
}
},this);
},getPosOnDate:function(_d1){
return (_d1-this.startDate)/(60*60*1000)*this.pixelsPerHour;
},getWidthOnDuration:function(_d2){
return Math.round(this.pixelsPerWorkHour*_d2);
},getLastChildTask:function(_d3){
return _d3.childTask.length>0?this.getLastChildTask(_d3.childTask[_d3.childTask.length-1]):_d3;
},removeCell:function(row){
while(row.cells[0]){
row.deleteCell(row.cells[0]);
}
}});
})();
}
