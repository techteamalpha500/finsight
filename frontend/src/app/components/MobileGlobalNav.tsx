"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function MobileGlobalNav() {
	const pathname = usePathname();
	const [open, setOpen] = useState(false);
	function isActive(href: string) {
		if (!pathname) return false;
		return pathname === href || pathname.startsWith(href);
	}
	return (
		<>
			<div className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background">
				<div className="grid grid-cols-4 text-xs">
					<Link href="/PortfolioManagement/Dashboard" className={`flex flex-col items-center justify-center py-2 ${isActive('/PortfolioManagement/Dashboard')? 'text-indigo-600 dark:text-indigo-300' : ''}`}>🏠<span>Dashboard</span></Link>
					<Link href="/PortfolioManagement/Portfolio/Overview" className={`flex flex-col items-center justify-center py-2 ${isActive('/PortfolioManagement/Portfolio')? 'text-indigo-600 dark:text-indigo-300' : ''}`}>📊<span>Portfolio</span></Link>
					<Link href="/ExpenseTracker" className={`flex flex-col items-center justify-center py-2 ${isActive('/ExpenseTracker')? 'text-indigo-600 dark:text-indigo-300' : ''}`}>💰<span>Expenses</span></Link>
					<button className="flex flex-col items-center justify-center py-2" onClick={() => setOpen(true)}>☰<span>More</span></button>
				</div>
			</div>
			{open && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
					<div className="absolute bottom-0 inset-x-0 rounded-t-xl border border-border bg-card p-4 space-y-2">
						<Link className="block py-2" href="/PortfolioManagement/Insights" onClick={() => setOpen(false)}>Reports & Insights</Link>
						<Link className="block py-2" href="/PortfolioManagement/Settings" onClick={() => setOpen(false)}>Settings / Profile</Link>
						<button className="mt-2 w-full border border-border rounded-md py-2" onClick={() => setOpen(false)}>Close</button>
					</div>
				</div>
			)}
		</>
	);
}

