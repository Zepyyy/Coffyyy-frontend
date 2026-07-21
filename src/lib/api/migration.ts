import { db } from "@/db/db";
import type { Beans } from "@/types/BeanTypes";
import type { Brews } from "@/types/BrewTypes";
import type { Machines } from "@/types/MachineTypes";
import { api } from "@/lib/axios";

export type LocalSnapshot = {
	beans: Beans[];
	machines: Machines[];
	brews: Brews[];
};

type ImportPayload = {
	schemaVersion: number;
	idempotencyKey: string;
	beans: Array<Record<string, unknown>>;
	machines: Array<Record<string, unknown>>;
	brews: Array<Record<string, unknown>>;
};

type RemoteBean = Record<string, unknown> & { id: number };
type RemoteMachine = Record<string, unknown> & { id: number };
type RemoteBrew = Record<string, unknown> & { id: number };

export type RemoteWorkspace = {
	beans: RemoteBean[];
	machines: RemoteMachine[];
	brews: RemoteBrew[];
};

export async function snapshotLocalData(): Promise<LocalSnapshot> {
	const [beans, machines, brews] = await Promise.all([
		db.Beans.toArray(),
		db.Machines.toArray(),
		db.Brews.toArray(),
	]);
	return { beans, machines, brews };
}

function enumValue(value: string, fallback: string) {
	return value ? value.replaceAll(" ", "_").toUpperCase() : fallback;
}

function toImportPayload(snapshot: LocalSnapshot): ImportPayload {
	return {
		schemaVersion: 5,
		idempotencyKey: crypto.randomUUID(),
		beans: snapshot.beans.map((bean) => ({
			localId: bean.id,
			name: bean.name,
			flavors: bean.flavors,
			rating: bean.rating,
			roastLevel: bean.roastLevel,
			countries: bean.origin,
			cities: [],
			botanic: enumValue(bean.botanic, "ARABICA"),
			varieties: bean.variety,
			brands: bean.brand ? [bean.brand] : [],
			status: enumValue(bean.status, "NEW"),
			dominantNote: enumValue(bean.dominantNote, "FRUITY"),
			designation: enumValue(bean.designation, "PURE_ORIGIN"),
			finished: bean.finished,
		})),
		machines: snapshot.machines.map((machine) => ({
			localId: machine.id,
			name: machine.name,
			brand: machine.brand,
			type: machine.type,
			purchaseDate: machine.purchaseDate || null,
			model: machine.model,
			grindRange: machine.grindRange,
			capacity: machine.capacity,
		})),
		brews: snapshot.brews.map((brew) => ({
			localId: brew.id,
			beanLocalId: brew.beanId,
			machineLocalId: brew.machineId,
			beanWeight: brew.beanWeight,
			espressoWeight: brew.espressoWeight,
			extractionTime: brew.extractionTime ?? "",
			flow: brew.flow ?? "",
			overallRating: brew.overallRating ?? 0,
			tasteScore: brew.tasteScore ?? 0,
			strengthScore: brew.strengthScore ?? 0,
			grindSize: brew.grindSize,
			date: new Date(brew.date).toISOString(),
		})),
	};
}

export async function importLocalData(snapshot: LocalSnapshot) {
	const payload = toImportPayload(snapshot);
	return api.post<{ status: string }>("/migration/import", payload);
}

export async function fetchRemoteWorkspace(): Promise<RemoteWorkspace> {
	const [beans, machines, brews] = await Promise.all([
		api.get<RemoteBean[]>("/bean"),
		api.get<RemoteMachine[]>("/machine"),
		api.get<RemoteBrew[]>("/brew"),
	]);
	return {
		beans: beans.data,
		machines: machines.data,
		brews: brews.data,
	};
}

export function assertCanonicalWorkspace(
	snapshot: LocalSnapshot,
	remote: RemoteWorkspace,
) {
	const remoteBeanNames = new Set(remote.beans.map((bean) => text(bean.name)));
	const remoteMachineNames = new Set(
		remote.machines.map((machine) => text(machine.name)),
	);
	if (snapshot.beans.some((bean) => !remoteBeanNames.has(bean.name))) {
		throw new Error("Canonical bean verification failed");
	}
	if (
		snapshot.machines.some((machine) => !remoteMachineNames.has(machine.name))
	) {
		throw new Error("Canonical machine verification failed");
	}
	if (remote.brews.length < snapshot.brews.length) {
		throw new Error("Canonical brew verification failed");
	}
}

function text(value: unknown) {
	return typeof value === "string" ? value : "";
}

function strings(value: unknown) {
	return Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];
}

function titleEnum(value: unknown, fallback: string) {
	const source = text(value) || fallback;
	return source
		.toLowerCase()
		.replaceAll("_", " ")
		.split(/\s+/)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

function remoteBean(bean: RemoteBean): Beans {
	const brands = strings(bean.brands);
	return {
		id: bean.id,
		name: text(bean.name),
		flavors: strings(bean.flavors),
		rating: Number(bean.rating) || 0,
		status: titleEnum(bean.status, "NEW") as Beans["status"],
		dominantNote: titleEnum(
			bean.dominantNote,
			"FRUITY",
		) as Beans["dominantNote"],
		roastLevel: Number(bean.roastLevel) || 0,
		origin: [...strings(bean.countries), ...strings(bean.cities)],
		process: [],
		variety: strings(bean.varieties),
		brand: brands[0] ?? "",
		botanic: titleEnum(bean.botanic, "ARABICA") as Beans["botanic"],
		designation: titleEnum(
			bean.designation,
			"PURE ORIGIN",
		) as Beans["designation"],
		finished: Boolean(bean.finished),
	};
}

function remoteMachine(machine: RemoteMachine): Machines {
	return {
		id: machine.id,
		name: text(machine.name),
		brand: text(machine.brand),
		type: text(machine.type),
		purchaseDate: text(machine.purchaseDate),
		model: text(machine.model),
		grindRange: text(machine.grindRange),
		capacity: text(machine.capacity),
	};
}

function remoteBrew(brew: RemoteBrew): Brews {
	return {
		id: brew.id,
		beanWeight: Number(brew.beanWeight) || 0,
		espressoWeight: Number(brew.espressoWeight) || 0,
		extractionTime: text(brew.extractionTime),
		flow: text(brew.flow),
		overallRating: Number(brew.overallRating) || 0,
		tasteScore: Number(brew.tasteScore) || 0,
		strengthScore: Number(brew.strengthScore) || 0,
		grindSize: Number(brew.grindSize) || 0,
		date: new Date(text(brew.date)),
		beanId: Number(brew.beanId),
		machineId: Number(brew.machineId),
	};
}

export async function replaceWithRemoteData(remote: RemoteWorkspace) {
	await db.transaction("rw", db.Beans, db.Machines, db.Brews, async () => {
		await db.Brews.clear();
		await db.Beans.clear();
		await db.Machines.clear();
		await db.Beans.bulkPut(remote.beans.map(remoteBean));
		await db.Machines.bulkPut(remote.machines.map(remoteMachine));
		await db.Brews.bulkPut(remote.brews.map(remoteBrew));
	});
}

export async function restoreLocalData(snapshot: LocalSnapshot) {
	await db.transaction("rw", db.Beans, db.Machines, db.Brews, async () => {
		await db.Brews.clear();
		await db.Beans.clear();
		await db.Machines.clear();
		await db.Beans.bulkPut(snapshot.beans);
		await db.Machines.bulkPut(snapshot.machines);
		await db.Brews.bulkPut(snapshot.brews);
	});
}
