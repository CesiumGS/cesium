define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"./Annotation",
	"dijit/Toolbar",
	"dijit/form/Button"
], function(dojo){
	dojo.getObject("sketch", true, dojox);
	dojo.declare("dojox.sketch.ButtonGroup", null, {
		constructor: function(){
			this._childMaps={};
			this._children=[];
		},
		add: function(/*_Plugin*/ plugin){
			this._childMaps[plugin]=plugin.connect(plugin,'onActivate',dojo.hitch(this,'_resetGroup',plugin));
			this._children.push(plugin);
		},
	//	remove: function(/*_Plugin*/ plugin){
	//		widget.disconnect(this._childMaps[widget.id]);
	//		delete this._childMaps[widget.id];
	//		this._children.splice(this._children.indexOf(widget.id),1);
	//	},
		_resetGroup: function(p){
			var cs=this._children;
			dojo.forEach(cs,function(c){
				if(p!=c && c['attr']){
					c.attr('checked',false);
				}
			});
		}
	});

	dojo.declare("dojox.sketch.Toolbar", dijit.Toolbar, {
		figure: null,
		plugins: null,
		postCreate: function(){
			this.inherited(arguments);
			this.shapeGroup=new dojox.sketch.ButtonGroup;

			if(!this.plugins){
				this.plugins=['Lead','SingleArrow','DoubleArrow','Underline','Preexisting','Slider'];
			}
			this._plugins=[];

			dojo.forEach(this.plugins,function(obj){
				var name=dojo.isString(obj)?obj:obj.name;
				var p=new dojox.sketch.tools[name](obj.args||{});
				this._plugins.push(p);
				p.setToolbar(this);
				if(!this._defaultTool && p.button){
					this._defaultTool=p;
				}
			},this);
		},
		setFigure: function(f){
			this.figure = f;
			this.connect(f,'onLoad','reset');
			dojo.forEach(this._plugins, function(p){
				p.setFigure(f);
			});
		},
		destroy: function(){
			dojo.forEach(this._plugins,function(p){
				p.destroy();
			});
			this.inherited(arguments);
			delete this._defaultTool;
			delete this._plugins;
		},
		addGroupItem: function(/*_Plugin*/item,group){
			if(group!='toolsGroup'){
				console.error('not supported group '+group);
				return;
			}

			this.shapeGroup.add(item);
		},
		reset: function(){
			this._defaultTool.activate();
		},
		_setShape: function(s){
			if(!this.figure.surface) return;
			//	now do the action.
			if(this.figure.hasSelections()){
				for(var i=0; i<this.figure.selected.length; i++){
					var before=this.figure.selected[i].serialize();
					this.figure.convert(this.figure.selected[i], s);
					this.figure.history.add(dojox.sketch.CommandTypes.Convert, this.figure.selected[i], before);
				}
			}
		}
	});

	dojox.sketch.makeToolbar=function(node,figure){
		var toolbar=new dojox.sketch.Toolbar();
		toolbar.setFigure(figure);
		node.appendChild(toolbar.domNode);
		return toolbar;
	};

	return dojox.sketch.Toolbar;
});
