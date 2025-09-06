import type { AllocationPlan, AssetClass } from "./allocationEngine";
import type { Holding } from "../../store";

export interface RebalanceItem {
	class: AssetClass;
	targetPct: number;
	actualPct: number;
	driftPct: number; // actual - target
	action: "Increase" | "Reduce";
	amount: number; // absolute currency amount to move
}

function valueOfHolding(h: Holding): number {
	if (typeof h.currentValue === "number") return h.currentValue;
	if (typeof h.units === "number" && typeof h.price === "number") return h.units * h.price;
	if (typeof h.investedAmount === "number") return h.investedAmount;
	return 0;
}

export function computeRebalance(holdings: Holding[], plan: AllocationPlan, driftTolerancePct: number): { items: RebalanceItem[]; totalCurrentValue: number } {
	const totalCurrentValue = holdings.reduce((sum, h) => sum + valueOfHolding(h), 0);
	const classToValue = new Map<AssetClass, number>();
	for (const h of holdings) {
		const v = valueOfHolding(h);
		const key = h.instrumentClass;
		classToValue.set(key, (classToValue.get(key) || 0) + v);
	}
	const classes = new Set<AssetClass>([
		...plan.buckets.map(b => b.class),
		...Array.from(classToValue.keys()),
	]);
	const items: RebalanceItem[] = [];
	for (const cls of classes) {
		const target = plan.buckets.find(b => b.class === cls)?.pct ?? 0;
		const actualPct = totalCurrentValue > 0 ? ((classToValue.get(cls) || 0) / totalCurrentValue) * 100 : 0;
		const drift = +(actualPct - target).toFixed(2);
		if (Math.abs(drift) < driftTolerancePct) continue;
		const deltaPct = target - actualPct;
		const amount = +(totalCurrentValue * (Math.abs(deltaPct) / 100)).toFixed(2);
		items.push({
			class: cls,
			targetPct: +((Number(target)||0).toFixed(2)),
			actualPct: +(actualPct.toFixed(2)),
			driftPct: drift,
			action: deltaPct > 0 ? "Increase" : "Reduce",
			amount,
		});
	}
	items.sort((a, b) => b.amount - a.amount);
	return { items, totalCurrentValue };
}