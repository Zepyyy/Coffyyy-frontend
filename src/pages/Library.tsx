import { Navigate, useParams } from "react-router";
import LibraryShell from "@/components/library/LibraryShell";
import { LIBRARY_DEFAULT_PATH } from "@/lib/libraryRoutes";

export default function LibraryRoute() {
	return <LibraryShell />;
}

export function LibraryIndexRedirect() {
	return <Navigate to={LIBRARY_DEFAULT_PATH} replace />;
}

export function LegacyBeanRedirect() {
	const { BeanId } = useParams();
	return <Navigate to={`/library/beans/${BeanId}`} replace />;
}
