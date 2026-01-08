declare global {
	interface PresenterCommandMap {}
	interface PresentationCommandMap {}
}

type PresenterActionInternal = {
	[K in keyof PresenterCommandMap]: {
		command: K;
		from: "presenter";
	} & PresenterCommandMap[K];
}[keyof PresenterCommandMap];

type PresentationActionInternal = {
	[K in keyof PresentationCommandMap]: {
		command: K;
		from: "presentation";
	} & PresentationCommandMap[K];
}[keyof PresentationCommandMap];

export type PresenterAction = PresenterActionInternal;
export type PresentationAction = PresentationActionInternal;
export type BroadcastAction = PresenterAction | PresentationAction;
