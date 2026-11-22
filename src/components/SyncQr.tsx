import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { buildSyncLink } from "@/lib/syncLink";

export default function SyncQr({ code }: { code: string }) {
	const [svg, setSvg] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;
		QRCode.toString(buildSyncLink(code), {
			type: "svg",
			margin: 1,
			errorCorrectionLevel: "M",
			color: { dark: "#000000", light: "#ffffff" },
		})
			.then((value) => !cancelled && setSvg(value))
			.catch(() => !cancelled && setSvg(null));
		return () => {
			cancelled = true;
		};
	}, [code]);

	if (!svg) return null;
	return (
		<div className="flex flex-col items-center gap-2">
			<div
				role="img"
				aria-label="QR code with your sync link"
				className="size-44 rounded-lg bg-white p-1 [&>svg]:size-full"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: SVG generated locally by qrcode
				dangerouslySetInnerHTML={{ __html: svg }}
			/>
			<p className="text-center text-xs text-muted-foreground">
				Scan with your phone's camera: Coffyyy opens there, already synced.
				Anyone who scans it can access your workspace.
			</p>
		</div>
	);
}
