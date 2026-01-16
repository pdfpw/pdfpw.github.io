import type { Merge } from "type-fest";

declare global {
	interface PresenterCommandMap {}
	interface PresentationCommandMap {}
}

type PresenterActionInternal = {
	[K in keyof PresenterCommandMap]: Merge<
		PresenterCommandMap[K],
		{
			command: K;
			from: "presenter";
		}
	>;
}[keyof PresenterCommandMap];

type PresentationActionInternal = {
	[K in keyof PresentationCommandMap]: Merge<
		PresentationCommandMap[K],
		{
			command: K;
			from: "presentation";
		}
	>;
}[keyof PresentationCommandMap];

export type PresenterAction = PresenterActionInternal;
export type PresentationAction = PresentationActionInternal;
export type BroadcastAction = PresenterAction | PresentationAction;
