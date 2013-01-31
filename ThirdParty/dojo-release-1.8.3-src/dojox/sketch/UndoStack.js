define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"../xml/DomParser"
], function(dojo){
	dojo.getObject("sketch", true, dojox);
	var ta=dojox.sketch;
	ta.CommandTypes={ Create:"Create", Move:"Move", Modify:"Modify", Delete:"Delete", Convert:"Convert"};

	dojo.declare("dojox.sketch.UndoStack",null,{
		constructor: function(figure){
			this.figure=figure;
			this._steps=[];
			this._undoedSteps=[];
		},
		apply: function(state, from, to){
			//	the key here is to neutrally move from one state to another.
			//	we let the individual functions (i.e. undo and redo) actually
			//	determine the from and to; all we do here is implement it.

			//	check whether this is a fullText step
			if(!from && !to && state.fullText){
				this.figure.setValue(state.fullText);
				return;
			}

			var fromText=from.shapeText;
			var toText=to.shapeText;
			
			if(fromText.length==0&&toText.length==0){
				//	nothing to reapply?
				return;
			}
			if(fromText.length==0){
				//	We are creating.
				var o=dojox.xml.DomParser.parse(toText).documentElement;
				var a=this.figure._loadAnnotation(o);
				if(a) this.figure._add(a);
				return;
			}
			if(toText.length==0){
				//	we are deleting.
				var ann=this.figure.getAnnotator(from.shapeId);
				this.figure._delete([ann],true);
				return;
			}
			
			//	we can simply reinit and draw from the shape itself,
			//		regardless of the actual command.
			var nann=this.figure.getAnnotator(to.shapeId);
			var no=dojox.xml.DomParser.parse(toText).documentElement;
			nann.draw(no);
			this.figure.select(nann);
			return;
		},
		//	stack methods.
		add: function(/*String*/cmd, /*ta.Annotation?*/ann, /*String?*/before){
			var id=ann?ann.id:'';
			//var bbox=ann?ann.getBBox():{};
			var after=ann?ann.serialize():"";
			if(cmd==ta.CommandTypes.Delete){ after=""; }
			
			/*if(ann){
				//	fix the bbox x/y coords
				var t=ann.transform;
				bbox.x+=t.dx;
				bbox.y+=t.dy;
			}*/
			var state={
				cmdname:cmd,
				//bbox:bbox,
//					fullText:fullText,
				before:{
					shapeId: id,
					shapeText:before||''
				},
				after:{
					shapeId: id,
					shapeText:after
				}
			};
			//console.log('dojox.sketch history add',state);
			this._steps.push(state);
			this._undoedSteps = [];
		},
		destroy: function(){},
		undo: function(){
			var state=this._steps.pop();
			if(state){
				this._undoedSteps.push(state);
				this.apply(state,state.after,state.before);
			}
		},
		redo: function(){
			var state=this._undoedSteps.pop();
			if(state){
				this._steps.push(state);
				this.apply(state,state.before,state.after);
			}
		}
	});

	return dojox.sketch.UndoStack;
});
