import SegmentedControl from "@/components/ui/SegmentedControl";
import { methodOption } from "@/components/method/methodOption";
import type { BrewMethod } from "@/types/BrewTypes";

/**
 * Brew method switch for bean views. Renders nothing unless the bean has
 * brews in more than one method.
 */
export default function MethodSwitch({
	methods,
	value,
	onChange,
	className,
}: {
	methods: BrewMethod[];
	value: BrewMethod;
	onChange: (method: BrewMethod) => void;
	className?: string;
}) {
	if (methods.length < 2) return null;
	return (
		<SegmentedControl
			ariaLabel="Brew method"
			className={className}
			options={methods.map((method) => methodOption(method))}
			value={value}
			onChange={onChange}
		/>
	);
}
