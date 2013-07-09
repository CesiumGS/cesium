package com.agi;

import java.util.regex.Pattern;

public class HostChecker {
	private final Pattern allowedHosts;

	public HostChecker(String allowedHostList) {
		allowedHosts = hostListToPattern(allowedHostList);
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

	public boolean allowHost(String host) {
		if (host == null) {
			return false;
		}
		return allowedHosts.matcher(host).matches();
	}
}
