import { Navigate, useSearchParams } from "react-router";

/**
 * Old recipe URLs (`/log/recipe?id=`, `?fromBrew=`, `?starter=v60`) land on
 * their `/recipes/*` equivalents.
 */
export default function LegacyRecipeRedirect() {
	const [params] = useSearchParams();
	const id = params.get("id");
	const fromBrew = params.get("fromBrew");
	const starter = params.get("starter");
	const to = id
		? `/recipes/${id}`
		: fromBrew
			? `/recipes/new?fromBrew=${fromBrew}`
			: starter
				? `/recipes/new?starter=${starter}`
				: "/recipes/new";
	return <Navigate to={to} replace />;
}
