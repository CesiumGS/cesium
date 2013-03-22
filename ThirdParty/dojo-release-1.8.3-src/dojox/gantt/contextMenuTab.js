define([
	"./GanttTaskControl",
	"dijit/Menu",
	"dijit/Dialog",
	"dijit/form/NumberSpinner",
	"dijit/form/Button",
	"dijit/form/CheckBox",
	"dijit/form/DateTextBox",
	"dijit/form/TimeTextBox",
	"dijit/form/TextBox",
	"dijit/form/Form",
	"dijit/registry",
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/_base/html",
    "dojo/date/locale",
	"dojo/request",
	"dojo/dom",
	"dojo/dom-class",
	"dojo/domReady!"
], function(GanttTaskControl, Menu, Dialog, NumberSpinner, Button, CheckBox, DateTextBox, TimeTextBox, TextBox, Form,
		registry, declare, arrayUtil, lang, html, locale, request, 
		dom, domClass){
	return declare("dojox.gantt.contextMenuTab", [], {
		constructor: function(id, description, type, showOInfo, tabMenu, withDefaultValue){
			this.id = id;
			this.arrItems = [];
			this.TabItemContainer = null;
			this.Description = description;
			this.tabMenu = tabMenu;
			this.type = type;
			this.object = null;
			this.showObjectInfo = showOInfo;
			this.withDefaultValue = withDefaultValue;
		},
		preValueValidation: function(items){
			for(var i = 0; i < items.length; i++){
				var item = items[i];
				//TODO add more validation for Id, Name, .....
				if(item.required && !item.control.textbox.value){
					return false;
				}
			}
			return true;
		},
		encodeDate: function(date){
			return date.getFullYear() + "." + (date.getMonth() + 1) + "." + date.getDate();
		},
		decodeDate: function(dateStr){
			var arr = dateStr.split(".");
			return (arr.length < 3) ? "" : (new Date(arr[0], parseInt(arr[1]) - 1, arr[2]));
		},
		renameTaskAction: function(){
			var name = this.arrItems[0].control.textbox.value;
			if(lang.trim(name).length <= 0){
				return;
			}
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			this.object.setName(name);
			this.hide();
		},
		deleteAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			this.object.project.deleteTask(this.object.taskItem.id);
			this.hide();
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		durationUpdateAction: function(){
			var d = this.arrItems[0].control.textbox.value;
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			if(this.object.setDuration(d)){
				this.hide();
			}else{
				alert("Duration out of Range");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.refresh();
		},
		cpUpdateAction: function(){
			var p = this.arrItems[0].control.textbox.value;
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			if(this.object.setPercentCompleted(p)){
				this.hide();
			}else{
				alert("Complete Percentage out of Range");
			}
		},
		ownerUpdateAction: function(){
			var to = this.arrItems[0].control.textbox.value;
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			if(this.object.setTaskOwner(to)){
				this.hide();
			}else{
				alert("Task owner not Valid");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		ptUpdateAction: function(){
			var p = this.arrItems[0].control.textbox.value;
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			if(this.object.setPreviousTask(p)){
				this.hide();
			}else{
				alert("Please verify the Previous Task (" + p + ")  and adjust its Time Range");
			}
		},
		renameProjectAction: function(){
			var name = this.arrItems[0].control.textbox.value;
			if(lang.trim(name).length <= 0){
				return;
			}
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			this.object.setName(name);
			this.hide();
		},
		deleteProjectAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			this.object.ganttChart.deleteProject(this.object.project.id);
			this.hide();
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		cpProjectAction: function(){
			var p = this.arrItems[0].control.textbox.value;
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			if(this.object.setPercentCompleted(p)){
				this.hide();
			}else{
				alert("Percentage not Acceptable");
			}
		},
		addTaskAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			var id = this.arrItems[0].control.textbox.value,
				name = this.arrItems[1].control.textbox.value,
				startTime = this.decodeDate(this.arrItems[2].control.textbox.value),
				duration = this.arrItems[3].control.textbox.value,
				pc = this.arrItems[4].control.textbox.value,
				owner = this.arrItems[5].control.textbox.value,
				parentTaskId = this.arrItems[6].control.textbox.value,
				predTaskId = this.arrItems[7].control.textbox.value;
			if(lang.trim(id).length <= 0){
				return;
			}
			if(this.object.insertTask(id, name, startTime, duration, pc, predTaskId, owner, parentTaskId)){
				this.hide();
			}else{
				alert("Please adjust your Customization");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		addSuccessorTaskAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			var pr = this.object.project,
				id = this.arrItems[0].control.textbox.value,
				name = this.arrItems[1].control.textbox.value,
				startTime = this.decodeDate(this.arrItems[2].control.textbox.value),
				duration = this.arrItems[3].control.textbox.value,
				pc = this.arrItems[4].control.textbox.value,
				owner = this.arrItems[5].control.textbox.value;
			if(lang.trim(id).length <= 0){
				return;
			}
			var parentTaskId = !this.object.parentTask ? "" : this.object.parentTask.taskItem.id;
			var predTaskId = this.object.taskItem.id;
			if(pr.insertTask(id, name, startTime, duration, pc, predTaskId, owner, parentTaskId)){
				this.hide();
			}else{
				alert("Please adjust your Customization");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		addChildTaskAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			var pr = this.object.project,
				id = this.arrItems[0].control.textbox.value,
				name = this.arrItems[1].control.textbox.value,
				startTime = this.decodeDate(this.arrItems[2].control.textbox.value),
				duration = this.arrItems[3].control.textbox.value,
				pc = this.arrItems[4].control.textbox.value,
				owner = this.arrItems[5].control.textbox.value,
				parentTaskId = this.object.taskItem.id,
				predTaskId = "";
			if(lang.trim(id).length <= 0){
				return;
			}
			if(pr.insertTask(id, name, startTime, duration, pc, predTaskId, owner, parentTaskId)){
				this.hide();
			}else{
				alert("Please adjust your Customization");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
		addProjectAction: function(){
			if(!this.preValueValidation(this.arrItems)){
				return;
			}
			var id = this.arrItems[0].control.textbox.value,
			namePr = this.arrItems[1].control.textbox.value,
			startDatePr = this.decodeDate(this.arrItems[2].control.textbox.value);
			if(lang.trim(id).length <= 0 || lang.trim(namePr).length <= 0){
				return;
			}
			if(this.tabMenu.ganttChart.insertProject(id, namePr, startDatePr)){
				this.hide();
			}else{
				alert("Please adjust your Customization");
				return;
			}
			this.tabMenu.ganttChart.resource && this.tabMenu.ganttChart.resource.reConstruct();
		},
	
		addAction: function(handler){
			this.actionFunc = this[handler];
		},
		addItem: function(id, name, key, required){
			var inputControl;
			if(key == "startTime" || key == "startDate"){
				inputControl = new DateTextBox({type:"text", constraints:{datePattern:"yyyy.M.d", strict:true}});
			}else if(key == "percentage"){
				inputControl = new NumberSpinner({ constraints:{ max:100, min:0 }});
			}else if(key == "duration"){
				inputControl = new NumberSpinner({ constraints:{ min:0 }});
			}else{
				inputControl = new TextBox();
			}
			this.arrItems.push({
				id: id,
				name: name,
				control: inputControl,
				tab: this,
				key: key,
				required: required
			});
		},
		show: function(){
			this.tabMenu.tabPanelDlg = this.tabMenu.tabPanelDlg || registry.byId(this.tabMenu.tabPanelDlgId) ||
				new Dialog({
					title: "Settings"
				});
			try{
				this.tabMenu.tabPanelDlg.show();
			}catch(e){
				console.log("dialog show exception: " + e.message);
				return;
			}
			this.tabMenu.tabPanelDlg.titleNode.innerHTML = this.Description;
			var content = this.tabMenu.paneContentArea.firstChild.rows[1].cells[0].firstChild;
			var cell, cellValue, row = null;
		
			if(this.showObjectInfo){
				if(this.object){
					if(this.object.constructor == GanttTaskControl){
						this.insertData(content, "Id", this.object.taskItem.id);
						this.insertData(content, "Name", this.object.taskItem.name);
						this.insertData(content, "Start Time", this.encodeDate(this.object.taskItem.startTime));
						this.insertData(content, "Duration (hours)", this.object.taskItem.duration + " hours");
						this.insertData(content, "Percent Complete (%)", this.object.taskItem.percentage + "%");
						this.insertData(content, "Task Assignee", this.object.taskItem.taskOwner);
						this.insertData(content, "Previous Task Id", this.object.taskItem.previousTaskId);
					}else{
						this.insertData(content, "Id", this.object.project.id);
						this.insertData(content, "Name", this.object.project.name);
						this.insertData(content, "Start date", this.encodeDate(this.object.project.startDate));
					}
				}
			}
			//separator
			row = content.insertRow(content.rows.length);
			cell = row.insertCell(row.cells.length);
			cell.colSpan = 2;
			cell.innerHTML = "<hr/>";
			//input section header
			row = content.insertRow(content.rows.length);
			cell = row.insertCell(row.cells.length);
			cell.colSpan = 2;
			domClass.add(cell, "ganttMenuDialogInputCellHeader");
			cell.innerHTML = "Customization: " + this.Description;
			//input details
			arrayUtil.forEach(this.arrItems, function(item){
				row = content.insertRow(content.rows.length);
				cell = row.insertCell(row.cells.length);
				domClass.add(cell, "ganttMenuDialogInputCell");
				cellValue = row.insertCell(row.cells.length);
				domClass.add(cellValue, "ganttMenuDialogInputCellValue");
				cell.innerHTML = item.name;
				cellValue.appendChild(item.control.domNode);
				//initialize default value
				if(this.withDefaultValue && this.object){
					if(this.object.constructor == GanttTaskControl){
						if(item.key == "startTime"){
							item.control.textbox.value = this.encodeDate(this.object.taskItem.startTime);
						}else{
							item.control.textbox.value = item.key ? this.object.taskItem[item.key] : "";
						}
					}else{
						if(item.key == "startDate"){
							item.control.textbox.value = this.encodeDate(this.object.project.startDate);
						}else{
							item.control.textbox.value = item.key ? (this.object.project[item.key] || this.object[item.key] || "") : "";
						}
					}
				}else{
					//HTML5 placeholder property
					item.control.textbox.placeholder = item.required ? "---required---" : "---optional---";
				}
			}, this);
			this.tabMenu.ok.onClick = lang.hitch(this, this.actionFunc);
			this.tabMenu.cancel.onClick = lang.hitch(this, this.hide);
		},
		hide: function(){
			try{
				this.tabMenu.tabPanelDlg.hide();
			}catch(e){
				console.log("dialog show exception: " + e.message);
				this.tabMenu.tabPanelDlg.destroy();
			}
			var cell = this.tabMenu.paneContentArea.firstChild.rows[1].cells[0];
			cell.firstChild.parentNode.removeChild(cell.firstChild);
			cell.innerHTML = "<table></table>";
			domClass.add(cell.firstChild, "ganttDialogContentCell");
		},
		insertData: function(content, name, value){
			var cellValue,
				row = content.insertRow(content.rows.length),
				cell = row.insertCell(row.cells.length);
			domClass.add(cell, "ganttMenuDialogDescCell");
			cell.innerHTML = name;
			cellValue = row.insertCell(row.cells.length);
			domClass.add(cellValue, "ganttMenuDialogDescCellValue");
			cellValue.innerHTML = value;
		}
	});
});
