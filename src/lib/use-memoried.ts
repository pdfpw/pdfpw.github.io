export function createUseMemoried<T extends unknown[], U>(
	fn: (...args: T) => U,
) {
	let lastArgs: T | null = null;
	let lastResult: U | null = null;
	return function useMemoried(...args: T): U {
		let changed = lastArgs === null || lastArgs.length !== args.length;
		for (let i = 0; !changed && i < args.length; i++) {
			if (args[i] !== lastArgs![i]) {
				changed = true;
			}
		}
		if (changed) {
			lastResult = fn(...args);
			lastArgs = args;
		}
		return lastResult!;
	};
}
