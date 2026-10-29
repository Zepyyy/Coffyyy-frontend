import SteamCup from "@/components/ui/SteamCup";
import "./CenserVessel.css";

/* Rooted at SteamCup's wisp tops (x 10.9 / 14.2 / 17.5 on its 30-unit grid). */
const WISPS = [
	"M10.9 24C5.5 20.5 13 17 8.6 12.4S7.5 4.5 10.6 0.8",
	"M14.2 24C19.5 19.5 10.5 15.5 15.4 10.6S20 4 15 0.2",
	"M17.5 24C22.8 21.5 15.2 17.8 20.4 13.6S22.4 8 19.4 4.6",
];

/**
 * The Home censer's vessel: the existing SteamCup with its vapor continued
 * upward as a plume. Size comes from the parent's `--cup` custom property.
 * Place inside `.censer-key`; the plume reads `.group` hover from the key.
 */
export default function CenserVessel() {
	return (
		<span aria-hidden className="censer-vessel">
			<span className="censer-halo" />
			<svg className="censer-plume" viewBox="0 0 30 24">
				{WISPS.map((d, i) => (
					<path key={d} className="trace" d={d} pathLength={1} data-wisp={i} />
				))}
				{WISPS.map((d, i) => (
					<path
						key={d}
						className={`run p${i + 1}`}
						d={d}
						pathLength={1}
						data-wisp={i}
					/>
				))}
			</svg>
			<SteamCup className="text-crema" />
		</span>
	);
}
