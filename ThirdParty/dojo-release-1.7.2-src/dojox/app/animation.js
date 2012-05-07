define(["dojo/_base/kernel", 
        "dojo/_base/lang",
        "dojo/_base/declare",
        "dojo/_base/array",
        "dojo/_base/Deferred",
        "dojo/DeferredList",
        "dojo/on",
        "dojo/_base/sniff"], 
        function(dojo, lang, declare, array, deferred, deferredList, on, has){
    //TODO create cross platform animation/transition effects
    var transitionEndEventName = "transitionend";
    var transitionPrefix = "t"; //by default use "t" prefix and "ransition" to make word "transition"
    var translateMethodStart = "translate3d(";//Android 2.x does not support translateX in CSS Transition, we need to use translate3d in webkit browsers
    var translateMethodEnd = ",0,0)";
    if(has("webkit")){
        transitionPrefix = "WebkitT";
        transitionEndEventName = "webkitTransitionEnd";
    }else if(has("mozilla")){
        transitionPrefix = "MozT";
        translateMethodStart = "translateX(";
        translateMethodEnd = ")";
    }
    
    

    //TODO find a way to lock the animation and prevent animation conflict
    declare("dojox.app.animation", null, {
        

        constructor: function(args){
            //default config should be in animation object itself instead of its prototype
            //otherwise, it might be easy for making mistake of modifying prototype
            var defaultConfig = {
                startState: {},
                endState: {},
                node: null,
                duration: 250,
                "in": true,
                direction: 1,
                autoClear: true
            };
            
            lang.mixin(this, defaultConfig);
            lang.mixin(this, args);
            
            //create the deferred object which will resolve after the animation is finished.
            //We can rely on "onAfterEnd" function to notify the end of a single animation,
            //but using a deferred object is easier to wait for multiple animations end.
            if(!this.deferred){
                this.deferred = new deferred();
            }
        },
        
        play: function(){
            //play the animation using CSS3 Transition
            dojox.app.animation.groupedPlay([this]);
        },
        
        //method to apply the state of the transition
        _applyState: function(state){
            var style = this.node.style;
            for(var property in state){
                if(state.hasOwnProperty(property)){
                    style[property] = state[property];
                }
            }
        },
        
        //method to initialize state for transition
        initState: function(){
            
            //apply the immediate style change for initial state.
            this.node.style[transitionPrefix + "ransitionProperty"] = "none";
            this.node.style[transitionPrefix + "ransitionDuration"] = "0ms";
            this._applyState(this.startState);
            
        },
        
        _beforeStart: function(){
            if (this.node.style.display === "none"){
                this.node.style.display = "";
            }
            this.beforeStart();
        },
        
        _beforeClear: function(){
            this.node.style[transitionPrefix + "ransitionProperty"] = null;
            this.node.style[transitionPrefix + "ransitionDuration"] = null;
            if(this["in"] !== true){
                this.node.style.display = "none";
            }            
            this.beforeClear();
        },
        
        _onAfterEnd: function(){
            this.deferred.resolve(this.node);
            if(this.node.id && dojox.app.animation.playing[this.node.id]===this.deferred){
                delete dojox.app.animation.playing[this.node.id];
            }
            this.onAfterEnd();
        },
        
        beforeStart: function(){
            
        },
        
        beforeClear: function(){
            
        },
        
        onAfterEnd: function(){
            
        },
        
        //method to start the transition
        start: function(){
            this._beforeStart();
            
            var self = this;
            //change the transition duration
            self.node.style[transitionPrefix + "ransitionProperty"] = "all";
            self.node.style[transitionPrefix + "ransitionDuration"] = self.duration + "ms";
            
            //connect to clear the transition state after the transition end.
            //Since the transition is conducted asynchronously, we need to 
            //connect to transition end event to clear the state
            on.once(self.node, transitionEndEventName, function(){
                self.clear();
            });
            
            this._applyState(this.endState);
        },
        
        //method to clear state after transition
        clear: function(){
            this._beforeClear();
            this._removeState(this.endState);
            console.log(this.node.id + " clear.");
            this._onAfterEnd();
        },
        
        //create removeState method
        _removeState: function(state){
            var style = this.node.style;
            for(var property in state){
                if(state.hasOwnProperty(property)){
                    style[property] = null;
                }
            }
        }
        
    });
    
    //TODO add the lock mechanism for all of the transition effects
    //     consider using only one object for one type of transition.
    //TODO create the first animation, slide.
    dojox.app.animation.slide = function(node, config){

        //TODO create the return and set the startState, endState of the return
        var ret = new dojox.app.animation(config);
        ret.node = node;
        
        var startX = "0";
        var endX = "0";
        
        if(ret["in"]){
            if(ret.direction === 1){
                startX = "100%";
            }else{
                startX = "-100%";
            }
        }else{
            if(ret.direction === 1){
                endX = "-100%";
            }else{
                endX = "100%";
            }
        }
        
        
        ret.startState[transitionPrefix + "ransform"]=translateMethodStart+startX+translateMethodEnd;
        
        ret.endState[transitionPrefix + "ransform"]=translateMethodStart+endX+translateMethodEnd;
        
        return ret;
    };
        
    
    //fade in/out animation effects
    dojox.app.animation.fade = function(node, config){
        
        var ret = new dojox.app.animation(config);
        ret.node = node;
        
        var startOpacity = "0";
        var endOpacity = "0";
        
        if(ret["in"]){
            endOpacity = "1";
        }else{
            startOpacity = "1";
        }
        
        lang.mixin(ret, {
            startState:{
                "opacity": startOpacity
            },
            endState:{
                "opacity": endOpacity
            }
        });
        
        return ret;
    };
    
  //fade in/out animation effects
    dojox.app.animation.flip = function(node, config){
        
        var ret = new dojox.app.animation(config);
        ret.node = node;
       
        if(ret["in"]){
            //Need to set opacity here because Android 2.2 has bug that
            //scale(...) in transform does not persist status
            lang.mixin(ret,{
                startState:{
                    "opacity": "0"
                },
                endState:{
                    "opacity": "1"
                }
            });
            ret.startState[transitionPrefix + "ransform"]="scale(0,0.8) skew(0,-30deg)";
            ret.endState[transitionPrefix + "ransform"]="scale(1,1) skew(0,0)";
        }else{
            lang.mixin(ret,{
                startState:{
                    "opacity": "1"
                },
                endState:{
                    "opacity": "0"
                }
            });         
            ret.startState[transitionPrefix + "ransform"]="scale(1,1) skew(0,0)";
            ret.endState[transitionPrefix + "ransform"]="scale(0,0.8) skew(0,30deg)";
        }
        
        return ret;
    };
    
    var getWaitingList = function(/*Array*/ nodes){
        var defs = [];
        array.forEach(nodes, function(node){
            //check whether the node is under other animation
            if(node.id && dojox.app.animation.playing[node.id]){
                //TODO hook on deferred object in dojox.app.animation.playing
                defs.push(dojox.app.animation.playing[node.id]);
            }
            
        });
        return new deferredList(defs);
    };
    
    dojox.app.animation.getWaitingList = getWaitingList;
    
    //TODO groupedPlay should ensure the UI update happens when
    //all animations end.
    //the group player to start multiple animations together
    dojox.app.animation.groupedPlay = function(/*Array*/args){
        //args should be array of dojox.app.animation
        
        var animNodes = array.filter(args, function(item){
            return item.node;
        });
        
        var waitingList = getWaitingList(animNodes);

        //update registry with deferred objects in animations of args.
        array.forEach(args, function(item){
            if(item.node.id){
                dojox.app.animation.playing[item.node.id] = item.deferred;
            }
        });
        
        //TODO wait for all deferred object in deferred list to resolve
        dojo.when(waitingList, function(){
            array.forEach(args, function(item){
                //set the start state
                item.initState();
            });
            
            //Assume the fps of the animation should be higher than 30 fps and
            //allow the browser to use one frame's time to redraw so that
            //the transition can be started
            setTimeout(function(){
                array.forEach(args, function(item){
                    item.start();
                });            
            }, 33);
        });        
    };
    
    //the chain player to start multiple animations one by one
    dojox.app.animation.chainedPlay = function(/*Array*/args){
        //args should be array of dojox.app.animation
        
        var animNodes = array.filter(args, function(item){
            return item.node;
        });
        
        var waitingList = getWaitingList(animNodes);

        //update registry with deferred objects in animations of args.
        array.forEach(args, function(item){
            if(item.node.id){
                dojox.app.animation.playing[item.node.id] = item.deferred;
            }
        });
        
        dojo.when(waitingList, function(){
            array.forEach(args, function(item){
                //set the start state
                item.initState();
            });
            
            //chain animations together
            for (var i=1, len=args.length; i < len; i++){
                args[i-1].deferred.then(lang.hitch(args[i], function(){
                    this.start();
                }));
            }
            
            //Assume the fps of the animation should be higher than 30 fps and
            //allow the browser to use one frame's time to redraw so that
            //the transition can be started
            setTimeout(function(){
                args[0].start();
            }, 33);
        });        
    };
    
    //TODO complete the registry mechanism for animation handling and prevent animation conflicts
    dojox.app.animation.playing = {};
    
    return dojox.app.animation;
});
