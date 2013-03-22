import java.security.*;
import java.applet.Applet;
import java.awt.*;
import java.util.*;
import java.util.concurrent.*;
import java.awt.event.*;
import netscape.javascript.*;
import java.io.*;
import java.lang.reflect.*;
import java.net.URL;
import java.awt.datatransfer.*;
import javax.swing.JOptionPane;
import javax.swing.JDialog;
import java.awt.image.*;

public final class DOHRobot extends Applet{
	// order of execution:
	// wait for user to trust applet
	// load security manager to prevent Safari hang
	// discover document root in screen coordinates
	// discover keyboard capabilities
	// tell doh to continue with the test

	// link to doh
	// To invoke doh, call eval with window.eval("jsexp")
	// Note that the "window" is an iframe!
	// You might need to break out of the iframe with an intermediate function
	// in the parent window.
	private JSObject window = null;

	// java.awt.Robot
	// drives the test
	// you need to sign the applet JAR for this to work
	private Robot robot = null;

	// In order to preserve the execution order of Robot commands,
	// we have to serialize commands by having them join() the previous one.
	// Otherwise, if you run doh.robot.typeKeys("dijit"), you frequently get something
	// like "diijt"
	//private static Thread previousThread = null;
	
	private static ExecutorService threadPool = null;

	// Keyboard discovery.
	// At init, the Robot types keys into a textbox and JavaScript tells the
	// Robot what it got back.
	// charMap maps characters to the KeyEvent that generates the character on
	// the user's machine.
	// charMap uses the Java 1.4.2 (lack of) template syntax for wider
	// compatibility.
	private static HashMap charMap = null;
	// Java key constants to iterate over
	// not all are available on all machines!
	private Vector vkKeys = null;
	// some state variables
	private boolean shift = false;
	private boolean altgraph = false;
	private boolean ctrl = false;
	private boolean alt = false;
	private boolean meta = false;
	private boolean numlockDisabled = false;
	private long timingError = 0; // how much time the last robot call was off by
	// shake hands with JavaScript the first keypess to wake up FF2/Mac
	private boolean jsready = false;
	private String keystring = "";

	// Firebug gets a little too curious about our applet for its own good
	// setting firebugIgnore to true ensures Firebug doesn't break the applet
	public boolean firebugIgnore = true;

	private static String os=System.getProperty("os.name").toUpperCase();
	private static Toolkit toolkit=Toolkit.getDefaultToolkit();
	
	private SecurityManager securitymanager;
	private double key = -1;

	// The screen x,y of the document upper left corner.
	// We only set it once so people are less likely to take it over.
	private boolean inited = false;
	private int docScreenX = -100;
	private int docScreenY = -100;
	private int docScreenXMax;
	private int docScreenYMax;
	private Point margin = null;
	private boolean mouseSecurity = false;
	private int dohscreen = -1;

	// The last reported mouse x,y.
	// If this is different from the real one, something's up.
	private int lastMouseX;
	private int lastMouseY;
	public int dir=1;

	// save a pointer to doh.robot for fast access
	JSObject dohrobot = null;

	// trackingImage to visually track robot down
	private BufferedImage trackingImage;
	Point locationOnScreen = null;

	// java.awt.Applet methods
	public void stop(){
		window = null;
		dohrobot = null;
		// only secure code run once
		if(key != -2){
			// prevent further execution of secure functions
			key = -2;
			// Java calls this when you close the window.
			// It plays nice and restores the old security manager.
			AccessController.doPrivileged(new PrivilegedAction(){
				public Object run(){
					if(threadPool!=null){
						threadPool.shutdownNow();
					}
					log("Stop");
					securitymanager.checkTopLevelWindow(null);
					log("Security manager reset");
					return null;
				}
			});
		}
	}

	final private class onvisible extends ComponentAdapter{
		public void componentShown(ComponentEvent evt){
			// sets the security manager to fix a bug in liveconnect in Safari on Mac
			if(key != -1){ return; }
			Runnable thread = new Runnable(){
				public void run(){
					log("Document root: ~"+applet().getLocationOnScreen().toString());
					while(true){
						try{
							window = (JSObject) JSObject.getWindow(applet());
							break;
						}catch(Exception e){
							// wait
						}
					}
					AccessController.doPrivileged(new PrivilegedAction(){
						public Object run(){
							log("> init Robot");
							try{
								SecurityManager oldsecurity = System.getSecurityManager();
								boolean needsSecurityManager = applet().getParameter("needsSecurityManager").equals("true");
								log("Socket connections managed? "+needsSecurityManager);
								try{
									securitymanager = oldsecurity;
									securitymanager.checkTopLevelWindow(null);
									// xdomain
									if(charMap == null){
										if(!confirm("DOH has detected that the current Web page is attempting to access DOH,\n"+
													"but belongs to a different domain than the one you agreed to let DOH automate.\n"+
													"If you did not intend to start a new DOH test by visiting this Web page,\n"+
													"press Cancel now and leave the Web page.\n"+
													"Otherwise, press OK to trust this domain to automate DOH tests.")){
											stop();
											return null;
										}
									}
									log("Found old security manager");
								}catch(Exception e){
									log("Making new security manager");
									securitymanager = new RobotSecurityManager(needsSecurityManager,
											oldsecurity);
									securitymanager.checkTopLevelWindow(null);
									System.setSecurityManager(securitymanager);
								}
							}catch(SecurityException e){
								// OpenJDK is very strict; fail gracefully
							}catch(Exception e){
								log("Error calling _init_: "+e.getMessage());
								key = -2;
								e.printStackTrace();
							}
							log("< init Robot");
							return null;
						}
					});
					if(key == -2){
						// applet not trusted
						// start the test without it
						window.eval("doh.robot._appletDead=true;doh.run();");
					}else{
						// now that the applet has really started, let doh know it's ok to use it
						log("_initRobot");
						try{
							dohrobot = (JSObject) window.eval("doh.robot");
							dohrobot.call("_initRobot", new Object[]{ applet() });
						}catch(Exception e){
							e.printStackTrace();
						}
					}
				}
			};
			threadPool.execute(thread);
		}
	}

	public void init(){
		threadPool = Executors.newFixedThreadPool(1);
		// ensure isShowing = true
		addComponentListener(new onvisible());
		ProfilingThread jitProfile=new ProfilingThread ();
		jitProfile.startProfiling();
		jitProfile.endProfiling();
		trackingImage=new BufferedImage(3,3,BufferedImage.TYPE_INT_RGB);
		trackingImage.setRGB(0, 0, 3, 3, new int[]{new Color(255,174,201).getRGB(),new Color(255,127,39).getRGB(),new Color(0,0,0).getRGB(),new Color(237,28,36).getRGB(),new Color(63,72,204).getRGB(),new Color(34,177,76).getRGB(),new Color(181,230,29).getRGB(),new Color(255,255,255).getRGB(),new Color(200,191,231).getRGB()}, 0, 3);
	}

	// loading functions
	public void _setKey(double key){
		if(key == -1){
			return;
		}else if(this.key == -1){
			this.key = key;
		}
	}

	protected Point getDesktopMousePosition() throws Exception{
		Class mouseInfoClass;
		Class pointerInfoClass;
		mouseInfoClass = Class.forName("java.awt.MouseInfo");
		pointerInfoClass = Class.forName("java.awt.PointerInfo");
		Method getPointerInfo = mouseInfoClass.getMethod("getPointerInfo", new Class[0]);
		Method getLocation = pointerInfoClass.getMethod("getLocation", new Class[0]);
		Object pointer=null;
		Point p=null;
		try{
			pointer = getPointerInfo.invoke(pointerInfoClass,new Object[0]);
			p = (Point)(getLocation.invoke(pointer,new Object[0]));
		}catch(java.lang.reflect.InvocationTargetException e){
			e.getTargetException().printStackTrace();
		}
		return p;
	}
	
	public Point getLocationOnScreen(){
		return locationOnScreen==null? super.getLocationOnScreen(): locationOnScreen;
	}
	
	private boolean mouseSecure() throws Exception{
		// Use MouseInfo to ensure that mouse is inside browser.
		// Only works in Java 1.5, but the DOHRobot must compile for 1.4.
		if(!mouseSecurity){ return true; }
		Point mousePosition=null;
		try{
			mousePosition=getDesktopMousePosition();
			log("Mouse position: "+mousePosition);
		}catch(Exception e){
			return true;
		}
		return mousePosition.x >= docScreenX
			&& mousePosition.x <= docScreenXMax
			&& mousePosition.y >= docScreenY
			&& mousePosition.y <= docScreenYMax;
	}

	private boolean isSecure(double key){
		// make sure key is not unset (-1) or error state (-2) and is the expected key
		boolean result = this.key != -1 && this.key != -2 && this.key == key;
		try{
			// also make sure mouse in good spot
			result=result&&mouseSecure();
		}catch(Exception e){
			e.printStackTrace();
			result=false;
		}
		if(!result&&this.key!=-2){
			this.key=-2;
			window.eval("doh.robot._appletDead=true;");
			log("User aborted test; mouse moved off of browser");
			alert("User aborted test; mouse moved off of browser.");
			log("Key secure: false; mouse in bad spot?");
		}else{
			log("Key secure: " + result);
		}
		return result;
	}

	public void _callLoaded(final double sec){
		log("> _callLoaded Robot");
		Runnable thread = new Runnable(){
			public void run(){
				if(!isSecure(sec)){
					return;
				}
				AccessController.doPrivileged(new PrivilegedAction(){
					public Object run(){
						Point p = getLocationOnScreen();
						if(os.indexOf("MAC") != -1){
							// Work around stupid Apple OS X bug affecting Safari 5.1 and FF4.
							// Seems to have to do with the plugin they compile with rather than the jvm itself because Safari5.0 and FF3.6 still work.
							p = new Point();
							int screen=0;
							dohscreen=-1;
							int mindifference=Integer.MAX_VALUE;
							GraphicsDevice[] screens=GraphicsEnvironment.getLocalGraphicsEnvironment().getScreenDevices();
							try{
								for(screen=0; screen<screens.length; screen++){
									// get origin of screen in Java virtual coordinates
									Rectangle bounds=screens[screen].getDefaultConfiguration().getBounds();
									// take picture
									DisplayMode mode=screens[screen].getDisplayMode();
									int width=mode.getWidth();
									int height=mode.getHeight();
									int twidth=trackingImage.getWidth();
									int theight=trackingImage.getHeight();
									Robot screenshooter=new Robot(screens[screen]);
									log("screen dimensions: "+width+" "+height);
									BufferedImage screenshot=screenshooter.createScreenCapture(new Rectangle(0,0,width,height));
									// Ideally (in Windows) we would now slide trackingImage until we find an identical match inside screenshot.
									// Unfortunately because the Mac (what we are trying to fix) does terrible, awful things to graphics it displays,
									// we will need to find the "most similar" (smallest difference in pixels) square and click there.
									int x=0,y=0;
									for(x=0; x<=width-twidth; x++){
										for(y=0; y<=height-theight; y++){
											int count=0;
											int difference=0;
											scanImage:
											for(int x2=0; x2<twidth; x2++){
												for(int y2=0; y2<theight; y2++){
													int rgbdiff=Math.abs(screenshot.getRGB(x+x2,y+y2)-trackingImage.getRGB(x2,y2));
													difference=difference+rgbdiff;
													// short circuit mismatches
													if(difference>=mindifference){
														break scanImage;
													}
												}
											}
											if(difference<mindifference){
												// convert device coordinates to virtual coordinates by adding screen's origin
												p.x=x+(int)bounds.getX();
												p.y=y+(int)bounds.getY();
												mindifference=difference;
												dohscreen=screen;
											}
										}
									}
								}
								// create temp robot to put mouse in right spot
								robot=new Robot(screens[dohscreen]);
								robot.setAutoWaitForIdle(true);
							}catch(Exception e){
								e.printStackTrace();
							}
							if(p.x==0&&p.y==0){
								// shouldn't happen...
								throw new RuntimeException("Robot not found on screen");
							}
							locationOnScreen=p;
						}else{
							// create default temp robot that should work on non-Macs
							try{
								robot=new Robot();
								robot.setAutoWaitForIdle(true);
							}catch(Exception e){}
						}
						log("Document root: ~"+p.toString());
						int x = p.x + 16;
						int y = p.y + 8;
						// click the mouse over the text box
						try{
							Thread.sleep(100);
						}catch(Exception e){};
						
						try{
							// mouse in right spot; restore control to original robot using browser's preferred coordinates
							robot = new Robot();
							robot.setAutoWaitForIdle(true);
							robot.mouseMove(x, y);
							Thread.sleep(100);
							// click 50 times then abort
							int i=0;
							for(i=0; i<50&&!inited; i++){
								robot.mousePress(InputEvent.BUTTON1_MASK);
								Thread.sleep(100);
								robot.mouseRelease(InputEvent.BUTTON1_MASK);
								Thread.sleep(100);
								log("mouse clicked");
							}
							if(i==50){
								applet().stop();
							}
						}catch(Exception e){ e.printStackTrace(); }
						log("< _callLoaded Robot");
						return null;
					}
				});
			}
		};
		threadPool.execute(thread);
	}

	// convenience functions
	private DOHRobot applet(){
		return this;
	}

	public void log(final String s){
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				System.out.println((new Date()).toString() + ": " + s);
				return null;
			}
		});
	}

	private void alert(final String s){
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				window.eval("top.alert(\"" + s + "\");");
				return null;
			}
		});
	}

	private boolean confirm(final String s){
		// show a Java confirm dialog.
		// Mac seems to lock up when showing a JS confirm from Java.
		//return JOptionPane.showConfirmDialog(this, s, "doh.robot", JOptionPane.OK_CANCEL_OPTION)==JOptionPane.OK_OPTION);
		JOptionPane pane = new JOptionPane(s, JOptionPane.DEFAULT_OPTION, JOptionPane.OK_CANCEL_OPTION);
		JDialog dialog = pane.createDialog(this, "doh.robot");
		dialog.setLocationRelativeTo(this);
		dialog.show();
		return ((Integer)pane.getValue()).intValue()==JOptionPane.OK_OPTION;
	}

	// mouse discovery code
	public void setDocumentBounds(final double sec, final int x, final int y, final int w, final int h) throws Exception{
		// call from JavaScript
		// tells the Robot where the screen x,y of the upper left corner of the
		// document are
		// not screenX/Y of the window; really screenLeft/Top in IE, but not all
		// browsers have this
		log("> setDocumentBounds");
		if(!isSecure(sec))
			return;
		if(!inited){
			DOHRobot _this=applet();
			log("initing doc bounds");
			inited = true;
			Point location=_this.getLocationOnScreen();
			_this.lastMouseX = _this.docScreenX = location.x;
			_this.lastMouseY = _this.docScreenY = location.y;
			_this.docScreenXMax = _this.docScreenX + w;
			_this.docScreenYMax = _this.docScreenY + h;
			log("Doc bounds: "+docScreenX+","+docScreenY+" => "+docScreenXMax+","+docScreenYMax);
			// compute difference between position and browser edge for future reference
			_this.margin = getLocationOnScreen();
			_this.margin.x -= x;
			_this.margin.y -= y;
			mouseSecurity=true;
		}else{
			log("ERROR: tried to reinit bounds?");
		}
		log("< setDocumentBounds");
	}

	// keyboard discovery code
	private void _mapKey(char charCode, int keyindex, boolean shift,
			boolean altgraph){
		log("_mapKey: " + charCode);
		// if character is not in map, add it
		if(!charMap.containsKey(new Integer(charCode))){
			log("Notified: " + (char) charCode);
			KeyEvent event = new KeyEvent(applet(), 0, 0,
					(shift ? KeyEvent.SHIFT_MASK : 0)
							+ (altgraph ? KeyEvent.ALT_GRAPH_MASK : 0),
					((Integer) vkKeys.get(keyindex)).intValue(),
					(char) charCode);
			charMap.put(new Integer(charCode), event);
			log("Mapped char " + (char) charCode + " to KeyEvent " + event);
			if(((char) charCode) >= 'a' && ((char) charCode) <= 'z'){
				// put shifted version of a-z in automatically
				int uppercharCode = (int) Character
						.toUpperCase((char) charCode);
				event = new KeyEvent(applet(), 0, 0, KeyEvent.SHIFT_MASK
						+ (altgraph ? KeyEvent.ALT_GRAPH_MASK : 0),
						((Integer) vkKeys.get(keyindex)).intValue(),
						(char) uppercharCode);
				charMap.put(new Integer(uppercharCode), event);
				log("Mapped char " + (char) uppercharCode + " to KeyEvent "
						+ event);
			}
		}
	}

	public void _notified(final double sec, final String chars){
		// decouple from JavaScript; thread join could hang it
		Runnable thread = new Runnable(){
			public void run(){
				if(!isSecure(sec))
					return;
				AccessController.doPrivileged(new PrivilegedAction(){
					public Object run(){
						keystring += chars;
						if(altgraph && !shift){
							shift = false;
							// Set robot auto delay now that FF/Mac inited all of the keys. 
							// Good for DND.
							robot.setAutoDelay(1);
							try{
								log(keystring);
								int index = 0;
								for (int i = 0; (i < vkKeys.size())
										&& (index < keystring.length()); i++){
									char c = keystring.charAt(index++);
									_mapKey(c, i, false, false);
								}
								for (int i = 0; (i < vkKeys.size())
										&& (index < keystring.length()); i++){
									char c = keystring.charAt(index++);
									_mapKey(c, i, true, false);
								}
								for (int i = 0; (i < vkKeys.size())
										&& (index < keystring.length()); i++){
									char c = keystring.charAt(index++);
									_mapKey(c, i, false, true);
								}
								// notify DOH that the applet finished init
								dohrobot.call("_onKeyboard", new Object[]{});
							}catch(Exception e){
								e.printStackTrace();
							}
							return null;
						}else if(!shift){
							shift = true;
						}else{
							shift = false;
							altgraph = true;
						}
						pressNext();
						// }
						return null;
					}
				});
			}
		};
		threadPool.execute(thread);
	}

	private void pressNext(){
		Runnable thread = new Runnable(){
			public void run(){
				// first time, press shift (have to do it here instead of
				// _notified to avoid IllegalThreadStateException on Mac)
				log("starting up, " + shift + " " + altgraph);
				if(shift){
					robot.keyPress(KeyEvent.VK_SHIFT);
					log("Pressing shift");
				}
				try{
					if(altgraph){
						robot.keyPress(KeyEvent.VK_ALT_GRAPH);
						log("Pressing alt graph");
					}
				}catch(Exception e){
					log("Error pressing alt graph");
					e.printStackTrace();
					_notified(key, "");
					return;
				}
				dohrobot.call("_nextKeyGroup", new Object[]{ new Integer(vkKeys.size()) });
				for (int keyindex = 0; keyindex < vkKeys.size(); keyindex++){
					try{
						log("Press "
								+ ((Integer) vkKeys.get(keyindex)).intValue());
						robot.keyPress(((Integer) vkKeys.get(keyindex))
								.intValue());
						log("Release "
								+ ((Integer) vkKeys.get(keyindex)).intValue());
						robot.keyRelease(((Integer) vkKeys.get(keyindex))
								.intValue());
						if(altgraph && (keyindex == (vkKeys.size() - 1))){
							robot.keyRelease(KeyEvent.VK_ALT_GRAPH);
							log("Releasing alt graph");
						}
						if(shift && (keyindex == (vkKeys.size() - 1))){
							robot.keyRelease(KeyEvent.VK_SHIFT);
							log("Releasing shift");
						}
					}catch(Exception e){
					}
					try{
						log("Press space");
						robot.keyPress(KeyEvent.VK_SPACE);
						log("Release space");
						robot.keyRelease(KeyEvent.VK_SPACE);
					}catch(Exception e){
						e.printStackTrace();
					}
				}
			}
		};
		threadPool.execute(thread);
	}

	public void _initWheel(final double sec){
		log("> initWheel");
		Runnable thread=new Runnable(){
			public void run(){
				if(!isSecure(sec))
					return;
				Thread.yield();
				// calibrate the mouse wheel now that textbox is focused
				dir=1;
				// fixed in 10.6.2 update 1 and 10.5.8 update 6:
				// http://developer.apple.com/mac/library/releasenotes/CrossPlatform/JavaSnowLeopardUpdate1LeopardUpdate6RN/ResolvedIssues/ResolvedIssues.html
				// Radar #6193836
				if(os.indexOf("MAC") != -1){
					// see if the version is greater than 10.5.8
					String[] sfixedVersion = "10.5.8".split("\\.");
					int[] fixedVersion = new int[3];
					String[] sthisVersion = System.getProperty("os.version").split("\\.");
					int[] thisVersion = new int[3];
					for(int i=0; i<3; i++){
						fixedVersion[i]=Integer.valueOf(sfixedVersion[i]).intValue();
						thisVersion[i]=Integer.valueOf(sthisVersion[i]).intValue();
					};
					// 10.5.8, the fix level, should count as fixed
					// on the other hand, 10.6.0 and 10.6.1 should not
					boolean isFixed = !System.getProperty("os.version").equals("10.6.0")&&!System.getProperty("os.version").equals("10.6.1");
					for(int i=0; i<fixedVersion.length&&isFixed; i++){
						if(thisVersion[i]>fixedVersion[i]){
							// definitely newer at this point
							isFixed = true;
							break;
						}else if(thisVersion[i]<fixedVersion[i]){
							// definitely older
							isFixed = false;
							break;
						}
						// equal; continue to next dot

					}
					// flip dir if not fixed
					dir=isFixed?dir:-dir;
				}
				robot.mouseWheel(dir);
				try{
					Thread.sleep(100);
				}catch(Exception e){}
				log("< initWheel");
			}
		};
		threadPool.execute(thread);
	}

	public void _initKeyboard(final double sec){
		log("> initKeyboard");
		// javascript entry point to discover the keyboard
		if(charMap != null){
			dohrobot.call("_onKeyboard", new Object[]{});
			return;
		}
		Runnable thread = new Runnable(){
			public void run(){
				if(!isSecure(sec))
					return;
				AccessController.doPrivileged(new PrivilegedAction(){
					public Object run(){
						charMap = new HashMap();
						KeyEvent event = new KeyEvent(applet(), 0, 0, 0,
								KeyEvent.VK_SPACE, ' ');
						charMap.put(new Integer(32), event);
						try{
							// a-zA-Z0-9 + 29 others
							vkKeys = new Vector();
							for (char i = 'a'; i <= 'z'; i++){
								vkKeys.add(new Integer(KeyEvent.class.getField(
										"VK_" + Character.toUpperCase((char) i))
										.getInt(null)));
							}
							for (char i = '0'; i <= '9'; i++){
								vkKeys.add(new Integer(KeyEvent.class.getField(
										"VK_" + Character.toUpperCase((char) i))
										.getInt(null)));
							}
							int[] mykeys = new int[]{ KeyEvent.VK_COMMA,
									KeyEvent.VK_MINUS, KeyEvent.VK_PERIOD,
									KeyEvent.VK_SLASH, KeyEvent.VK_SEMICOLON,
									KeyEvent.VK_LEFT_PARENTHESIS,
									KeyEvent.VK_NUMBER_SIGN, KeyEvent.VK_PLUS,
									KeyEvent.VK_RIGHT_PARENTHESIS,
									KeyEvent.VK_UNDERSCORE,
									KeyEvent.VK_EXCLAMATION_MARK, KeyEvent.VK_DOLLAR,
									KeyEvent.VK_CIRCUMFLEX, KeyEvent.VK_AMPERSAND,
									KeyEvent.VK_ASTERISK, KeyEvent.VK_QUOTEDBL,
									KeyEvent.VK_LESS, KeyEvent.VK_GREATER,
									KeyEvent.VK_BRACELEFT, KeyEvent.VK_BRACERIGHT,
									KeyEvent.VK_COLON, KeyEvent.VK_BACK_QUOTE,
									KeyEvent.VK_QUOTE, KeyEvent.VK_OPEN_BRACKET,
									KeyEvent.VK_BACK_SLASH, KeyEvent.VK_CLOSE_BRACKET,
									KeyEvent.VK_EQUALS };
							for (int i = 0; i < mykeys.length; i++){
								vkKeys.add(new Integer(mykeys[i]));
							}
						}catch(Exception e){
							e.printStackTrace();
						}
						robot.setAutoDelay(1);
						// prime the event pump for Google Chome - so fast it doesn't even stop to listen for key events!
						// send spaces until JS says to stop
						int count=0;
						boolean waitingOnSpace = true;
						do{
							log("Pressed space");
							robot.keyPress(KeyEvent.VK_SPACE);
							robot.keyRelease(KeyEvent.VK_SPACE);
							count++;
							waitingOnSpace = ((Boolean)window.eval("doh.robot._spaceReceived")).equals(Boolean.FALSE);
							log("JS still waiting on a space? "+waitingOnSpace);
						}while(count<500&&waitingOnSpace);
						robot.keyPress(KeyEvent.VK_ENTER);
						robot.keyRelease(KeyEvent.VK_ENTER);
						robot.setAutoDelay(0);
						log("< initKeyboard");
						pressNext();
						return null;
					}
				});
			}
		};
		threadPool.execute(thread);
	}

	public void typeKey(double sec, final int charCode, final int keyCode,
			final boolean alt, final boolean ctrl, final boolean shift, final boolean meta,
			final int delay, final boolean async){
		if(!isSecure(sec))
			return;
		// called by doh.robot._keyPress
		// see it for details
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				try{
					log("> typeKey Robot " + charCode + ", " + keyCode + ", " + async);
					KeyPressThread thread = new KeyPressThread(charCode,
							keyCode, alt, ctrl, shift, meta, delay);
					if(async){
						Thread asyncthread=new Thread(thread);
						asyncthread.start();
					}else{
						threadPool.execute(thread);
					}
					log("< typeKey Robot");
				}catch(Exception e){
					log("Error calling typeKey");
					e.printStackTrace();
				}
				return null;
			}
		});
	}

	public void upKey(double sec, final int charCode, final int keyCode, final int delay){
		// called by doh.robot.keyDown
		// see it for details
		// a nice name like "keyUp" is reserved in Java
		if(!isSecure(sec))
			return;
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				log("> upKey Robot " + charCode + ", " + keyCode);
				KeyUpThread thread = new KeyUpThread(charCode, keyCode, delay);
				threadPool.execute(thread);
				log("< upKey Robot");
				return null;
			}
		});
	}

	public void downKey(double sec, final int charCode, final int keyCode, final int delay){
		// called by doh.robot.keyUp
		// see it for details
		// a nice name like "keyDown" is reserved in Java
		if(!isSecure(sec))
			return;
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				log("> downKey Robot " + charCode + ", " + keyCode);
				KeyDownThread thread = new KeyDownThread(charCode, keyCode, delay);
				threadPool.execute(thread);
				log("< downKey Robot");
				return null;
			}
		});
	}

	public void pressMouse(double sec, final boolean left,
			final boolean middle, final boolean right, final int delay){
		if(!isSecure(sec))
			return;
		// called by doh.robot.mousePress
		// see it for details
		// a nice name like "mousePress" is reserved in Java
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				log("> mousePress Robot " + left + ", " + middle + ", " + right);
				MousePressThread thread = new MousePressThread(
						(left ? InputEvent.BUTTON1_MASK : 0)
								+ (middle ? InputEvent.BUTTON2_MASK : 0)
								+ (right ? InputEvent.BUTTON3_MASK : 0), delay);
				threadPool.execute(thread);
				log("< mousePress Robot");
				return null;
			}
		});
	}

	public void releaseMouse(double sec, final boolean left,
			final boolean middle, final boolean right, final int delay){
		if(!isSecure(sec))
			return;
		// called by doh.robot.mouseRelease
		// see it for details
		// a nice name like "mouseRelease" is reserved in Java
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				log("> mouseRelease Robot " + left + ", " + middle + ", "
						+ right);
				MouseReleaseThread thread = new MouseReleaseThread(
						(left ? InputEvent.BUTTON1_MASK : 0)
								+ (middle ? InputEvent.BUTTON2_MASK : 0)
								+ (right ? InputEvent.BUTTON3_MASK : 0), delay
						);
				threadPool.execute(thread);
				log("< mouseRelease Robot");
				return null;
			}
		});
	}

	protected boolean destinationInView(int x, int y){
		return !(x > docScreenXMax || y > docScreenYMax || x < docScreenX || y < docScreenY);
	}
	
	public void moveMouse(double sec, final int x1, final int y1, final int d, final int duration){
		// called by doh.robot.mouseMove
		// see it for details
		// a nice name like "mouseMove" is reserved in Java
		if(!isSecure(sec))
			return;
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				int x = x1 + docScreenX;
				int y = y1 + docScreenY;
				if(!destinationInView(x,y)){
					// TODO: try to scroll view
					log("Request to mouseMove denied");
					return null;
				}
				int delay = d;
				log("> mouseMove Robot " + x + ", " + y);
				MouseMoveThread thread = new MouseMoveThread(x, y, delay,
						duration);
				threadPool.execute(thread);
				log("< mouseMove Robot");
				return null;
			}
		});
	}

	public void wheelMouse(double sec, final int amount, final int delay, final int duration){
		// called by doh.robot.mouseWheel
		// see it for details
		if(!isSecure(sec))
			return;
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				MouseWheelThread thread = new MouseWheelThread(amount, delay, duration);
				threadPool.execute(thread);
				return null;
			}
		});
	}

	private int getVKCode(int charCode, int keyCode){
		int keyboardCode = 0;
		if(charCode >= 32){
			// if it is printable, then it lives in our hashmap
			KeyEvent event = (KeyEvent) charMap.get(new Integer(charCode));
			keyboardCode = event.getKeyCode();
		}
		else{
			switch (keyCode){
				case 13:
					keyboardCode = KeyEvent.VK_ENTER;
					break;
				case 8:
					keyboardCode = KeyEvent.VK_BACK_SPACE;
					break;
				case 25:// shift tab for Safari
				case 9:
					keyboardCode = KeyEvent.VK_TAB;
					break;
				case 12:
					keyboardCode = KeyEvent.VK_CLEAR;
					break;
				case 16:
					keyboardCode = KeyEvent.VK_SHIFT;
					break;
				case 17:
					keyboardCode = KeyEvent.VK_CONTROL;
					break;
				case 18:
					keyboardCode = KeyEvent.VK_ALT;
					break;
				case 63250:
				case 19:
					keyboardCode = KeyEvent.VK_PAUSE;
					break;
				case 20:
					keyboardCode = KeyEvent.VK_CAPS_LOCK;
					break;
				case 27:
					keyboardCode = KeyEvent.VK_ESCAPE;
					break;
				case 32:
					log("it's a space");
					keyboardCode = KeyEvent.VK_SPACE;
					break;
				case 63276:
				case 33:
					keyboardCode = KeyEvent.VK_PAGE_UP;
					break;
				case 63277:
				case 34:
					keyboardCode = KeyEvent.VK_PAGE_DOWN;
					break;
				case 63275:
				case 35:
					keyboardCode = KeyEvent.VK_END;
					break;
				case 63273:
				case 36:
					keyboardCode = KeyEvent.VK_HOME;
					break;

				/**
				 * Constant for the <b>left</b> arrow key.
				 */
				case 63234:
				case 37:
					keyboardCode = KeyEvent.VK_LEFT;
					break;

				/**
				 * Constant for the <b>up</b> arrow key.
				 */
				case 63232:
				case 38:
					keyboardCode = KeyEvent.VK_UP;
					break;

				/**
				 * Constant for the <b>right</b> arrow key.
				 */
				case 63235:
				case 39:
					keyboardCode = KeyEvent.VK_RIGHT;
					break;

				/**
				 * Constant for the <b>down</b> arrow key.
				 */
				case 63233:
				case 40:
					keyboardCode = KeyEvent.VK_DOWN;
					break;
				case 63272:
				case 46:
					keyboardCode = KeyEvent.VK_DELETE;
					break;
				case 224:
				case 91:
					keyboardCode = KeyEvent.VK_META;
					break;
				case 63289:
				case 144:
					keyboardCode = KeyEvent.VK_NUM_LOCK;
					break;
				case 63249:
				case 145:
					keyboardCode = KeyEvent.VK_SCROLL_LOCK;
					break;

				/** Constant for the F1 function key. */
				case 63236:
				case 112:
					keyboardCode = KeyEvent.VK_F1;
					break;

				/** Constant for the F2 function key. */
				case 63237:
				case 113:
					keyboardCode = KeyEvent.VK_F2;
					break;

				/** Constant for the F3 function key. */
				case 63238:
				case 114:
					keyboardCode = KeyEvent.VK_F3;
					break;

				/** Constant for the F4 function key. */
				case 63239:
				case 115:
					keyboardCode = KeyEvent.VK_F4;
					break;

				/** Constant for the F5 function key. */
				case 63240:
				case 116:
					keyboardCode = KeyEvent.VK_F5;
					break;

				/** Constant for the F6 function key. */
				case 63241:
				case 117:
					keyboardCode = KeyEvent.VK_F6;
					break;

				/** Constant for the F7 function key. */
				case 63242:
				case 118:
					keyboardCode = KeyEvent.VK_F7;
					break;

				/** Constant for the F8 function key. */
				case 63243:
				case 119:
					keyboardCode = KeyEvent.VK_F8;
					break;

				/** Constant for the F9 function key. */
				case 63244:
				case 120:
					keyboardCode = KeyEvent.VK_F9;
					break;

				/** Constant for the F10 function key. */
				case 63245:
				case 121:
					keyboardCode = KeyEvent.VK_F10;
					break;

				/** Constant for the F11 function key. */
				case 63246:
				case 122:
					keyboardCode = KeyEvent.VK_F11;
					break;

				/** Constant for the F12 function key. */
				case 63247:
				case 123:
					keyboardCode = KeyEvent.VK_F12;
					break;

				/**
				 * Constant for the F13 function key.
				 * 
				 * @since 1.2
				 */
				/*
				 * F13 - F24 are used on IBM 3270 keyboard; break; use
				 * random range for constants.
				 */
				case 124:
					keyboardCode = KeyEvent.VK_F13;
					break;

				/**
				 * Constant for the F14 function key.
				 * 
				 * @since 1.2
				 */
				case 125:
					keyboardCode = KeyEvent.VK_F14;
					break;

				/**
				 * Constant for the F15 function key.
				 * 
				 * @since 1.2
				 */
				case 126:
					keyboardCode = KeyEvent.VK_F15;
					break;

				case 63302:
				case 45:
					keyboardCode = KeyEvent.VK_INSERT;
					break;
				case 47:
					keyboardCode = KeyEvent.VK_HELP;
					break;
				default:
					keyboardCode = keyCode;

			}
		}
		log("Attempting to type " + (char) charCode + ":"
				+ charCode + " " + keyCode);
		log("Converted to " + keyboardCode);
		return keyboardCode;
	}

	private boolean isUnsafe(int keyboardCode){
		// run through exemption list
		log("ctrl: "+ctrl+", alt: "+alt+", shift: "+shift);
		if(((ctrl || alt) && keyboardCode == KeyEvent.VK_ESCAPE)
							|| (alt && keyboardCode == KeyEvent.VK_TAB)
							|| (ctrl && alt && keyboardCode == KeyEvent.VK_DELETE)){
			log("You are not allowed to press this key combination!");
			return true;
		// bugged keys cases go next
		}else{
			log("Safe to press.");
			return false;
		}
	}

	private boolean disableNumlock(int vk, boolean shift){
		boolean result = !numlockDisabled&&shift
			&&os.indexOf("WINDOWS")!=-1
			&&toolkit.getLockingKeyState(KeyEvent.VK_NUM_LOCK) // only works on Windows
			&&(
				// any numpad buttons are suspect
				vk==KeyEvent.VK_LEFT
				||vk==KeyEvent.VK_UP
				||vk==KeyEvent.VK_RIGHT
				||vk==KeyEvent.VK_DOWN
				||vk==KeyEvent.VK_HOME
				||vk==KeyEvent.VK_END
				||vk==KeyEvent.VK_PAGE_UP
				||vk==KeyEvent.VK_PAGE_DOWN
		);
		log("disable numlock: "+result);
		return result;
	}

	private void _typeKey(final int cCode, final int kCode, final boolean a,
			final boolean c, final boolean s, final boolean m){
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				int charCode = cCode;
				int keyCode = kCode;
				boolean alt = a;
				boolean ctrl = c;
				boolean shift = s;
				boolean meta = m;
				boolean altgraph = false;
				log("> _typeKey Robot " + charCode + ", " + keyCode);
				try{
					int keyboardCode=getVKCode(charCode, keyCode);
					if(charCode >= 32){
						// if it is printable, then it lives in our hashmap
						KeyEvent event = (KeyEvent) charMap.get(new Integer(charCode));
						// see if we need to press shift to generate this
						// character
						if(!shift){
							shift = event.isShiftDown();
						}
						altgraph = event.isAltGraphDown();
						keyboardCode = event.getKeyCode();
					}

					// Java bug: on Windows, shift+arrow key unpresses shift when numlock is on.
					// See: http://bugs.sun.com/bugdatabase/view_bug.do?bug_id=4838497
					boolean disableNumlock=disableNumlock(keyboardCode,shift||applet().shift);
					// run through exemption list
					if(!isUnsafe(keyboardCode)){
						if(shift){
							log("Pressing shift");
							robot.keyPress(KeyEvent.VK_SHIFT);
						}
						if(alt){
							log("Pressing alt");
							robot.keyPress(KeyEvent.VK_ALT);
						}
						if(altgraph){
							log("Pressing altgraph");
							robot.keyPress(KeyEvent.VK_ALT_GRAPH);
						}
						if(ctrl){
							log("Pressing ctrl");
							robot.keyPress(KeyEvent.VK_CONTROL);
						}
						if(meta){
							log("Pressing meta");
							robot.keyPress(KeyEvent.VK_META);
						}
						if(disableNumlock){
							robot.keyPress(KeyEvent.VK_NUM_LOCK);
							robot.keyRelease(KeyEvent.VK_NUM_LOCK);
							numlockDisabled=true;
						}else if(numlockDisabled&&!(applet().shift||shift)){
							// only turn it back on when the user is finished pressing shifted arrow keys
							robot.keyPress(KeyEvent.VK_NUM_LOCK);
							robot.keyRelease(KeyEvent.VK_NUM_LOCK);
							numlockDisabled=false;
						}
						if(keyboardCode != KeyEvent.VK_SHIFT
								&& keyboardCode != KeyEvent.VK_ALT
								&& keyboardCode != KeyEvent.VK_ALT_GRAPH
								&& keyboardCode != KeyEvent.VK_CONTROL
								&& keyboardCode != KeyEvent.VK_META){
							try{
								robot.keyPress(keyboardCode);
								robot.keyRelease(keyboardCode);
							}catch(Exception e){
								log("Error while actually typing a key");
								e.printStackTrace();
							}

						}
						if(ctrl){
							robot.keyRelease(KeyEvent.VK_CONTROL);
							ctrl = false;
						}
						if(alt){
							robot.keyRelease(KeyEvent.VK_ALT);
							alt = false;
						}
						if(altgraph){
							robot.keyRelease(KeyEvent.VK_ALT_GRAPH);
							altgraph = false;
						}
						if(shift){
							log("Releasing shift");
							robot.keyRelease(KeyEvent.VK_SHIFT);
							shift = false;
						}
						if(meta){
							log("Releasing meta");
							robot.keyRelease(KeyEvent.VK_META);
							meta = false;
						}
					}
				}catch(Exception e){
					log("Error in _typeKey");
					e.printStackTrace();
				}
				log("< _typeKey Robot");
				return null;
			}
		});
	}

	public boolean hasFocus(){
		// sanity check to make sure the robot isn't clicking outside the window when the browser is minimized for instance
		try{
			boolean result= ((Boolean) window
					.eval("var result=false;if(window.parent.document.hasFocus){result=window.parent.document.hasFocus();}else{result=true;}result;"))
					.booleanValue();
			if(!result){
				// can happen for instance if the browser minimized itself, or if there is another applet on the page.
				// recompute window,mouse positions to see if it is still safe to continue.
				log("Document focus lost. Recomputing window position");
				Point p = getLocationOnScreen();
				log("Old root: "+docScreenX+" "+docScreenY);
				docScreenX=p.x-margin.x;
				docScreenY=p.y-margin.y;
				log("New root: "+docScreenX+" "+docScreenY);
				docScreenXMax=docScreenX+((Integer)window.eval("window.parent.document.getElementById('dohrobotview').offsetLeft")).intValue();
				docScreenYMax=docScreenY+((Integer)window.eval("window.parent.document.getElementById('dohrobotview').offsetTop")).intValue();
				// bring browser to the front again.
				// if the window just blurred and moved, key events will again be directed to the window.
				// if an applet stole focus, focus will still be directed to the applet; the test script will ultimately have to click something to get back to a normal state.
				window.eval("window.parent.focus();");
				// recompute mouse position
				return isSecure(this.key);
			}else{
				return result;
			}
		}catch(Exception e){
			// runs even after you close the window!
			return false;
		}
	}

	// Threads for common Robot tasks
	// (so as not to tie up the browser rendering thread!)
	// declared inside so they have private access to the robot
	// we do *not* want to expose that guy!
	private class ProfilingThread implements Runnable{
		protected long delay=0;
		protected long duration=0;
		private long start;
		private long oldDelay;
		protected void startProfiling(){
			// error correct
			if(delay>0){
				oldDelay=delay;
				delay-=timingError+(duration>0?timingError:0);
				log("Timing error: "+timingError);
				if(delay<1){
					if(duration>0){ duration=Math.max(duration+delay,1); }
					delay=1;
				}
				start=System.currentTimeMillis();
			}else{
				// assumption is that only doh.robot.typeKeys actually uses delay/needs this level of error correcting
				timingError=0;
			}
		}
		protected void endProfiling(){
			// adaptively correct timingError
			if(delay>0){
				long end=System.currentTimeMillis();
				timingError+=(end-start)-oldDelay;
			}
		}
		public void run(){}
	}

	// Unclear why we have to fire keypress in a separate thread.
	// Since delay is no longer used, maybe this code can be simplified.
	final private class KeyPressThread extends ProfilingThread{
		private int charCode;
		private int keyCode;
		private boolean alt;
		private boolean ctrl;
		private boolean shift;
		private boolean meta;

		public KeyPressThread(int charCode, int keyCode, boolean alt,
				boolean ctrl, boolean shift, boolean meta, int delay){
			log("KeyPressThread constructor " + charCode + ", " + keyCode);
			this.charCode = charCode;
			this.keyCode = keyCode;
			this.alt = alt;
			this.ctrl = ctrl;
			this.shift = shift;
			this.meta = meta;
			this.delay = delay;
		}

		public void run(){
			try{
				startProfiling();
				// in different order so async works
				while(!hasFocus()){
					Thread.sleep(1000);
				}
				Thread.sleep(delay);
				log("> run KeyPressThread");

				_typeKey(charCode, keyCode, alt, ctrl, shift, meta);

				endProfiling();
			}catch(Exception e){
				log("Bad parameters passed to _typeKey");
				e.printStackTrace();
			}
			log("< run KeyPressThread");

		}
	}

	final private class KeyDownThread extends ProfilingThread{
		private int charCode;
		private int keyCode;

		public KeyDownThread(int charCode, int keyCode, int delay){
			log("KeyDownThread constructor " + charCode + ", " + keyCode);
			this.charCode = charCode;
			this.keyCode = keyCode;
			this.delay = delay;
		}

		public void run(){
			try{
				Thread.sleep(delay);
				log("> run KeyDownThread");
				while(!hasFocus()){
					Thread.sleep(1000);
				}
				int vkCode=getVKCode(charCode, keyCode);
				if(charCode >= 32){
					// if it is printable, then it lives in our hashmap
					KeyEvent event = (KeyEvent) charMap.get(new Integer(charCode));
					// see if we need to press shift to generate this
					// character
					if(event.isShiftDown()){
						robot.keyPress(KeyEvent.VK_SHIFT);
						shift=true;
					}
					if(event.isAltGraphDown()){
						robot.keyPress(KeyEvent.VK_ALT_GRAPH);
						altgraph=true;
					}
				}else{
					if(vkCode==KeyEvent.VK_ALT){
						alt=true;
					}else if(vkCode==KeyEvent.VK_CONTROL){
						ctrl=true;
					}else if(vkCode==KeyEvent.VK_SHIFT){
						shift=true;
					}else if(vkCode==KeyEvent.VK_ALT_GRAPH){
						altgraph=true;
					}else if(vkCode==KeyEvent.VK_META){
						meta=true;
					}else if(disableNumlock(vkCode,shift)){
						robot.keyPress(KeyEvent.VK_NUM_LOCK);
						robot.keyRelease(KeyEvent.VK_NUM_LOCK);
						numlockDisabled=true;
					}
				}
				if(!isUnsafe(vkCode)){
					robot.keyPress(vkCode);
				}
			}catch(Exception e){
				log("Bad parameters passed to downKey");
				e.printStackTrace();
			}
			log("< run KeyDownThread");

		}
	}

	final private class KeyUpThread extends ProfilingThread{
		private int charCode;
		private int keyCode;

		public KeyUpThread(int charCode, int keyCode, int delay){
			log("KeyUpThread constructor " + charCode + ", " + keyCode);
			this.charCode = charCode;
			this.keyCode = keyCode;
			this.delay = delay;
		}

		public void run(){
			try{
				Thread.sleep(delay);
				log("> run KeyUpThread");
				while(!hasFocus()){
					Thread.sleep(1000);
				}
				int vkCode=getVKCode(charCode, keyCode);
				if(charCode >= 32){
					// if it is printable, then it lives in our hashmap
					KeyEvent event = (KeyEvent) charMap.get(new Integer(charCode));
					// see if we need to press shift to generate this
					// character
					if(event.isShiftDown()){
						robot.keyRelease(KeyEvent.VK_SHIFT);
						shift=false;
					}
					if(event.isAltGraphDown()){
						robot.keyRelease(KeyEvent.VK_ALT_GRAPH);
						altgraph=false;
					}
				}else{
					if(vkCode==KeyEvent.VK_ALT){
						alt=false;
					}else if(vkCode==KeyEvent.VK_CONTROL){
						ctrl=false;
					}else if(vkCode==KeyEvent.VK_SHIFT){
						shift=false;
						if(numlockDisabled){
							robot.keyPress(KeyEvent.VK_NUM_LOCK);
							robot.keyRelease(KeyEvent.VK_NUM_LOCK);
							numlockDisabled=false;
						}
					}else if(vkCode==KeyEvent.VK_ALT_GRAPH){
						altgraph=false;
					}else if(vkCode==KeyEvent.VK_META){
						meta=false;
					}
				}
				robot.keyRelease(vkCode);
			}catch(Exception e){
				log("Bad parameters passed to upKey");
				e.printStackTrace();
			}
			log("< run KeyUpThread");

		}
	}

	final private class MousePressThread extends ProfilingThread{
		private int mask;

		public MousePressThread(int mask, int delay){
			this.mask = mask;
			this.delay = delay;
		}

		public void run(){
			try{
				Thread.sleep(delay);
				log("> run MousePressThread");
				while(!hasFocus()){
					Thread.sleep(1000);
				}
				robot.mousePress(mask);
				robot.waitForIdle();
			}catch(Exception e){
				log("Bad parameters passed to mousePress");
				e.printStackTrace();
			}
			log("< run MousePressThread");

		}
	}

	final private class MouseReleaseThread extends ProfilingThread{
		private int mask;

		public MouseReleaseThread(int mask, int delay){
			this.mask = mask;
			this.delay = delay;
		}

		public void run(){
			try{
				Thread.sleep(delay);
				log("> run MouseReleaseThread ");
				while(!hasFocus()){
					Thread.sleep(1000);
				}
				robot.mouseRelease(mask);
				robot.waitForIdle();
			}catch(Exception e){
				log("Bad parameters passed to mouseRelease");
				e.printStackTrace();
			}

			log("< run MouseReleaseThread ");

		}
	}

	final private class MouseMoveThread extends ProfilingThread{
		private int x;
		private int y;

		public MouseMoveThread(int x, int y, int delay, int duration){
			this.x = x;
			this.y = y;
			this.delay = delay;
			this.duration = duration;
		}

		public double easeInOutQuad(double t, double b, double c, double d){
			t /= d / 2;
			if(t < 1)
				return c / 2 * t * t + b;
			t--;
			return -c / 2 * (t * (t - 2) - 1) + b;
		};

		public void run(){
			try{
				Thread.sleep(delay);
				log("> run MouseMoveThread " + x + ", " + y);
				while(!hasFocus()){
					Thread.sleep(1000);
				}
				int x1 = lastMouseX;
				int x2 = x;
				int y1 = lastMouseY;
				int y2 = y;
				// shrink range by 1 px on both ends
				// manually move this 1px to trip DND code
				if(x1 != x2){
					int dx = x - lastMouseX;
					if(dx > 0){
						x1 += 1;
						x2 -= 1;
					}else{
						x1 -= 1;
						x2 += 1;
					}
				}
				if(y1 != y2){
					int dy = y - lastMouseY;
					if(dy > 0){
						y1 += 1;
						y2 -= 1;
					}else{
						y1 -= 1;
						y2 += 1;
					}

				}
				// manual precision
				robot.setAutoWaitForIdle(false);
				int intermediateSteps = duration==1?0: // duration==1 -> user wants to jump the mouse
					((((int)Math.ceil(Math.log(duration+1)))|1)); // |1 to ensure an odd # of intermediate steps for sensible interpolation
				// assumption: intermediateSteps will always be >=0
				int delay = (int)duration/(intermediateSteps+1); // +1 to include last move
				// First mouse movement fires at t=0 to official last know position of the mouse.
				robot.mouseMove(lastMouseX, lastMouseY);
				long start,end;
				
				// Shift lastMouseX/Y in the direction of the movement for interpolating over the smaller interval.
				lastMouseX=x1;
				lastMouseY=y1;
				// Now interpolate mouse movement from (lastMouseX=x1,lastMouseY=y1) to (x2,y2)
				// precondition: the amount of time that has passed since the first mousemove is 0*delay.
				// invariant: each time you end an iteration, after you increment t, the amount of time that has passed is t*delay
				int timingError=0;
				for (int t = 0; t < intermediateSteps; t++){
					start=new Date().getTime();
					Thread.sleep(delay);
					x1 = (int) easeInOutQuad((double) t, (double) lastMouseX,
							(double) x2 - lastMouseX, (double) intermediateSteps-1);
					y1 = (int) easeInOutQuad((double) t, (double) lastMouseY,
							(double) y2 - lastMouseY, (double) intermediateSteps-1);
					//log("("+x1+","+y1+")");
					robot.mouseMove(x1, y1);
					end=new Date().getTime();
					// distribute error among remaining steps
					timingError=(((int)(end-start))-delay)/(intermediateSteps-t);
					log("mouseMove timing error: "+timingError);
					delay=Math.max(delay-(int)timingError,1);
				}
				// postconditions:
				//	t=intermediateSteps
				// 	intermediateSteps*delay time has passed,
				// 	time remaining = duration-intermediateSteps*delay = (steps+1)*delay-intermediateSteps*delay = delay
				// You theoretically need 1 more delay for the whole duration to have passed.
				// In practice, you want less than that due to roundoff errors in Java's clock granularity.
				Thread.sleep(delay);
				robot.mouseMove(x, y);
				robot.setAutoWaitForIdle(true);
				
				//log("mouseMove statistics: duration= "+duration+" steps="+intermediateSteps+" delay="+delay);
				//log("mouseMove discrepency: "+(date2-date-duration)+"ms");
				lastMouseX = x;
				lastMouseY = y;
			}catch(Exception e){
				log("Bad parameters passed to mouseMove");
				e.printStackTrace();
			}

			log("< run MouseMoveThread");

		}
	}

	final private class MouseWheelThread extends ProfilingThread{
		private int amount;

		public MouseWheelThread(int amount, int delay, int duration){
			this.amount = amount;
			this.delay = delay;
			this.duration = duration;
		}

		public void run(){
			try{
				Thread.sleep(delay);
				log("> run MouseWheelThread " + amount);
				while(!hasFocus()){
					Thread.sleep(1000);
				}
				robot.setAutoDelay(Math.max((int)duration/Math.abs(amount),1));
				for(int i=0; i<Math.abs(amount); i++){
					robot.mouseWheel(amount>0?dir:-dir);
				}
				robot.setAutoDelay(1);
			}catch(Exception e){
				log("Bad parameters passed to mouseWheel");
				e.printStackTrace();
			}
			log("< run MouseWheelThread ");
		}
	}

	final private class RobotSecurityManager extends SecurityManager{
		// The applet's original security manager.
		// There is a bug in some people's Safaris that causes Safari to
		// basically hang on liveconnect calls.
		// Our security manager fixes it.

		private boolean isActive = false;
		private boolean needsSecurityManager = false;
		private SecurityManager oldsecurity = null;

		public RobotSecurityManager(boolean needsSecurityManager, SecurityManager oldsecurity){
			this.needsSecurityManager = needsSecurityManager;
			this.oldsecurity = oldsecurity;
		}

		public boolean checkTopLevelWindow(Object window){
			// If our users temporarily accept our cert for a session,
			// then use the same session to browse to a malicious website also using our applet,
			// that website can automatically execute the applet. 
			// To resolve this issue, RobotSecurityManager overrides checkTopLevelWindow
			// to check the JVM to see if there are other instances of the applet running on different domains.
			// If there are, it prompts the user to confirm that they want to run the applet before continuing. 

			// null is not supposed to be allowed
			// so we allow it to distinguish our security manager.
			if(window == null){
				isActive = !isActive;
				log("Active is now " + isActive);
			}
			return window == null ? true : oldsecurity
					.checkTopLevelWindow(window);
		}

		public void checkPermission(Permission p){
			// liveconnect SocketPermission resolve takes
			// FOREVER (like 6 seconds) in Safari 3
			// Java does like 50 of these on the first JS call
			// 6*50=300 seconds!
			if(isActive && needsSecurityManager
					&& java.net.SocketPermission.class.isInstance(p)
					&& p.getActions().matches(".*resolve.*")){
				throw new SecurityException(
						"DOH: liveconnect resolve locks up Safari 3. Denying resolve request.");
			}else if(p.equals(new java.awt.AWTPermission("watchMousePointer"))){
				// enable robot to watch mouse
			}else{
				oldsecurity.checkPermission(p);
			}
		}

		public void checkPermission(Permission perm, Object context){
			checkPermission(perm);
		}
	}
	
	public void setClipboardText(double sec, final String data) {
		if(!isSecure(sec))
			return;
		// called by doh.robot.setClipboard
		// see it for details
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
				StringSelection ss = new StringSelection(data);
				getSystemClipboard().setContents(ss, ss);
				return null;
			}
		});
	}
	
	public void setClipboardHtml(double sec, final String data) {
		if(!isSecure(sec))
			return;
		// called by doh.robot.setClipboard when format=='text/html'
		// see it for details
		AccessController.doPrivileged(new PrivilegedAction(){
			public Object run(){
			    String mimeType = "text/html;class=java.lang.String";//type + "; charset=" + charset;// + "; class=" + transferType;
			    TextTransferable transferable = new TextTransferable(mimeType, data);
			    getSystemClipboard().setContents(transferable, transferable);
				return null;
			}
		});
	}
	private static java.awt.datatransfer.Clipboard getSystemClipboard() {
		return toolkit.getSystemClipboard();
	}
	
	private static class TextTransferable implements Transferable, ClipboardOwner {
		private String data;
		private static ArrayList htmlFlavors = new ArrayList();
		
		static{
			try{
				htmlFlavors.add(new DataFlavor("text/plain;charset=UTF-8;class=java.lang.String"));
				htmlFlavors.add(new DataFlavor("text/html;charset=UTF-8;class=java.lang.String"));
			}catch(ClassNotFoundException ex){
				ex.printStackTrace();
			}
		}
		
		
		public TextTransferable(String mimeType, String data){
			this.data = data;
		}
		
		public DataFlavor[] getTransferDataFlavors(){
			return (DataFlavor[]) htmlFlavors.toArray(new DataFlavor[htmlFlavors.size()]);
		}
		
		public boolean isDataFlavorSupported(DataFlavor flavor){
			return htmlFlavors.contains(flavor);
		}
		
		public Object getTransferData(DataFlavor flavor) throws UnsupportedFlavorException, IOException{
			if (String.class.equals(flavor.getRepresentationClass())){
		        return data;
		    }
		
		    throw new UnsupportedFlavorException(flavor);
		
		}
		
		public void lostOwnership(java.awt.datatransfer.Clipboard clipboard, Transferable contents){
			data = null;
		}
	}
}
