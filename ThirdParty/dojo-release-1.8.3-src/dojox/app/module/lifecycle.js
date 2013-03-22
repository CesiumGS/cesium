define(["dojo/_base/declare", "dojo/topic"], function(declare, topic){
    return declare(null, {
    
        lifecycle: {
            UNKNOWN: 0, //unknown
            STARTING: 1, //starting
            STARTED: 2, //started
            STOPPING: 3, //stopping
            STOPPED: 4 //stopped
        },
        
        _status: 0, //unknown
        
        getStatus: function(){
            return this._status;
        },
        
        setStatus: function(newStatus){
            this._status = newStatus;
            
            // publish /app/stauts event.
            // application can subscribe this event to do some status change operation.
            topic.publish("/app/status", newStatus);
        }
    });
});
