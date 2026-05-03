import {
	createTypstCompiler,
	FetchPackageRegistry,
	initOptions,
	MemoryAccessModel,
} from "@myriaddreamin/typst.ts";
// Note: in typst.ts 0.6, withAccessModel/withPackageRegistry are exposed via the
// `initOptions` namespace re-export, not as top-level named exports.
import wasmUrl from "@myriaddreamin/typst-ts-web-compiler/wasm?url";
import type {
	CompileRequest,
	CompileResult,
	TypstDiagnostic,
	WorkerInbound,
	WorkerOutbound,
} from "#src/lib/typst";

const RANGE_RE = /^(\d+):(\d+)-\d+:\d+$/;

function parseDiagnostic(d: {
	package: string;
	path: string;
	severity: string;
	range: string;
	message: string;
}): TypstDiagnostic {
	const m = RANGE_RE.exec(d.range);
	return {
		severity: d.severity === "warning" ? "warning" : "error",
		path: d.path,
		line: m ? Number(m[1]) : 1,
		column: m ? Number(m[2]) : 1,
		message: d.message,
		package: d.package || undefined,
	};
}

function post(msg: WorkerOutbound) {
	(self as unknown as Worker).postMessage(msg);
}

async function compile(req: CompileRequest): Promise<CompileResult> {
	post({ kind: "progress", payload: { stage: "loading-wasm" } });

	const am = new MemoryAccessModel();
	const reg = new FetchPackageRegistry(am);
	const compiler = createTypstCompiler();
	await compiler.init({
		getModule: () => fetch(wasmUrl).then((r) => r.arrayBuffer()),
		beforeBuild: [
			initOptions.withAccessModel(am),
			initOptions.withPackageRegistry(reg),
		],
	});

	for (const src of req.sources) {
		if (/\.typ$/i.test(src.path)) {
			compiler.addSource(`/${src.path}`, new TextDecoder().decode(src.data));
		} else {
			compiler.mapShadow(`/${src.path}`, src.data);
		}
	}

	// Note: typst.ts 0.6 does not expose package-fetch lifecycle events.
	// The `fetching-packages` stage in the protocol is reserved for future use
	// and is currently never emitted here.
	post({ kind: "progress", payload: { stage: "compiling" } });
	const res = await compiler.compile({
		format: "pdf",
		mainFilePath: `/${req.mainPath}`,
		diagnostics: "full",
	});

	if (res.result && res.result.length > 0) {
		return { ok: true, pdf: res.result };
	}
	const diagnostics = (res.diagnostics ?? []).map(parseDiagnostic);
	return { ok: false, diagnostics };
}

self.addEventListener("message", async (ev: MessageEvent<WorkerInbound>) => {
	if (ev.data.kind !== "compile") return;
	try {
		const result = await compile(ev.data.req);
		post({ kind: "result", payload: result });
	} catch (err) {
		post({
			kind: "fatal",
			message: err instanceof Error ? err.message : String(err),
		});
	}
});
