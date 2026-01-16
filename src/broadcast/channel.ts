let channelCache: {
	fileName: string;
	pairId: string;
	channel: BroadcastChannel;
	onMessage: Set<(event: MessageEvent) => void>;
	onError: Set<(error: Event) => void>;
	isClosed: boolean;
} | null = null;

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY = 1000; // 1 second

export function getBroadcastChannel(
	fileName: string,
	pairId: string,
	options?: {
		onMessage?: (event: MessageEvent) => void;
		onError?: (error: Event) => void;
	},
): BroadcastChannel {
	const needsNewChannel =
		!channelCache ||
		channelCache.isClosed ||
		channelCache?.fileName !== fileName ||
		channelCache.pairId !== pairId;

	if (needsNewChannel) {
		console.log(pairId)
		// Close existing channel if it exists
		if (channelCache && !channelCache.isClosed) {
			channelCache.channel.close();
		}

		const channelName = `pdfpw:${fileName}:${pairId}`;
		const channel = new BroadcastChannel(channelName);

		// Create new cache entry
		channelCache = {
			fileName,
			pairId,
			channel,
			onMessage: new Set(),
			onError: new Set(),
			isClosed: false,
		};

		// Set up error handler with auto-reconnect
		channel.addEventListener("error", (error) => {
			console.error("[BroadcastChannel] Error:", error);
			channelCache?.onError.forEach((handler) => handler(error));

			// Attempt to reconnect
			attemptReconnect(fileName, pairId, options);
		});

		// Set up message handlers
		if (options?.onMessage) {
			channelCache.onMessage.add(options.onMessage);
			channel.addEventListener("message", options.onMessage);
		}
		if (options?.onError) {
			channelCache.onError.add(options.onError);
		}
	} else {
		// Add new handlers to existing channel
		// At this point, channelCache is guaranteed to be non-null
		if (!channelCache) {
			throw new Error("Channel cache is unexpectedly null");
		}
		if (options?.onMessage && !channelCache.onMessage.has(options.onMessage)) {
			channelCache.onMessage.add(options.onMessage);
			channelCache.channel.addEventListener("message", options.onMessage);
		}
		if (options?.onError && !channelCache.onError.has(options.onError)) {
			channelCache.onError.add(options.onError);
		}
	}

	if (!channelCache) {
		throw new Error("Channel cache is unexpectedly null");
	}
	return channelCache.channel;
}

let reconnectAttempts = 0;
let reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

function attemptReconnect(
	fileName: string,
	pairId: string,
	options?: {
		onMessage?: (event: MessageEvent) => void;
		onError?: (error: Event) => void;
	},
) {
	if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
		console.error(
			`[BroadcastChannel] Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached`,
		);
		return;
	}

	if (reconnectTimeoutId) {
		clearTimeout(reconnectTimeoutId);
	}

	reconnectTimeoutId = setTimeout(() => {
		console.log(
			`[BroadcastChannel] Reconnection attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS}`,
		);

		try {
			// Mark current channel as closed
			if (channelCache) {
				channelCache.isClosed = true;
			}

			// Create new channel (will trigger on next getBroadcastChannel call)
			const channelName = `pdfpw:${fileName}:${pairId}`;
			const newChannel = new BroadcastChannel(channelName);

			// Update cache with new channel
			channelCache = {
				fileName,
				pairId,
				channel: newChannel,
				onMessage: channelCache?.onMessage || new Set(),
				onError: channelCache?.onError || new Set(),
				isClosed: false,
			};

			// Re-attach all message handlers
			channelCache.onMessage.forEach((handler) => {
				newChannel.addEventListener("message", handler);
			});
			channelCache.onError.forEach((handler) => {
				newChannel.addEventListener("error", handler);
			});

			reconnectAttempts = 0;
			console.log("[BroadcastChannel] Reconnected successfully");
		} catch (error) {
			console.error("[BroadcastChannel] Reconnection failed:", error);
			reconnectAttempts++;
			attemptReconnect(fileName, pairId, options);
		}
	}, RECONNECT_DELAY * (reconnectAttempts + 1)); // Exponential backoff
}

export function closeBroadcastChannel() {
	if (channelCache && !channelCache.isClosed) {
		channelCache.channel.close();
		channelCache.isClosed = true;

		// Clear all handlers
		channelCache.onMessage.forEach((handler) => {
			channelCache?.channel.removeEventListener("message", handler);
		});
		channelCache.onError.forEach((handler) => {
			channelCache?.channel.removeEventListener("error", handler);
		});
		channelCache.onMessage.clear();
		channelCache.onError.clear();
	}

	// Reset reconnect attempts
	reconnectAttempts = 0;
	if (reconnectTimeoutId) {
		clearTimeout(reconnectTimeoutId);
		reconnectTimeoutId = null;
	}
}
