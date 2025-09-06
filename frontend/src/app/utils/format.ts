export function formatCurrency(value: number, currency: string = "INR"): string {
	if (Number.isNaN(value)) return "—";
	try {
		return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
	} catch {
		return `${currency} ${value.toFixed(2)}`;
	}
}

export function formatNumber(value: number, fractionDigits: number = 2): string {
	if (Number.isNaN(value)) return "—";
	return value.toLocaleString(undefined, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits });
}