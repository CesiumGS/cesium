require(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/loader"], function(dojo, lang){
var path = window.location.pathname;
if (path.charAt(path.length)!="/"){
	path = path.split("/");
	path.pop();
	path=path.join("/");	
}
dojo.registerModulePath("app",path);

    // search script tag and create new tag in head to fix IE and Firefox not load script.
    // In IE, set script text to innerHTML with <script type="text/javascript" defer> can load script.
    // In Firefox and Chrome, not support defer in innerHTML, but support defer in static page.
    // Use string.match(/<script.*?>.*?<\/script>/, templateString) cannot get matches because templateString contains "\n".
    // So use string.indexOf to check "<script" and "</script>", then replace "<script*" to empty.
    var addDynamicScript = function(node){
        if (!node.templateString) {
            return;
        }
        var tempStr = node.templateString;
        var scriptText = "";
        var startIndex = tempStr.indexOf("<script");
        var endIndex = tempStr.indexOf("<\/script>");
        
        while ((startIndex > -1) && (endIndex > -1) && (endIndex > startIndex)) {
            var str = tempStr.substring(startIndex, endIndex);
            str = str.replace(/<script.*?>.*?/, "");
            scriptText += str;
            
            startIndex = tempStr.indexOf("<script", endIndex);
            endIndex = tempStr.indexOf("<\/script>", endIndex);
        }
        
        if (scriptText) {
            var header = document.getElementsByTagName('head')[0];
            var scriptTag = document.createElement('script');
            scriptTag.text = scriptText;
            header.appendChild(scriptTag);
        }
    };
    
    require(["dojo", "dojox/app/main", "dojox/json/ref", "dojo/text!app/config.json", "dojo/_base/connect"], function(dojo, Application, jsonRef, config, connect){
    //app = Application(dojox.json.ref.resolveJson(config), dojo.body());
    dojo.global.modelApp = {};
    modelApp.names = [{
            "Serial" : "360324",
            "First"  : "John",
            "Last"   : "Doe",
            "Email"  : "jdoe@us.ibm.com",
            "ShipTo" : {
                "Street" : "123 Valley Rd",
                "City"   : "Katonah",
                "State"  : "NY",
                "Zip"    : "10536"
            },
            "BillTo" : {
                "Street" : "17 Skyline Dr",
                "City"   : "Hawthorne",
                "State"  : "NY",
                "Zip"    : "10532"
            }
        }];
    modelApp.repeatData = [ 
                   {
                       "First"   : "Chad",
                       "Last"    : "Chapman",
                       "Location": "CA",
                       "Office"  : "1278",
                       "Email"   : "c.c@test.com",
                       "Tel"     : "408-764-8237",
                       "Fax"     : "408-764-8228"
                   },
                   {
                       "First"   : "Irene",
                       "Last"    : "Ira",
                       "Location": "NJ",
                       "Office"  : "F09",
                       "Email"   : "i.i@test.com",
                       "Tel"     : "514-764-6532",
                       "Fax"     : "514-764-7300"
                   },
                   {
                       "First"   : "John",
                       "Last"    : "Jacklin",
                       "Location": "CA",
                       "Office"  : "6701",
                       "Email"   : "j.j@test.com",
                       "Tel"     : "408-764-1234",
                       "Fax"     : "408-764-4321"
                   }
                   ];
        app = Application(jsonRef.fromJson(config));
        
        connect.subscribe("/app/loadchild", lang.hitch(app, function(node){
            console.log(node);
			addDynamicScript(node);
        }));
});
});