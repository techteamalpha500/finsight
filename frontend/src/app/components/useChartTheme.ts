"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function useChartThemeColors() {
	const { resolvedTheme } = useTheme();
	const [isDark, setIsDark] = useState(false);
	useEffect(() => {
		setIsDark(resolvedTheme === "dark");
	}, [resolvedTheme]);
	return {
		text: isDark ? "#e2e8f0" : "#0f172a",
		grid: isDark ? "rgba(226,232,240,0.15)" : "rgba(15,23,42,0.08)",
		bg: isDark ? "#0b1220" : "#ffffff",
	};
}