dojo.provide("dojox.sketch.tests.FTHelper");

dojo.declare('dojox.sketch.tests.FTHelper',null,{
    controlCss: "#dojox_sketch_Toolbar_0 .dijitButtonContents",
    canvas:'canvas',
    defaultDelay: 100,
    //controls: ['lead','single','double','underline','preexisting'];
    constructor: function(args){
        this.controls=['lead','single','double','underline','preexisting'];
        if(args){
            dojo.mixin(this,args);
        }
    },
    selectShape: function(shape,delay){
        delay=delay||this.defaultDelay;
        var i=dojo.indexOf(this.controls,shape);
        if(i<0){
            throw Error('shape "'+shape+'" is not recognized');
        }
        var buttons=dojo.query(this.controlCss);
        if(buttons.length<=i){
            throw Error('Can not find button for shape "'+shape+'" on the toolbar');
        }
        var button=buttons[i];
        doh.robot.mouseMoveAt(button,delay);
        doh.robot.mouseClick({left:true},delay);
    },
    drawShape: function(start,end,delay){
        delay=delay||this.defaultDelay;
        if(!this.coords){
            this.coords=dojo.coords(this.canvas);
        }
        end=end||start;
        doh.robot.mouseMove(this.coords.x+start.x,this.coords.y+start.y,delay,1);
        doh.robot.mousePress({left:1},delay);
        doh.robot.mouseMove(this.coords.x+end.x,this.coords.y+end.y,delay,1);
        doh.robot.mouseRelease({left:1},delay);
    },
    click: function(args,delay){
        delay=delay||this.defaultDelay;
        doh.robot.mouseMove(this.coords.x+args.x,this.coords.y+args.y,delay,1);
        doh.robot.mouseClick(args,delay);
    }
});