const baseUrl = (process.env.COFFYYY_SYNC_BASE_URL ?? "http://localhost:3000/api").replace(/\/$/, "");
const cursor = Number(process.env.COFFYYY_SYNC_CURSOR ?? 0);
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const CLOCK_TOLERANCE_MS = 5 * 60 * 1000;

if (!Number.isInteger(cursor) || cursor < 0) {
	throw new Error("COFFYYY_SYNC_CURSOR must be a non-negative integer");
}

const devices = ["A", "B"].map((label) => {
	const session = process.env[`COFFYYY_DEVICE_${label}_SESSION_COOKIE`];
	const csrf = process.env[`COFFYYY_DEVICE_${label}_CSRF_TOKEN`];
	if (!session || !csrf) {
		throw new Error(
			`Missing COFFYYY_DEVICE_${label}_SESSION_COOKIE or COFFYYY_DEVICE_${label}_CSRF_TOKEN`,
		);
	}
	return { label, session, csrf };
});

async function request(device, path) {
	const response = await fetch(`${baseUrl}${path}`, {
		headers: {
			Cookie: device.session,
			"X-CSRF-TOKEN": device.csrf,
		},
	});
	const text = await response.text();
	let body;
	try {
		body = JSON.parse(text);
	} catch {
		body = text;
	}
	if (!response.ok) {
		const message =
			typeof body === "object" && body !== null && "message" in body
				? body.message
				: response.statusText;
		throw new Error(`${device.label} ${path}: ${response.status} ${message}`);
	}
	return body;
}

function sortRecords(records) {
	return [...records].sort((left, right) => Number(left.id) - Number(right.id));
}

function comparableWorkspace(workspace) {
	return JSON.stringify({
		beans: sortRecords(workspace.beans),
		machines: sortRecords(workspace.machines),
		brews: sortRecords(workspace.brews),
	});
}

function assertWorkspace(workspace, label) {
	if (
		!Array.isArray(workspace.beans) ||
		!Array.isArray(workspace.machines) ||
		!Array.isArray(workspace.brews)
	) {
		throw new Error(`${label} workspace response is invalid`);
	}
	const beanIds = new Set(workspace.beans.map((bean) => bean.id));
	const machineIds = new Set(workspace.machines.map((machine) => machine.id));
	for (const brew of workspace.brews) {
		if (!beanIds.has(Number(brew.beanId)) || !machineIds.has(Number(brew.machineId))) {
			throw new Error(`${label} brew ${brew.id} has a dangling reference`);
		}
	}
}

function assertRetentionBoundary(value, label) {
	const boundary = Date.parse(value);
	if (!Number.isFinite(boundary)) {
		throw new Error(`${label} history retention boundary is not a date`);
	}
	if (Math.abs(Date.now() - boundary - SEVEN_DAYS_MS) > CLOCK_TOLERANCE_MS) {
		throw new Error(`${label} history retention boundary is not seven days`);
	}
	return boundary;
}

async function readWorkspace(device) {
	const session = await request(device, "/auth/sync/session");
	const [beans, machines, brews] = await Promise.all([
		request(device, "/bean"),
		request(device, "/machine"),
		request(device, "/brew"),
	]);
	const workspace = { beans, machines, brews };
	assertWorkspace(workspace, device.label);
	return { session, workspace };
}

async function readChanges(device) {
	let since = cursor;
	let pages = 0;
	let changes = 0;
	let fullResyncRequired = false;
	while (true) {
		const page = await request(device, `/sync/changes?since=${since}&limit=100`);
		pages += 1;
		if (page.fullResyncRequired) {
			if (page.changes?.length !== 0 || page.nextCursor !== null) {
				throw new Error(`${device.label} full-resync response is invalid`);
			}
			fullResyncRequired = true;
			break;
		}
		if (
			!Array.isArray(page.changes) ||
			typeof page.nextCursor !== "number" ||
			typeof page.hasMore !== "boolean"
		) {
			throw new Error(`${device.label} change page is invalid`);
		}
		changes += page.changes.length;
		if (!page.hasMore) {
			return { pages, changes, cursor: page.nextCursor, fullResyncRequired };
		}
		if (page.nextCursor <= since) {
			throw new Error(`${device.label} change feed did not advance`);
		}
		since = page.nextCursor;
	}
	return { pages, changes, cursor: null, fullResyncRequired };
}

async function readHistory(device) {
	let since = 0;
	let pages = 0;
	let entries = 0;
	let retentionBoundary = null;
	while (true) {
		const page = await request(device, `/sync/history?since=${since}&limit=100`);
		pages += 1;
		if (!Array.isArray(page.changes) || typeof page.nextCursor !== "number") {
			throw new Error(`${device.label} history page is invalid`);
		}
		if (typeof page.retentionBoundary !== "string") {
			throw new Error(`${device.label} history retention boundary is invalid`);
		}
		const boundary = assertRetentionBoundary(
			page.retentionBoundary,
			device.label,
		);
		retentionBoundary ??= page.retentionBoundary;
		for (const entry of page.changes) {
			const createdAt = Date.parse(entry.createdAt);
			if (
				!Number.isFinite(createdAt) ||
				createdAt < boundary ||
				createdAt > Date.now() + CLOCK_TOLERANCE_MS
			) {
				throw new Error(`${device.label} history entry is outside retention`);
			}
		}
		entries += page.changes.length;
		if (!page.hasMore) break;
		if (page.nextCursor <= since) {
			throw new Error(`${device.label} history feed did not advance`);
		}
		since = page.nextCursor;
	}
	return { pages, entries, retentionBoundary };
}

const [first, second] = await Promise.all(devices.map(readWorkspace));
if (first.session.workspaceId !== second.session.workspaceId) {
	throw new Error("Device sessions do not belong to the same workspace");
}
if (comparableWorkspace(first.workspace) !== comparableWorkspace(second.workspace)) {
	throw new Error("Authenticated device snapshots do not converge");
}

const [firstChanges, secondChanges, history] = await Promise.all([
	readChanges(devices[0]),
	readChanges(devices[1]),
	readHistory(devices[0]),
]);

console.log(
	JSON.stringify(
		{
			baseUrl,
			workspaceId: first.session.workspaceId,
			devicesEqual: true,
			counts: {
				beans: first.workspace.beans.length,
				machines: first.workspace.machines.length,
				brews: first.workspace.brews.length,
			},
			changes: { deviceA: firstChanges, deviceB: secondChanges },
			history,
		},
		 null,
		 2,
	),
);
