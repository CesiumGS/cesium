package com.agi;

import java.io.File;

import org.apache.tools.ant.BuildException;
import org.apache.tools.ant.Project;
import org.apache.tools.ant.Task;
import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.ContextHandler;
import org.eclipse.jetty.server.handler.ContextHandlerCollection;
import org.eclipse.jetty.server.handler.ResourceHandler;
import org.eclipse.jetty.server.nio.SelectChannelConnector;

public class ServerTask extends Task {
	private String proxyContextPath;
	private String allowedHostList;
	private int port;
	private File baseDir;

	public void execute() throws BuildException {
		try {
			Server server = new Server();
			SelectChannelConnector connector = new SelectChannelConnector();
			connector.setHost("localhost");
			connector.setPort(this.port);
			server.addConnector(connector);

			ProxyHandler proxyHandler = new ProxyHandler(this.allowedHostList);
			ContextHandler proxyContextHandler = new ContextHandler(this.proxyContextPath);
			proxyContextHandler.setHandler(proxyHandler);

			ResourceHandler resourceHandler = new ResourceHandler();
			resourceHandler.setDirectoriesListed(true);
			resourceHandler.setWelcomeFiles(new String[] {
				"index.html"
			});
			resourceHandler.setResourceBase(baseDir.getAbsolutePath());
			resourceHandler.setCacheControl("no-cache");
			ContextHandler resourceContextHandler = new ContextHandler("/");
			resourceContextHandler.setHandler(resourceHandler);

			ContextHandlerCollection contexts = new ContextHandlerCollection();
			contexts.setHandlers(new Handler[] {
					proxyContextHandler,
					resourceContextHandler
			});

			server.setHandler(contexts);
			server.start();

			getProject().log("Server listening.  Connect to http://localhost:8080 to browse examples.", Project.MSG_INFO);

			server.join();
		} catch (Exception e) {
			throw new BuildException(e);
		}
	}

	public void setProxyContextPath(String value) {
		this.proxyContextPath = value;
	}

	public void setAllowedHostList(String value) {
		this.allowedHostList = value;
	}

	public void setPort(int value) {
		this.port = value;
	}

	public void setBaseDir(File value) {
		this.baseDir = value;
	}
}