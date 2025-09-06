"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PortfolioModuleLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname();
	const router = useRouter();
	const tabs = [
		{ name: "Holdings", href: "/PortfolioManagement/Portfolio/Holdings" },
		{ name: "Repayments", href: "/PortfolioManagement/Portfolio/Repayments" },
		{ name: "Insights", href: "/PortfolioManagement/Portfolio/Insights" },
	];

	useEffect(() => {
		if (pathname === "/PortfolioManagement/Portfolio" || pathname === "/PortfolioManagement/Portfolio/") {
			router.replace("/PortfolioManagement/Portfolio/Holdings");
		}
	}, [pathname, router]);

	return (
		<div className="space-y-4">
			{/* Module subnav */}
			<div className="border-b border-border">
				<div className="flex gap-2 overflow-x-auto">
					{tabs.map(t => (
						<Link key={t.href} href={t.href} className={`px-3 py-2 text-sm rounded-t-md ${pathname?.startsWith(t.href)?'bg-muted font-medium':'text-foreground hover:bg-muted'}`}>{t.name}</Link>
					))}
				</div>
			</div>
			{children}
		</div>
	);
}