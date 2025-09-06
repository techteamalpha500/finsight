export type Asset = "Stocks" | "Equity MF" | "Gold" | "Real Estate" | "Debt" | "Liquid";

export type Bucket = { class: Asset; pct: number; range?: [number, number] };

function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

function sumRecord(values: Record<Asset, number>): number {
	return (Object.keys(values) as Asset[]).reduce((s, k) => s + (values[k] || 0), 0);
}

function largestRemainderRoundWithLocks(values: Record<Asset, number>, locked: Asset[]): Record<Asset, number> {
	const order: Asset[] = ["Stocks","Equity MF","Gold","Real Estate","Debt","Liquid"];
	const floors: Record<Asset, number> = { Stocks: 0, "Equity MF": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
	const remainders: Array<{ k: Asset; r: number }> = [];
	let total = 0;
	for (const k of order) {
		const v = Math.max(0, Math.min(100, values[k] || 0));
		// Keep locked closer to their chosen values by rounding to nearest
		if (locked.includes(k)) {
			const n = Math.round(v);
			floors[k] = n;
			total += n;
			// mark as fixed by giving negative remainder
			remainders.push({ k, r: -1 });
			continue;
		}
		const f = Math.floor(v);
		floors[k] = f;
		remainders.push({ k, r: v - f });
		total += f;
	}
	let leftover = 100 - total;
	remainders.sort((a,b)=> (b.r - a.r) || (order.indexOf(a.k) - order.indexOf(b.k)));
	for (let i=0; i<remainders.length && leftover>0; i++) {
		if (remainders[i].r < 0) continue; // skip locked
		floors[remainders[i].k] += 1;
		leftover--;
	}
	return floors;
}

export function advisorTune(baseline: { buckets: Bucket[] }, current: { buckets: Bucket[] }, changedClass: Asset, newPct: number, locked: Asset[] = []): { buckets: Bucket[]; clamped: boolean } {
	const baseMap: Record<Asset, { pct: number; min: number; max: number }> = { Stocks: { pct:0,min:0,max:100 }, "Equity MF": { pct:0,min:0,max:100 }, Gold: { pct:0,min:0,max:100 }, "Real Estate": { pct:0,min:0,max:100 }, Debt: { pct:0,min:0,max:100 }, Liquid: { pct:0,min:0,max:100 } } as any;
	for (const b of baseline.buckets) {
		const [min, max] = b.range || [0, 100];
		baseMap[b.class as Asset] = { pct: b.pct, min, max } as any;
	}
	const curMap: Record<Asset, number> = { Stocks: 0, "Equity MF": 0, Gold: 0, "Real Estate": 0, Debt: 0, Liquid: 0 } as any;
	for (const b of (current.buckets||[])) curMap[b.class as Asset] = b.pct;

	let clamped = false;
	const tuned: Record<Asset, number> = { ...curMap };
	// 1) Apply changed value exactly (clamped to its comfort band)
	const band = baseMap[changedClass];
	const clampedNew = clamp(newPct, band.min, band.max);
	if (Math.abs(clampedNew - newPct) > 1e-9) clamped = true;
	tuned[changedClass] = clampedNew;

	// 2) Keep locked assets fixed at their current values
	const lockedSet = new Set<Asset>(locked);
	for (const k of lockedSet) tuned[k] = curMap[k];

	// 3) Distribute delta across non-locked, non-changed assets using available band capacity
	function distributeDelta(delta: number) {
		const pool = (Object.keys(tuned) as Asset[]).filter(k => k !== changedClass && !lockedSet.has(k));
		if (delta === 0 || pool.length === 0) return 0;
		if (delta > 0) {
			// Need to add delta to others: use (max - current) capacity
			const caps = pool.map(k => ({ k, cap: Math.max(0, (baseMap[k]?.max ?? 100) - (tuned[k] || 0)) }));
			let totalCap = caps.reduce((s,c)=> s + c.cap, 0);
			let remaining = delta;
			if (totalCap <= 0) return remaining;
			for (const c of caps) {
				if (remaining <= 0) break;
				const take = Math.min(c.cap, (remaining * (c.cap / totalCap)) || 0);
				tuned[c.k] = (tuned[c.k] || 0) + take;
				remaining -= take;
			}
			return remaining;
		} else {
			// Need to cut -delta from others: use (current - min) capacity
			const need = -delta;
			const caps = pool.map(k => ({ k, cap: Math.max(0, (tuned[k] || 0) - (baseMap[k]?.min ?? 0)) }));
			let totalCap = caps.reduce((s,c)=> s + c.cap, 0);
			let remaining = need;
			if (totalCap <= 0) return -remaining; // negative means we still need to cut
			for (const c of caps) {
				if (remaining <= 0) break;
				const take = Math.min(c.cap, (remaining * (c.cap / totalCap)) || 0);
				tuned[c.k] = (tuned[c.k] || 0) - take;
				remaining -= take;
			}
			return -remaining; // negative leftover still to cut
		}
	}

	let delta = 100 - sumRecord(tuned);
	let leftover = distributeDelta(delta);
	if (leftover !== 0) {
		// Try to adjust changedClass within its own band as a fallback
		if (leftover > 0) {
			// need to add; increase changed if room
			const room = (baseMap[changedClass].max - tuned[changedClass]);
			const add = Math.min(room, leftover);
			tuned[changedClass] += add;
			leftover -= add;
		} else if (leftover < 0) {
			// need to cut; decrease changed if room
			const room = (tuned[changedClass] - baseMap[changedClass].min);
			const cut = Math.min(room, -leftover);
			tuned[changedClass] -= cut;
			leftover += cut;
		}
	}
	// If still leftover due to impossible distribution, just renormalize non-locked proportionally within bands without violating locked
	if (Math.abs(leftover) > 1e-6) {
		const pool = (Object.keys(tuned) as Asset[]).filter(k => !lockedSet.has(k));
		const poolSum = pool.reduce((s,k)=> s + (tuned[k] || 0), 0) || 1;
		for (const k of pool) tuned[k] = (tuned[k] || 0) * (100 / poolSum);
		// clamp everyone to bands after renorm
		for (const k of pool) tuned[k] = clamp(tuned[k], baseMap[k]?.min ?? 0, baseMap[k]?.max ?? 100);
		// final tiny renorm
		const s = sumRecord(tuned);
		if (s !== 100) {
			const scale = 100 / (s || 1);
			for (const k of pool) tuned[k] = (tuned[k] || 0) * scale;
		}
	}

	// 4) Integerize while preserving locked exactness as much as possible
	const rounded = largestRemainderRoundWithLocks(tuned, Array.from(lockedSet));
	const outBuckets: Bucket[] = (Object.keys(rounded) as Asset[]).map(cls => ({ class: cls, pct: rounded[cls] }));
	const rangeMap: Record<Asset, [number, number]> = { Stocks:[0,100], "Equity MF":[0,100], Gold:[0,100], "Real Estate":[0,100], Debt:[0,100], Liquid:[0,100] } as any;
	for (const b of baseline.buckets) if (b.range) rangeMap[b.class as Asset] = b.range;
	for (const b of outBuckets) (b as any).range = rangeMap[b.class];
	return { buckets: outBuckets, clamped };
}