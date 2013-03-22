define([
	"./GanttTaskItem",
	"dojo/_base/declare",
	"./GanttProjectControl",
	"dojo/domReady!"
], function(GanttTaskItem, declare){
	return declare("dojox.gantt.GanttProjectItem", [GanttTaskItem], {
		constructor: function(configuration){
			//id is required
			this.id = configuration.id;
			this.name = configuration.name || this.id;
			this.startDate = configuration.startDate || new Date();
			this.parentTasks = [];
		},
		getTaskById: function(id){
			for(var i = 0; i < this.parentTasks.length; i++){
				var pTask = this.parentTasks[i];
				var task = this.getTaskByIdInTree(pTask, id);
				if(task){
					return task;
				}
			}
			return null;
		},
		getTaskByIdInTree: function(parentTask, id){
			if(parentTask.id == id){
				return parentTask;
			}else{
				for(var i = 0; i < parentTask.cldTasks.length; i++){
					var pcTask = parentTask.cldTasks[i];
					if(pcTask.id == id){
						return pcTask;
					}
					if(pcTask.cldTasks.length > 0){
						if(pcTask.cldTasks.length > 0){
							var cTask = this.getTaskByIdInTree(pcTask, id);
							if(cTask){
								return cTask;
							}
						}
					}
				}
			}
			return null;
		},
		addTask: function(task){
			this.parentTasks.push(task);
			task.setProject(this);
		},
		deleteTask: function(id){
			var task = this.getTaskById(id);
			if(!task){return;}
			if(!task.parentTask){
				for(var i = 0; i < this.parentTasks.length; i++){
					var pTask = this.parentTasks[i];
					if(pTask.id == id){
						if(pTask.nextParentTask){
							if(pTask.previousParentTask){
								pTask.previousParentTask.nextParentTask = pTask.nextParentTask;
								pTask.nextParentTask.previousParentTask = pTask.previousParentTask;
							}else{
								pTask.nextParentTask.previousParentTask = null;
							}
						}else{
							if(pTask.previousParentTask){
								pTask.previousParentTask.nextParentTask = null;
							}
						}
						pTask = null;
						this.parentTasks.splice(i, 1);
						break;
					}
				}
			}else{
				var parentTask = task.parentTask;
				for(var i = 0; i < parentTask.cldTasks.length; i++){
					var pcTask = parentTask.cldTasks[i];
					if(pcTask.id == id){
						if(pcTask.nextChildTask){
							if(pcTask.previousChildTask){
								pcTask.previousChildTask.nextChildTask = pcTask.nextChildTask;
								pcTask.nextChildTask.previousChildTask = pcTask.previousChildTask;
							}else{
								pcTask.nextChildTask.previousChildTask = null;
							}
						}else{
							if(pcTask.previousChildTask){
								pcTask.previousChildTask.nextChildTask = null;
							}
						}
						pcTask = null;
						parentTask.cldTasks.splice(i, 1);
						break;
					}
				}
			}
		}
	});
});
