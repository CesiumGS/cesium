define([
	"dojo/_base/lang",
	"dojo/_base/array",	// dojo.forEach, dojo.every
	"dojo/_base/declare",	// declare
	"./_base",
	"./vector"
], function(lang, arrayUtil, declare, gfx3d, vectorUtil){

gfx3d.scheduler = {
	zOrder: function(buffer, order){
		order = order ? order : gfx3d.scheduler.order;
		buffer.sort(function(a, b){
			return order(b) - order(a);
		});
		return buffer;
	},

	bsp: function(buffer, outline){
		// console.debug("BSP scheduler");
		outline = outline ? outline : gfx3d.scheduler.outline;
		var p = new gfx3d.scheduler.BinarySearchTree(buffer[0], outline);
		arrayUtil.forEach(buffer.slice(1), function(item){ p.add(item, outline); });
		return p.iterate(outline);
	},

	// default implementation
	order: function(it){
		return it.getZOrder();
	},

	outline: function(it){
		return it.getOutline();
	}
};

var BST = declare("dojox.gfx3d.scheduler.BinarySearchTree", null, {
	constructor: function(obj, outline){
		// summary:
		//		build the binary search tree, using binary space partition algorithm.
		//		The idea is for any polygon, for example, (a, b, c), the space is divided by
		//		the plane into two space: plus and minus.
		//		
		//		for any arbitrary vertex p, if(p - a) dotProduct n = 0, p is inside the plane,
		//		> 0, p is in the plus space, vice versa for minus space.
		//		n is the normal vector that is perpendicular the plate, defined as:
		// |		n = ( b - a) crossProduct ( c - a )
		//		
		//		in this implementation, n is declared as normal, ,a is declared as orient.
		// obj: dojox.gfx3d.Object
		this.plus = null;
		this.minus = null;
		this.object = obj;

		var o = outline(obj);
		this.orient = o[0];
		this.normal = vectorUtil.normalize(o);
	},

	add: function(obj, outline){
		var epsilon = 0.5,
			o = outline(obj),
			v = vectorUtil,
			n = this.normal,
			a = this.orient,
			BST = gfx3d.scheduler.BinarySearchTree;

		if(
			arrayUtil.every(o, function(item){
				return Math.floor(epsilon + v.dotProduct(n, v.substract(item, a))) <= 0;
			})
		){
			if(this.minus){
				this.minus.add(obj, outline);
			}else{
				this.minus = new BST(obj, outline);
			}
		}else if(
			arrayUtil.every(o, function(item){
				return Math.floor(epsilon + v.dotProduct(n, v.substract(item, a))) >= 0;
			})
		){
			if(this.plus){
				this.plus.add(obj, outline);
			} else {
				this.plus = new BST(obj, outline);
			}
		}else{
			/*
			arrayUtil.forEach(o, function(item){
				console.debug(v.dotProduct(n, v.substract(item, a)));
			});
			*/
			throw "The case: polygon cross siblings' plate is not implemented yet";
		}
	},

	iterate: function(outline){
		var epsilon = 0.5;
		var v = vectorUtil;
		var sorted = [];
		var subs = null;
		// FIXME: using Infinity here?
		var view = {x: 0, y: 0, z: -10000};
		if(Math.floor( epsilon + v.dotProduct(this.normal, v.substract(view, this.orient))) <= 0){
			subs = [this.plus, this.minus];
		}else{
			subs = [this.minus, this.plus];
		}

		if(subs[0]){
			sorted = sorted.concat(subs[0].iterate());
		}

		sorted.push(this.object);

		if(subs[1]){
			sorted = sorted.concat(subs[1].iterate());
		}
		return sorted;
	}

});

gfx3d.drawer = {
	conservative: function(todos, objects, viewport){
		// console.debug('conservative draw');
		arrayUtil.forEach(this.objects, function(item){
			item.destroy();
		});
		arrayUtil.forEach(objects, function(item){
			item.draw(viewport.lighting);
		});
	},
	chart: function(todos, objects, viewport){
		// NOTE: ondemand may require the todos' objects to use setShape
		// to redraw themselves to maintain the z-order.

		// console.debug('chart draw');
		arrayUtil.forEach(this.todos, function(item){
			item.draw(viewport.lighting);
		});
	}
	// More aggressive optimization may re-order the DOM nodes using the order
	// of objects, and only elements of todos call setShape.
};

var api = { 
	scheduler: gfx3d.scheduler,
	drawer: gfx3d.drawer,
	BinarySearchTree: BST
};

return api;
});