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

import java.awt.image.BufferedImage;
import java.awt.image.DataBuffer;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.util.Enumeration;

import javax.imageio.ImageIO;
import javax.imageio.spi.IIORegistry;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.client.HttpExchange;
import org.eclipse.jetty.continuation.Continuation;
import org.eclipse.jetty.continuation.ContinuationSupport;
import org.eclipse.jetty.http.HttpHeaders;
import org.eclipse.jetty.io.Buffer;
import org.eclipse.jetty.io.BufferUtil;
import org.eclipse.jetty.io.EofException;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;

import com.sun.media.imageioimpl.plugins.tiff.TIFFImageReaderSpi;
import com.sun.media.imageioimpl.plugins.tiff.TIFFImageWriterSpi;

public final class TerrainTranscodingHandler extends AbstractHandler {
	private final HttpClient client;
	private final HostChecker hostChecker;

	public TerrainTranscodingHandler(HostChecker hostChecker, HttpClient client) {
		IIORegistry registry = IIORegistry.getDefaultInstance();
		registry.registerServiceProvider(new TIFFImageWriterSpi());
		registry.registerServiceProvider(new TIFFImageReaderSpi());

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
		} catch (Exception e) {
			throw new ServletException(e);
		}

		if (!hostChecker.allowHost(uri.getHost())) {
			response.sendError(400, "Host not in list of allowed hosts.");
			return;
		}

		baseRequest.setHandled(true);

		final Continuation continuation = ContinuationSupport.getContinuation(request);
		if (!continuation.isInitial()) {
			response.sendError(HttpServletResponse.SC_GATEWAY_TIMEOUT);
			return;
		}

		HttpExchange exchange = new HttpExchange() {
			int bufferSize = 4096;
			ByteArrayOutputStream responseContent;

			protected void onResponseComplete() throws IOException {
				ByteArrayInputStream tiffInputStream = new ByteArrayInputStream(responseContent.toByteArray());
				BufferedImage resultImage = encodeHeightFloatsAsIntegers(tiffInputStream);

				response.setContentType("image/png");
				ImageIO.write(resultImage, "PNG", response.getOutputStream());

				continuation.complete();
			}

			protected void onResponseContent(Buffer content) throws IOException {
				if (responseContent == null)
					responseContent = new ByteArrayOutputStream(bufferSize);
				content.writeTo(responseContent);
			}

			protected void onResponseStatus(Buffer version, int status, Buffer reason) throws IOException {
				response.setStatus(status);
			}

			protected void onResponseHeader(Buffer name, Buffer value) throws IOException {
				if (HttpHeaders.CONTENT_LENGTH_BUFFER.equalsIgnoreCase(name)) {
					bufferSize = BufferUtil.toInt(value);
				} else if (!HttpHeaders.CONTENT_TYPE_BUFFER.equalsIgnoreCase(name)) {
					ProxyHandler.writeProxiedHeader(request, response, name.toString(), value.toString());
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

		ProxyHandler.configureExchangeForProxying(request, uri, exchange);

		continuation.suspend(response);
		client.send(exchange);
	}

	private static BufferedImage encodeHeightFloatsAsIntegers(InputStream input) throws IOException {
		BufferedImage sourceImage = ImageIO.read(input);
		DataBuffer sourceBuffer = sourceImage.getRaster().getDataBuffer();

		BufferedImage resultImage = new BufferedImage(sourceImage.getWidth(), sourceImage.getHeight(), BufferedImage.TYPE_INT_RGB);
		DataBuffer resultBuffer = resultImage.getRaster().getDataBuffer();

		final float bias = 1000.0f;

		for (int i = 0; i < sourceBuffer.getSize(); ++i) {
			// Offset the height by 1000.0 meters to avoid negative heights.
			float heightFloat = sourceBuffer.getElemFloat(i) + bias;

			// Convert the height to integer millimeters.
			int height = (int) (heightFloat * 1000.0);

			if (height < 0 || height >= (1 << 24))
				throw new RuntimeException("Invalid height.");

			// Encode the high byte in red, low byte in blue.
			resultBuffer.setElem(i, height);
		}

		return resultImage;
	}
}