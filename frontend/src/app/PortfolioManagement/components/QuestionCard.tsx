import React from "react";
import { Card, CardContent } from "../../components/Card";
import { Info, Check } from "lucide-react";

interface QuestionCardProps {
	questionText: string;
	options?: string[];
	selected: string | string[] | number;
	onChange: (value: string | string[] | number) => void;
	multiSelect?: boolean;
	helperText?: string;
	maxSelect?: number;
	compact?: boolean;
	type?: "text" | "number";
}

export default function QuestionCard({ 
	questionText, 
	options = [], 
	selected, 
	onChange, 
	multiSelect, 
	helperText, 
	maxSelect, 
	compact,
	type = "text"
}: QuestionCardProps) {
	const isSelected = (option: string) => {
		if (multiSelect && Array.isArray(selected)) return selected.includes(option);
		return selected === option;
	};

	const handleClick = (option: string) => {
		if (multiSelect && Array.isArray(selected)) {
			if (selected.includes(option)) onChange(selected.filter((o: string) => o !== option));
			else {
				if (maxSelect && selected.length >= maxSelect) return;
				onChange([...selected, option]);
			}
		} else {
			onChange(option);
		}
	};

	const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		onChange(value === "" ? 0 : Number(value));
	};

	if (type === "number") {
		return (
			<Card className="w-full">
				<CardContent>
					<div className={`${compact ? "mb-1 text-base" : "mb-2 text-lg"} font-semibold`}>{questionText}</div>
					{helperText && (
						<div className={`inline-flex items-center gap-1 ${compact ? "mb-2 text-[11px]" : "mb-4 text-xs"} text-muted-foreground`}>
							<Info className="h-3.5 w-3.5"/>{helperText}
						</div>
					)}
					<div className="mt-4">
						<input
							type="number"
							value={selected || ""}
							onChange={handleNumberChange}
							placeholder="Enter amount"
							className="w-full px-4 py-3 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-all duration-200"
						/>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="w-full">
			<CardContent>
				<div className={`${compact ? "mb-1 text-base" : "mb-2 text-lg"} font-semibold`}>{questionText}</div>
				{helperText && (
					<div className={`inline-flex items-center gap-1 ${compact ? "mb-2 text-[11px]" : "mb-4 text-xs"} text-muted-foreground`}><Info className="h-3.5 w-3.5"/>{helperText}</div>
				)}
				<div className={`grid grid-cols-1 sm:grid-cols-2 ${compact ? "gap-2" : "gap-3"}`}>
					{options.map(option => {
						const active = isSelected(option);
						return (
							<button
								key={option}
								onClick={() => handleClick(option)}
								className={`group rounded-xl ${compact ? "p-3 text-sm" : "p-4"} border font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)] transition-all duration-200 ${active ? "border-[var(--color-ring)] bg-muted text-foreground" : "border-border bg-card text-foreground hover:bg-muted"}`}
							>
								<span className="inline-flex items-center gap-2">
									{active ? <Check className="h-4 w-4" /> : null}
									{option}
								</span>
							</button>
						);
					})}
				</div>
			</CardContent>
		</Card>
	);
}