// Based on org.eclipse.jetty.servlets.ProxyServlet 

// ========================================================================
// Copyright (c) 2006-2009 Mort Bay Consulting Pty. Ltd.
// ------------------------------------------------------------------------
// All rights reserved. This program and the accompanying materials
// are made available under the terms of the Eclipse Public License v1.0
// and Apache License v2.0 which accompanies this distribution.
// The Eclipse Public License is available at
// http://www.eclipse.org/legal/epl-v10.html
// The Apache License v2.0 is available at
// http://www.opensource.org/licenses/apache2.0.php
// You may elect to redistribute this code under either of these licenses.
// ========================================================================

package com.agi;

import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.regex.Pattern;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.client.HttpExchange;
import org.eclipse.jetty.continuation.Continuation;
import org.eclipse.jetty.continuation.ContinuationSupport;
import org.eclipse.jetty.io.Buffer;
import org.eclipse.jetty.io.EofException;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;

public final class ProxyHandler extends AbstractHandler {
	private Pattern allowedHosts;
	private HttpClient client;

	private final HashSet<String> dontProxyHeaders = new HashSet<String>();
	{
		dontProxyHeaders.add("proxy-connection");
		dontProxyHeaders.add("connection");
		dontProxyHeaders.add("keep-alive");
		dontProxyHeaders.add("transfer-encoding");
		dontProxyHeaders.add("te");
		dontProxyHeaders.add("trailer");
		dontProxyHeaders.add("proxy-authorization");
		dontProxyHeaders.add("proxy-authenticate");
		dontProxyHeaders.add("upgrade");
	}

	public ProxyHandler(String allowedHostList) throws Exception {
		// build a regex that matches any of the given hosts
		StringBuilder hostPattern = new StringBuilder();
		for (String allowedHost : allowedHostList.split(",")) {
			hostPattern.append("(?:");
			hostPattern.append(allowedHost.trim().replace(".", "\\.").replace("*", ".*"));
			hostPattern.append(")|");
		}

		// trim trailing |
		if (hostPattern.length() > 0)
			hostPattern.setLength(hostPattern.length() - 1);

		allowedHosts = Pattern.compile(hostPattern.toString(), Pattern.CASE_INSENSITIVE);

		client = new HttpClient();
		client.setConnectorType(HttpClient.CONNECTOR_SELECT_CHANNEL);
		client.start();
	}

	public void handle(String target, Request baseRequest, final HttpServletRequest request, final HttpServletResponse response) throws IOException,
			ServletException {
		Enumeration<?> parameterNames = request.getParameterNames();
		if (!parameterNames.hasMoreElements()) {
			response.sendError(400, "No url specified.");
			return;
		}

		URI uri;
		try {
			uri = new URI((String) parameterNames.nextElement());
		} catch (Exception e) {
			throw new ServletException(e);
		}

		if (!allowedHosts.matcher(uri.getHost()).matches()) {
			response.sendError(400, "Host not in list of allowed hosts.");
			return;
		}

		baseRequest.setHandled(true);

		final OutputStream out = response.getOutputStream();
		final Continuation continuation = ContinuationSupport.getContinuation(request);
		if (!continuation.isInitial()) {
			response.sendError(HttpServletResponse.SC_GATEWAY_TIMEOUT);
			return;
		}

		HttpExchange exchange = new HttpExchange() {
			protected void onResponseComplete() throws IOException {
				continuation.complete();
			}

			protected void onResponseContent(Buffer content) throws IOException {
				content.writeTo(out);
			}

			protected void onResponseStatus(Buffer version, int status, Buffer reason) throws IOException {
				response.setStatus(status);
			}

			protected void onResponseHeader(Buffer name, Buffer value) throws IOException {
				String nameStr = name.toString();
				String valueStr = value.toString();
				String nameLower = nameStr.toLowerCase();

				if ("location".equals(nameLower)) {
					StringBuffer url = request.getRequestURL();
					url.append("?");
					url.append(URLEncoder.encode(valueStr, "UTF-8"));
					valueStr = url.toString();
				}

				if (!dontProxyHeaders.contains(nameLower)) {
					response.addHeader(nameStr, valueStr);
				}
			}

			protected void onConnectionFailed(Throwable ex) {
				onException(ex);
			}

			protected void onException(Throwable ex) {
				if (ex instanceof EofException) {
					return;
				}
				if (!response.isCommitted())
					response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
				continuation.complete();
			}

			protected void onExpire() {
				if (!response.isCommitted())
					response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
				continuation.complete();
			}
		};

		exchange.setMethod(request.getMethod());
		exchange.setURI(uri);
		exchange.setVersion(request.getProtocol());

		String connectionHdr = request.getHeader("Connection");
		if (connectionHdr != null) {
			connectionHdr = connectionHdr.toLowerCase();
			if (connectionHdr.indexOf("keep-alive") < 0 && connectionHdr.indexOf("close") < 0)
				connectionHdr = null;
		}

		exchange.setRequestHeader("Host", uri.getHost());

		Enumeration<?> headerNames = request.getHeaderNames();
		while (headerNames.hasMoreElements()) {
			String headerName = (String) headerNames.nextElement();
			String lowerHeader = headerName.toLowerCase();

			if (dontProxyHeaders.contains(lowerHeader))
				continue;
			if (connectionHdr != null && connectionHdr.indexOf(lowerHeader) >= 0)
				continue;
			if ("host".equals(lowerHeader))
				continue;

			Enumeration<?> values = request.getHeaders(headerName);
			while (values.hasMoreElements()) {
				String value = (String) values.nextElement();
				if (value != null) {
					exchange.setRequestHeader(headerName, value);
				}
			}
		}

		// Proxy headers
		exchange.setRequestHeader("Via", "1.1 (jetty)");
		exchange.addRequestHeader("X-Forwarded-For", request.getRemoteAddr());
		exchange.addRequestHeader("X-Forwarded-Proto", request.getScheme());
		exchange.addRequestHeader("X-Forwarded-Host", request.getServerName());
		exchange.addRequestHeader("X-Forwarded-Server", request.getLocalName());

		continuation.suspend(response);
		client.send(exchange);
	}
}