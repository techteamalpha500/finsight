import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import './globals.css';
import Navbar from "./components/Navbar";
import ThemeProvider from "./providers/ThemeProvider";
import MobileGlobalNav from "./components/MobileGlobalNav";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Finsight",
	description: "Personal finance & allocation planner",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	// Global nav (max 6)
	const navItems = [
		{ name: "Dashboard", href: "/PortfolioManagement/Dashboard" },
		{ name: "Plan", href: "/PortfolioManagement/Plan" },
		{ name: "Portfolio", href: "/PortfolioManagement/Portfolio/Holdings" },
		{ name: "Expenses", href: "/ExpenseTracker" },
		{ name: "Reports", href: "/PortfolioManagement/Insights" },
		{ name: "Settings", href: "/PortfolioManagement/Settings" },
	];
	return (
		<html lang="en" suppressHydrationWarning>
			<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
				<ThemeProvider>
					{/* Desktop top nav */}
					<div className="hidden md:block">
						<Navbar items={navItems} helpHref="/help" userInitials="FS" />
					</div>
					<MobileGlobalNav />

					<div className="min-h-screen pb-14 md:pb-0 bg-[radial-gradient(40%_60%_at_10%_10%,rgba(99,102,241,0.08),transparent),radial-gradient(30%_40%_at_90%_20%,rgba(16,185,129,0.08),transparent)] dark:bg-[radial-gradient(40%_60%_at_10%_10%,rgba(99,102,241,0.12),transparent),radial-gradient(30%_40%_at_90%_20%,rgba(16,185,129,0.12),transparent)]">
						<main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
					</div>
				</ThemeProvider>
			</body>
		</html>
	);
}