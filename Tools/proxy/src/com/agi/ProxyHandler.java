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
import java.io.UnsupportedEncodingException;
import java.net.URI;
import java.net.URLEncoder;
import java.util.Enumeration;
import java.util.HashSet;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.client.HttpExchange;
import org.eclipse.jetty.continuation.Continuation;
import org.eclipse.jetty.continuation.ContinuationSupport;
import org.eclipse.jetty.http.HttpHeaders;
import org.eclipse.jetty.io.Buffer;
import org.eclipse.jetty.io.EofException;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;

public final class ProxyHandler extends AbstractHandler {
	private final HostChecker hostChecker;
	private final HttpClient client;

	private static final HashSet<String> dontProxyHeaders = new HashSet<String>();
	static {
		dontProxyHeaders.add(HttpHeaders.PROXY_CONNECTION.toLowerCase());
		dontProxyHeaders.add(HttpHeaders.CONNECTION.toLowerCase());
		dontProxyHeaders.add(HttpHeaders.KEEP_ALIVE.toLowerCase());
		dontProxyHeaders.add(HttpHeaders.TRANSFER_ENCODING.toLowerCase());
		dontProxyHeaders.add(HttpHeaders.TE.toLowerCase());
		dontProxyHeaders.add(HttpHeaders.TRAILER.toLowerCase());
		dontProxyHeaders.add(HttpHeaders.PROXY_AUTHORIZATION.toLowerCase());
		dontProxyHeaders.add(HttpHeaders.PROXY_AUTHENTICATE.toLowerCase());
		dontProxyHeaders.add(HttpHeaders.UPGRADE.toLowerCase());
	}

	public ProxyHandler(HostChecker hostChecker, HttpClient client) {
		this.hostChecker = hostChecker;
		this.client = client;
	}

	public void handle(String target, Request baseRequest, final HttpServletRequest request, final HttpServletResponse response) throws IOException, ServletException {
		Enumeration<?> parameterNames = request.getParameterNames();
		if (!parameterNames.hasMoreElements()) {
			response.sendError(400, "No url specified.");
			return;
		}

		URI uri;
		try {
			uri = new URI((String) parameterNames.nextElement());

			if (uri.getScheme() == null) {
				uri = new URI("http", uri.getUserInfo(), uri.getHost(), uri.getPort(), uri.getPath(), uri.getQuery(), uri.getFragment());
			}
		} catch (Exception e) {
			throw new ServletException(e);
		}

		if (!hostChecker.allowHost(uri.getHost())) {
			response.sendError(400, "Host not in list of allowed hosts.");
			return;
		}

		baseRequest.setHandled(true);

		final OutputStream out = response.getOutputStream();
		final Continuation continuation = ContinuationSupport.getContinuation(request);
		if (continuation.isExpired()) {
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
				writeProxiedHeader(request, response, name.toString(), value.toString());
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
				if (!continuation.isInitial())
					continuation.complete();
			}

			protected void onExpire() {
				if (!response.isCommitted())
					response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR);
				continuation.complete();
			}
		};

		configureExchangeForProxying(request, uri, exchange);

		continuation.suspend(response);
		client.send(exchange);
	}

	public static void writeProxiedHeader(HttpServletRequest request, HttpServletResponse response, String name, String value) {
		if (HttpHeaders.LOCATION.equalsIgnoreCase(name)) {
			StringBuffer url = request.getRequestURL();
			url.append("?");
			try {
				url.append(URLEncoder.encode(value, "UTF-8"));
				value = url.toString();
			} catch (UnsupportedEncodingException e) {}
		} else if (HttpHeaders.CONTENT_TYPE.equalsIgnoreCase(name)) {
			// some servers return incorrect mime types for JPEG data
			value = value.replace("image/jpg", "image/jpeg");
		}

		if (!dontProxyHeaders.contains(name.toLowerCase())) {
			response.addHeader(name, value);
		}
	}

	public static void configureExchangeForProxying(HttpServletRequest request, URI uri, HttpExchange exchange) {
		exchange.setURI(uri);
		exchange.setMethod(request.getMethod());
		exchange.setVersion(request.getProtocol());

		String connectionHeader = request.getHeader("Connection");
		if (connectionHeader != null) {
			connectionHeader = connectionHeader.toLowerCase();
			if (connectionHeader.indexOf("keep-alive") < 0 && connectionHeader.indexOf("close") < 0)
				connectionHeader = null;
		}

		exchange.setRequestHeader("Host", uri.getHost());

		Enumeration<?> headerNames = request.getHeaderNames();
		while (headerNames.hasMoreElements()) {
			String headerName = (String) headerNames.nextElement();
			String lowerHeader = headerName.toLowerCase();

			if (dontProxyHeaders.contains(lowerHeader))
				continue;
			if (connectionHeader != null && connectionHeader.indexOf(lowerHeader) >= 0)
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
	}
}