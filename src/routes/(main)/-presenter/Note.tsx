import type { ClassValue } from "clsx";
import DOMPurify from "dompurify";
import * as marked from "marked";
import { Suspense } from "react";
import { Card, CardContent } from "#src/components/ui/card.tsx";
import { Skeleton } from "#src/components/ui/skeleton.tsx";
import type {
	ResolvedPdfpcConfigV2,
	ResolvedPdfpcPageV2,
} from "#src/lib/pdfpc-config.ts";
import { cn } from "#src/lib/utils.ts";

interface NoteProps {
	pdfpcConfig: ResolvedPdfpcConfigV2;
	pageNumber: number;
	className?: ClassValue;
}

export function Note(props: NoteProps) {
	return (
		<Suspense fallback={<Skeleton className={props.className}></Skeleton>}>
			<NoteCore {...props} />
		</Suspense>
	);
}

function NoteCore({ className, pdfpcConfig, pageNumber }: NoteProps) {
	const pageConfig = findPageConfig(pdfpcConfig.pages, pageNumber);
	return (
		<Card className={cn("overflow-auto", className)}>
			{pdfpcConfig.disableMarkdown || !pageConfig ? (
				<CardContent
					className="whitespace-pre-wrap px-4"
					style={{
						fontSize: `calc(0.125rem*${pdfpcConfig.noteFontSize})`,
						lineHeight: "1.4",
					}}
				>
					{pageConfig?.note}
				</CardContent>
			) : (
				<CardContent className="px-4">
					<div
						className="prose dark:prose-invert px-6 prose-ul:my-2 prose-ol:my-0 prose-li:my-0 prose-p:my-2 prose-ul:ps-4"
						// biome-ignore lint/security/noDangerouslySetInnerHtml: To render markdown content
						dangerouslySetInnerHTML={{
							__html: DOMPurify.sanitize(
								marked.parse(pageConfig.note, { async: false }),
							),
						}}
						style={{
							fontSize: `calc(1.25px*${pdfpcConfig.noteFontSize})`,
							lineHeight: "1.4",
						}}
					></div>
				</CardContent>
			)}
		</Card>
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
