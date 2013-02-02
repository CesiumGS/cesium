define([
	"dojo/_base/declare",
	"dijit/_WidgetBase",
	"dojo/dom-construct",
	"dojo/query",
	"dojo/date",
	"dojo/_base/window"
], function(declare, _WidgetBase, domConstruct, query, dojoDate, win){
	return declare("dojox.widget._CalendarView", _WidgetBase, {
		// summary:
		//		Base implementation for all view mixins.
		//		All calendar views should extend this widget.
		headerClass: "",

		useHeader: true,

		cloneClass: function(clazz, n, before){
			// summary:
			//		Clones all nodes with the class 'clazz' in a widget
			var template = query(clazz, this.domNode)[0];
			var i;
			if(!before){
				for(i = 0; i < n; i++){
					template.parentNode.appendChild(template.cloneNode(true));
				}
			}else{
				// XXX: this is the same as template!
				var bNode = query(clazz, this.domNode)[0];
				for(i = 0; i < n; i++){
					template.parentNode.insertBefore(template.cloneNode(true), bNode);
				}
			}
		},

		_setText: function(node, text){
			// summary:
			//		Sets the text inside a node
			if(node.innerHTML != text){
				domConstruct.empty(node);
				node.appendChild(win.doc.createTextNode(text));
			}
		},

		getHeader: function(){
			// summary:
			//		Returns the header node of a view. If none exists,
			//		an empty DIV is created and returned.
			return this.header || (this.header = domConstruct.create("span", { "class":this.headerClass }));
		},

		onValueSelected: function(date){
			//Stub function called when a date is selected
		},

		adjustDate: function(date, amount){
			// summary:
			//		Adds or subtracts values from a date.
			//		The unit, e.g. "day", "month" or "year", is
			//		specified in the "datePart" property of the
			//		calendar view mixin.
			return dojoDate.add(date, this.datePart, amount);
		},

		onDisplay: function(){
			// summary:
			//		Stub function that can be used to tell a view when it is shown.
		},

		onBeforeDisplay: function(){
			// summary:
			//		Stub function that can be used to tell a view it is about to be shown.
		},

		onBeforeUnDisplay: function(){
			// summary:
			//		Stub function that can be used to tell
			//		a view when it is no longer shown.
		}
	});
});
