import React from "react";
import { Progress } from "../../components/Progress";

interface ProgressBarProps {
	current: number;
	total: number;
}

export default function ProgressBar({ current, total }: ProgressBarProps) {
	const percent = Math.round((current / total) * 100);
	return (
		<div className="w-full mb-6">
			                  <Progress value={percent} className="transition-colors" />
		</div>
	);
}
