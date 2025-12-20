import type { ClassValue } from "clsx";
import * as marked from "marked";
import { Suspense, use, useEffect, useEffectEvent } from "react";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import type {
	ResolvedPdfpcConfigV2,
	ResolvedPdfpcPageV2,
} from "#src/lib/pdfpc-config.ts";

interface NoteProps {
	pdfpcConfigPromise: Promise<ResolvedPdfpcConfigV2>;
	pageNumber: number;
	className?: string;
}

export function Note(props: NoteProps) {
	return (
		<Suspense fallback={<Skeleton className={props.className}></Skeleton>}>
			<NoteCore {...props} />
		</Suspense>
	);
}

function NoteCore({ className, pdfpcConfigPromise, pageNumber }: NoteProps) {
	const pdfpcConfig = use(pdfpcConfigPromise);
	const pageConfig = findPageConfig(pdfpcConfig.pages, pageNumber);
	return (
		<div className={className}>
			{pdfpcConfig.disableMarkdown || !pageConfig ? (
				<div className="whitespace-pre-wrap overflow-auto">
					{pageConfig?.note}
				</div>
			) : (
				<div
					className="overflow-auto"
					// biome-ignore lint/security/noDangerouslySetInnerHtml: To render markdown content
					dangerouslySetInnerHTML={{
						__html: marked.parse(pageConfig.note, { async: false }),
					}}
				></div>
			)}
		</div>
	);
}

function findPageConfig(pages: ResolvedPdfpcPageV2[][], pageNumber: number) {
	for (const pageConfigs of pages) {
		for (const pageConfig of pageConfigs) {
			if (pageConfig.pageNumber === pageNumber) {
				return pageConfig;
			}
		}
	}
	return null;
}
