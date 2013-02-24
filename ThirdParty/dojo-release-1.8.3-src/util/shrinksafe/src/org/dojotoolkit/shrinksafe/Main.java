/*
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Rhino code, released
 * May 6, 1999.
 *
 * The Initial Developer of the Original Code is
 * Netscape Communications Corporation.
 * Portions created by the Initial Developer are Copyright (C) 1997-1999
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Alex Russell
 *   Richard Backhouse
 */
 
package org.dojotoolkit.shrinksafe;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLConnection;
import java.text.MessageFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.ResourceBundle;

import org.mozilla.javascript.Context;
import org.mozilla.javascript.ContextAction;
import org.mozilla.javascript.Kit;
import org.mozilla.javascript.tools.ToolErrorReporter;
import org.mozilla.javascript.tools.shell.Global;
import org.mozilla.javascript.tools.shell.QuitAction;
import org.mozilla.javascript.tools.shell.ShellContextFactory;

public class Main {
	protected static final Global global = new Global();
	protected static final ShellContextFactory shellContextFactory = new ShellContextFactory();
	protected static ToolErrorReporter errorReporter;
	protected static int exitCode = 0;
	protected static boolean escapeUnicode = false; 
	protected static String stripConsole = null;

	static {
		global.initQuitAction(new IProxy(IProxy.SYSTEM_EXIT, null));
	}

	/**
	 * Proxy class to avoid proliferation of anonymous classes.
	 */
	private static class IProxy implements ContextAction, QuitAction
	{
		private static final int PROCESS_FILES = 1;
		private static final int SYSTEM_EXIT = 3;

		private int type;
		private String[] args;

		IProxy(int type, String[] args) {
			this.type = type;
			this.args = args;
		}

		public Object run(Context cx) {
			if (type == PROCESS_FILES) {
				try {
					processFiles(cx, args);
				} catch (IOException ioe) {
					Context.reportError(ioe.toString());
				}
			} else {
				throw Kit.codeBug();
			}
			return null;
		}

		public void quit(Context cx, int exitCode) {
			if (type == SYSTEM_EXIT) {
				System.exit(exitCode);
				return;
			}
			throw Kit.codeBug();
		}
	}
	
	public static void main(String[] args) {
		errorReporter = new ToolErrorReporter(false, global.getErr());
		shellContextFactory.setErrorReporter(errorReporter);
		IProxy iproxy = new IProxy(IProxy.PROCESS_FILES, processOptions(args));
		global.init(shellContextFactory);
		shellContextFactory.call(iproxy);
	}
	
	public static String[] processOptions(String args[]) {
		List fileList = new ArrayList();
		String usageError = null;
		boolean showUsage = false;
		
		for (int i = 0; i < args.length; i++) {
			String arg = args[i];
			if (!arg.startsWith("-")) {
				fileList.add(arg);
			}
			else if (arg.equals("-js-version")) {
				if (++i == args.length) {
					usageError = arg;
				}
				int version = 0;
				try {
					version = Integer.parseInt(args[i]);
				} catch (NumberFormatException ex) {
					usageError = args[i];
				}
				if (!Context.isValidLanguageVersion(version)) {
					usageError = args[i];
				}
				if (usageError != null)
				shellContextFactory.setLanguageVersion(version);
			}
/*
			else if (arg.equals("-opt") || arg.equals("-O")) {
				if (++i == args.length) {
					usageError = arg;
				}
				int opt = 0;
				try {
					opt = Integer.parseInt(args[i]);
				} catch (NumberFormatException ex) {
					usageError = args[i];
				}
				if (opt == -2) {
					// Compatibility with Cocoon Rhino fork
					opt = -1;
				} else if (!Context.isValidOptimizationLevel(opt)) {
					usageError = args[i];
				}
				if (usageError != null) {
					shellContextFactory.setOptimizationLevel(opt);
				}
			}
			else if (arg.equals("-debug")) {
				shellContextFactory.setGeneratingDebug(true);
			}
*/
			else if (arg.equals("-?") || arg.equals("-help")) {
				showUsage = true;
			}
			else if (arg.equals("-escape-unicode")) {
				escapeUnicode = true;
			}
			else if (arg.equals("-stripConsole")) {
				if (i >= (args.length-1)) {
					usageError = getMessage("msg.shell.stripConsoleMissingArg");
				} else {
					stripConsole = args[++i];
					if (!stripConsole.equals("normal") &&
							!stripConsole.equals("warn") &&
							!stripConsole.equals("all")) {
						usageError = getMessage("msg.shell.stripConsoleInvalid");
					}
				}
			}

		}

		// print error and usage message
		if (usageError != null) {
			global.getOut().println(getMessage("msg.shell.invalid", usageError));
		}
		if (usageError != null || showUsage) {
			global.getOut().println(getMessage("msg.shell.usage"));
			System.exit(1);
		}

		String[] files = new String[fileList.size()];
		files = (String[])fileList.toArray(files);
		return files;
	}
	
	static void processFiles(Context cx, String[] files) throws IOException {
		StringBuffer cout = new StringBuffer();
		if (files.length > 0) {
			for (int i=0; i < files.length; i++) {
				try {
					String source = (String)readFileOrUrl(files[i], true);
					cout.append(Compressor.compressScript(source, 0, 1, escapeUnicode, stripConsole));
				} catch(IOException ex) {
					// continue processing files
				}
			}
		} else {
			byte[] data = Kit.readStream(global.getIn(), 4096);
			// Convert to String using the default encoding
			String source = new String(data);
			if (source != null) {
				cout.append(Compressor.compressScript(source, 0, 1, escapeUnicode, stripConsole));
			}
		}

		global.getOut().println(cout);
	}

	private static Object readFileOrUrl(String path, boolean convertToString) throws IOException {
		URL url = null;
		// Assume path is URL if it contains a colon and there are at least
		// 2 characters in the protocol part. The later allows under Windows
		// to interpret paths with driver letter as file, not URL.
		if (path.indexOf(':') >= 2) {
			try {
				url = new URL(path);
			} catch (MalformedURLException ex) {
			}
		}

		InputStream is = null;
		int capacityHint = 0;
		if (url == null) {
			File file = new File(path);
			capacityHint = (int)file.length();
			try {
				is = new FileInputStream(file);
			} catch (IOException ex) {
				Context.reportError(getMessage("msg.couldnt.open", path));
				throw ex;
			}
		} else {
			try {
				URLConnection uc = url.openConnection();
				is = uc.getInputStream();
				capacityHint = uc.getContentLength();
				// Ignore insane values for Content-Length
				if (capacityHint > (1 << 20)) {
					capacityHint = -1;
				}
			} catch (IOException ex) {
				Context.reportError(getMessage("msg.couldnt.open.url", url.toString(), ex.toString()));
				throw ex;
			}
		}
		if (capacityHint <= 0) {
			capacityHint = 4096;
		}

		byte[] data;
		try {
			try {
				is = new BufferedInputStream(is);
				data = Kit.readStream(is, capacityHint);
			} finally {
				is.close();
			}
		} catch (IOException ex) {
			Context.reportError(ex.toString());
			throw ex;
		}

		Object result;
		if (convertToString) {
			// Convert to String using the default encoding
			// TODO: Use 'charset=' argument of Content-Type if URL?
			result = new String(data);
		} else {
			result = data;
		}
		return result;
	}
	
	private static String getMessage(String messageId) {
		return getMessage(messageId, (Object []) null);
	}

	private static String getMessage(String messageId, String argument) {
		return getMessage(messageId, new Object[]{argument});
	}

	private static String getMessage(String messageId, Object arg1, Object arg2) {
		return getMessage(messageId, new Object[]{arg1, arg2});
	}

	private static String getMessage(String messageId, Object[] args) {
		Context cx = Context.getCurrentContext();
		Locale locale = cx == null ? Locale.getDefault() : cx.getLocale();

		ResourceBundle rb = ResourceBundle.getBundle("org.dojotoolkit.shrinksafe.resources.Messages", locale);

		String formatString = null;
		try {
			formatString = rb.getString(messageId);
		} catch (java.util.MissingResourceException mre) {
			throw new RuntimeException("no message resource found for message property " + messageId);
		}

		if (args == null) {
			return formatString;
		} else {
			MessageFormat formatter = new MessageFormat(formatString);
			return formatter.format(args);
		}
	}
}
