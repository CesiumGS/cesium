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

import java.awt.Transparency;
import java.awt.color.ColorSpace;
import java.awt.image.BufferedImage;
import java.awt.image.ColorModel;
import java.awt.image.ComponentColorModel;
import java.awt.image.DataBuffer;
import java.awt.image.DataBufferUShort;
import java.awt.image.Raster;
import java.awt.image.WritableRaster;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.util.Arrays;
import java.util.Enumeration;
import java.util.HashSet;
import java.util.regex.Pattern;

import javax.imageio.ImageIO;
import javax.imageio.spi.IIORegistry;
import javax.servlet.ServletException;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.eclipse.jetty.client.Address;
import org.eclipse.jetty.client.HttpClient;
import org.eclipse.jetty.client.HttpExchange;
import org.eclipse.jetty.continuation.Continuation;
import org.eclipse.jetty.continuation.ContinuationSupport;
import org.eclipse.jetty.io.Buffer;
import org.eclipse.jetty.io.EofException;
import org.eclipse.jetty.server.Request;
import org.eclipse.jetty.server.handler.AbstractHandler;

public final class TiffToPngHandler extends AbstractHandler {
	private final Pattern allowedHosts;
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
	
	public static void main(String[] args) throws IOException {
		IIORegistry registry = IIORegistry.getDefaultInstance();  
		registry.registerServiceProvider(new com.sun.media.imageioimpl.plugins.tiff.TIFFImageWriterSpi());  
		registry.registerServiceProvider(new com.sun.media.imageioimpl.plugins.tiff.TIFFImageReaderSpi());

		BufferedImage sourceImage = ImageIO.read(new File("C:\\GitHub\\cesium\\Tools\\proxy\\test.tif"));
		Raster sourceRaster = sourceImage.getData();

		float[] pixels = new float[sourceImage.getWidth() * sourceImage.getHeight()];
		sourceRaster.getSamples(0, 0, sourceImage.getWidth(), sourceImage.getHeight(), 0, pixels);

		final int bias = 1000;

		short[] shortPixels = new short[sourceImage.getWidth() * sourceImage.getHeight()];
		for (int i = 0; i < shortPixels.length; ++i) {
			int value = Math.round(pixels[i]) + bias;
			shortPixels[i] = (short)value;
		}
		
		ColorModel colorModel = new ComponentColorModel(
	            ColorSpace.getInstance(ColorSpace.CS_GRAY),
	            new int[]{16},
	            false,
	            false,
	            Transparency.OPAQUE,
	            DataBuffer.TYPE_USHORT);
		
		DataBufferUShort db = new DataBufferUShort(shortPixels, shortPixels.length);
		
		WritableRaster raster = Raster.createInterleavedRaster(db, sourceImage.getWidth(), sourceImage.getHeight(), sourceImage.getWidth(), 1, new int[1], null);
		BufferedImage targetImage = new BufferedImage(colorModel, raster, false, null);
		
		ImageIO.write(targetImage, "PNG", new File("C:\\GitHub\\cesium\\Tools\\proxy\\test.png"));
		
		BufferedImage reloaded = ImageIO.read(new File("C:\\GitHub\\cesium\\Tools\\proxy\\test.png"));
		Raster reloadedRaster = reloaded.getData();

		int[] reloadedPixels = new int[reloaded.getWidth() * reloaded.getHeight()];
		reloadedRaster.getSamples(0, 0, reloaded.getWidth(), reloaded.getHeight(), 0, reloadedPixels);
		
		for (int i = 0; i < pixels.length; ++i) {
			if (reloadedPixels[i] != Math.round(pixels[i]) + bias) {
				System.out.println("Bad: " + Float.toString(pixels[i]) + " -> " + Short.toString((short)shortPixels[i]));
			}
		}
	}

	public TiffToPngHandler(String allowedHostList, String upstreamProxyHost, Integer upstreamProxyPort, String noUpstreamProxyHostList) throws Exception {
		allowedHosts = hostListToPattern(allowedHostList);

		client = new HttpClient();

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
	}

	private static final Pattern hostListToPattern(String hosts) {
		// build a regex that matches any of the given hosts
		StringBuilder pattern = new StringBuilder();
		for (String allowedHost : hosts.split(",")) {
			pattern.append("(?:");
			pattern.append(allowedHost.trim().replace(".", "\\.").replace("*", ".*"));
			pattern.append(")|");
		}

		// trim trailing |
		if (pattern.length() > 0)
			pattern.setLength(pattern.length() - 1);

		return Pattern.compile(pattern.toString(), Pattern.CASE_INSENSITIVE);
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
			private byte[] tiff;
			private int nextTiffPosition;

			protected void onResponseComplete() throws IOException {
				ByteArrayInputStream inputStream = null;
				try {
					IIORegistry registry = IIORegistry.getDefaultInstance();  
					registry.registerServiceProvider(new com.sun.media.imageioimpl.plugins.tiff.TIFFImageWriterSpi());  
					registry.registerServiceProvider(new com.sun.media.imageioimpl.plugins.tiff.TIFFImageReaderSpi());

					inputStream = new ByteArrayInputStream(tiff);
					BufferedImage sourceImage = ImageIO.read(inputStream);
					Raster sourceRaster = sourceImage.getData();

					float[] pixels = new float[sourceImage.getWidth() * sourceImage.getHeight()];
					sourceRaster.getSamples(0, 0, sourceImage.getWidth(), sourceImage.getHeight(), 0, pixels);

					final int bias = 1000;

					short[] shortPixels = new short[sourceImage.getWidth() * sourceImage.getHeight()];
					for (int i = 0; i < shortPixels.length; ++i) {
						int value = Math.round(pixels[i]) + bias;
						shortPixels[i] = (short)value;
					}
					
					ColorModel colorModel = new ComponentColorModel(
				            ColorSpace.getInstance(ColorSpace.CS_GRAY),
				            new int[]{16},
				            false,
				            false,
				            Transparency.OPAQUE,
				            DataBuffer.TYPE_USHORT);
					
					DataBufferUShort db = new DataBufferUShort(shortPixels, shortPixels.length);
					
					WritableRaster raster = Raster.createInterleavedRaster(db, sourceImage.getWidth(), sourceImage.getHeight(), sourceImage.getWidth(), 1, new int[1], null);
					BufferedImage targetImage = new BufferedImage(colorModel, raster, false, null);
					
					ImageIO.write(targetImage, "PNG", out);
				} finally {
					if (inputStream != null) inputStream.close();
					continuation.complete();
				}
			}

			protected void onResponseContent(Buffer content) throws IOException {
				int spaceRequired = nextTiffPosition + content.length();
				if (tiff == null || tiff.length < spaceRequired) {
					tiff = tiff == null ? new byte[spaceRequired] : Arrays.copyOf(tiff, spaceRequired);
				}
				nextTiffPosition += content.get(tiff, nextTiffPosition, content.length());
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
				
				if ("content-length".equals(nameLower)) {
					tiff = new byte[Integer.parseInt(valueStr)];
				}
				
				if ("content-type".equals(nameLower) && "image/tiff".equals(valueStr)) {
					valueStr = "image/png";
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