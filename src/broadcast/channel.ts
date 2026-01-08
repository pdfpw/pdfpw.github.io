let channelCache: {
	fileName: string;
	pairId: string;
	channel: BroadcastChannel;
} | null = null;

export function getBroadcastChannel(fileName: string, pairId: string) {
	if (channelCache?.fileName !== fileName || channelCache.pairId !== pairId) {
		channelCache?.channel.close();
		channelCache = {
			fileName,
			pairId,
			channel: new BroadcastChannel(`pdfpw:${fileName}:${pairId}`),
		};
	}
	return channelCache.channel;
}
