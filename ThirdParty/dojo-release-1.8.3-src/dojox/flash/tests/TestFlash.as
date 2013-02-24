import DojoExternalInterface;
import ExpressInstall;

class TestFlash{
	private var message:String;
	
	public function TestFlash(){
	}
	
	public static function main(){
		//getURL("javascript:alert('main')");
		trace("main");
		DojoExternalInterface.initialize();
		
		var test = new TestFlash();
		DojoExternalInterface.addCallback("setMessage", test, test.setMessage);
		DojoExternalInterface.addCallback("getMessage", test, test.getMessage);
		DojoExternalInterface.addCallback("multipleValues",  test, test.multipleValues);
		DojoExternalInterface.addCallback("setMessageSlice", test, test.setMessageSlice);
		
		DojoExternalInterface.done();
	}
	
	public function setMessage(message:String):Number{
		this.message = message;
		return message.length;
	}
	
	public function setMessageSlice(message:String, start:Number, end:Number):Number{ 
		this.message = message.slice(start,end); 
		return message.length; 
	}
	
	public function getMessage():String{
		return this.message;
	}
	
	public function multipleValues(key:String, value:String, 
									namespace:String):String{
		return namespace + key + value;
	}
}