type PairingMessage =
	| {
			kind: "pair-request";
			requestId: string;
	  }
	| {
			kind: "pair-offer";
			requestId: string;
			pairId: string;
	  };

const pairKey = (fileName: string) => `pdfpw:pairId:${fileName}`;

function getStoredPairId(fileName: string) {
	return sessionStorage.getItem(pairKey(fileName)) ?? undefined;
}

function setStoredPairId(fileName: string, pairId: string) {
	sessionStorage.setItem(pairKey(fileName), pairId);
}

function generatePairId() {
	return crypto.randomUUID();
}

export function getLobbyChannel(fileName: string) {
	return new BroadcastChannel(`pdfpw:lobby:${fileName}`);
}

export function ensurePresenterPairId(fileName: string) {
	const stored = getStoredPairId(fileName);
	if (stored) return stored;
	const pairId = generatePairId();
	setStoredPairId(fileName, pairId);
	return pairId;
}

export function getPresentationPairId(fileName: string) {
	const stored = getStoredPairId(fileName);
	if (stored) return Promise.resolve(stored);

	return new Promise<string>((resolve, reject) => {
		const channel = getLobbyChannel(fileName);
		const abortController = new AbortController();
		const requestId = crypto.randomUUID();
		let resolved = false;

		channel.addEventListener(
			"message",
			(event) => {
				const message = event.data as PairingMessage;
				if (message.kind !== "pair-offer") return;
				if (message.requestId !== requestId) return;
				setStoredPairId(fileName, message.pairId);
				resolved = true;
				channel.close();
				resolve(message.pairId);
			},
			{ signal: abortController.signal },
		);

		channel.postMessage({
			kind: "pair-request",
			requestId,
		} satisfies PairingMessage);
		setTimeout(() => {
			if (resolved) return;
			channel.postMessage({
				kind: "pair-request",
				requestId,
			} satisfies PairingMessage);
		}, 300);

		setTimeout(() => {
			abortController.abort();
			channel.close();
			reject(new Error("TIMEOUT_PAIRING_PRESENTATION"));
		}, 5000);
	});
}

export function replyPairOffer(
	fileName: string,
	pairId: string,
	requestId: string,
) {
	const channel = getLobbyChannel(fileName);
	channel.postMessage({
		kind: "pair-offer",
		requestId,
		pairId,
	} satisfies PairingMessage);
	channel.close();
}
