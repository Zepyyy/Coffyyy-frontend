import { db } from "@/db/db";
import type { Enrollment } from "./types";

const ENROLLMENT_ID = "current" as const;

export async function getEnrollment() {
	return db.Enrollment.get(ENROLLMENT_ID);
}

export async function saveEnrollment(
	value: Omit<Enrollment, "id" | "updatedAt"> & Partial<Pick<Enrollment, "updatedAt">>,
) {
	const enrollment: Enrollment = {
		...value,
		id: ENROLLMENT_ID,
		updatedAt: value.updatedAt ?? Date.now(),
	};
	await db.Enrollment.put(enrollment);
	return enrollment;
}

export async function updateEnrollment(changes: Partial<Omit<Enrollment, "id">>) {
	const current = await getEnrollment();
	if (!current) return undefined;
	const next = { ...current, ...changes, updatedAt: Date.now() };
	await db.Enrollment.put(next);
	return next;
}

export async function forgetEnrollment() {
	await db.Enrollment.delete(ENROLLMENT_ID);
}
