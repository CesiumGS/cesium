package com.agi;

import java.io.File;
import java.io.FileInputStream;
import java.util.HashSet;
import java.util.Properties;

import org.apache.tools.ant.BuildException;
import org.apache.tools.ant.Project;
import org.apache.tools.ant.Task;
import org.eclipse.jetty.client.Address;
import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.http.MimeTypes;
import org.eclipse.jetty.server.Handler;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.server.handler.ContextHandler;
import org.eclipse.jetty.server.handler.ContextHandlerCollection;
import org.eclipse.jetty.server.handler.ResourceHandler;
import org.eclipse.jetty.server.nio.SelectChannelConnector;

public class ServerTask extends Task {
	private String proxyContextPath;
	private String terrainTranscodingContextPath;
	private String allowedHostList;
	private int port;
	private File baseDir;
	private String upstreamProxyHost;
	private Integer upstreamProxyPort;
	private String noUpstreamProxyHostList;
	private boolean listenOnAllAddresses;
	private String mimeTypesPath;

	public void execute() throws BuildException {
		try {
			Server server = new Server();
			server.setSendDateHeader(true);
			SelectChannelConnector connector = new SelectChannelConnector();
			if (!listenOnAllAddresses) {
				connector.setHost("localhost");
			}
			connector.setPort(port);
			server.addConnector(connector);

			HostChecker hostChecker = new HostChecker(allowedHostList);
			HttpClient client = new HttpClient();

			if (upstreamProxyHost != null && upstreamProxyHost.length() > 0) {
				if (upstreamProxyPort == null)
					upstreamProxyPort = 80;

				client.setProxy(new Address(upstreamProxyHost, upstreamProxyPort));

				if (noUpstreamProxyHostList != null) {
					HashSet<String> set = new HashSet<String>();
					for (String noUpstreamProxyHost : noUpstreamProxyHostList.split(",")) {
						set.add(noUpstreamProxyHost.trim());
					}
					client.setNoProxy(set);
				}
			}

			client.setConnectorType(HttpClient.CONNECTOR_SELECT_CHANNEL);
			client.start();

			ProxyHandler proxyHandler = new ProxyHandler(hostChecker, client);
			ContextHandler proxyContextHandler = new ContextHandler(this.proxyContextPath);
			proxyContextHandler.setHandler(proxyHandler);

			TerrainTranscodingHandler terrainTranscodingHandler = new TerrainTranscodingHandler(hostChecker, client);
			ContextHandler terrainTranscodingContextHandler = new ContextHandler(this.terrainTranscodingContextPath);
			terrainTranscodingContextHandler.setHandler(terrainTranscodingHandler);

			ResourceHandler resourceHandler = new ResourceHandler();
			resourceHandler.setDirectoriesListed(true);
			resourceHandler.setWelcomeFiles(new String[] {
				"index.html"
			});
			resourceHandler.setResourceBase(baseDir.getAbsolutePath());
			resourceHandler.setCacheControl("no-cache");

			if (mimeTypesPath != null) {
				MimeTypes mimeTypes = resourceHandler.getMimeTypes();

				Properties properties = new Properties();
				FileInputStream fileInputStream = new FileInputStream(mimeTypesPath);
				properties.load(fileInputStream);
				fileInputStream.close();
				for (String extension : properties.stringPropertyNames()) {
					String mimeType = properties.getProperty(extension);
					mimeTypes.addMimeMapping(extension, mimeType);
				}
			}

			ContextHandler resourceContextHandler = new ContextHandler("/");
			resourceContextHandler.setHandler(resourceHandler);

			ContextHandlerCollection contexts = new ContextHandlerCollection();
			contexts.setHandlers(new Handler[] {
					proxyContextHandler,
					terrainTranscodingContextHandler,
					resourceContextHandler
			});

			server.setHandler(contexts);
			server.start();

			getProject().log("Server listening.  Connect to http://localhost:" + port + " to browse examples.", Project.MSG_INFO);

			server.join();
		} catch (Exception e) {
			throw new BuildException(e);
		}
	}

	public void setProxyContextPath(String value) {
		this.proxyContextPath = value;
	}

	public void setTerrainTranscodingContextPath(String value) {
		this.terrainTranscodingContextPath = value;
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

	public void setUpstreamProxyHost(String value) {
		this.upstreamProxyHost = value;
	}

	public void setUpstreamProxyPort(int value) {
		this.upstreamProxyPort = value;
	}

	public void setNoUpstreamProxyHostList(String value) {
		this.noUpstreamProxyHostList = value;
	}

	public void setListenOnAllAddresses(boolean value) {
		this.listenOnAllAddresses = value;
	}

	public void setMimeTypesPath(String mimeTypesPath) {
		this.mimeTypesPath = mimeTypesPath;
	}
}
