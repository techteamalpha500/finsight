"use client";
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { Menu, X, Sun, Moon, HelpCircle } from "lucide-react";
import { cn } from "./utils";

export interface NavItem { name: string; href: string }

interface NavbarProps {
	items: NavItem[];
	logoSrc?: string;
	appName?: string;
	helpHref?: string;
	avatarSrc?: string;
	userInitials?: string;
}

export default function Navbar({ items, logoSrc = "/finsight-logo.png", appName = "Finsight", helpHref = "#", avatarSrc, userInitials = "FS" }: NavbarProps) {
	const pathname = usePathname();
	const { theme, resolvedTheme, setTheme } = useTheme();
	const [mounted, setMounted] = useState(false);
	const [open, setOpen] = useState(false);
	useEffect(() => setMounted(true), []);

	const isDark = (resolvedTheme || theme) === "dark";
	function toggleTheme() { if (mounted) setTheme(isDark ? "light" : "dark"); }

	function isActive(href: string) {
		if (!pathname) return false;
		// exact match or section prefix
		return pathname === href || (href !== "/" && pathname.startsWith(href));
	}

	const navItems = useMemo(() => items ?? [], [items]);

	return (
		<nav className="sticky top-0 z-40 w-full border-b border-border bg-background text-foreground">
			<div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
				{/* Left: Logo + Name */}
				<div className="flex items-center gap-3">
					<Link href="/" className="flex items-center gap-2">
						{logoSrc ? (
							<img src={logoSrc} alt="logo" className="h-7 w-7 rounded-sm" />
						) : (
							<div className="h-7 w-7 rounded-sm bg-muted" />
						)}
						<span className="font-bold tracking-tight">{appName}</span>
					</Link>
				</div>

				{/* Center: Desktop menu */}
				<div className="hidden md:flex items-center gap-1">
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								"px-3 py-2 text-sm rounded-md transition-colors",
								"hover:bg-muted",
								isActive(item.href) ? "text-indigo-600 dark:text-indigo-300 underline underline-offset-4" : "text-foreground"
							)}
						>
							{item.name}
						</Link>
					))}
				</div>

				{/* Right: Help, Theme, Avatar */}
				<div className="hidden md:flex items-center gap-2">
					<Link href={helpHref} className="h-9 px-3 inline-flex items-center rounded-md text-sm text-foreground hover:bg-muted transition-colors">
						<HelpCircle className="h-4 w-4 mr-2" /> Help
					</Link>
					<button aria-label="Toggle theme" onClick={toggleTheme} className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors">
						{mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</button>
					{avatarSrc ? (
						<img src={avatarSrc} alt="avatar" className="h-9 w-9 rounded-full object-cover border border-border" />
					) : (
						<div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-xs font-semibold border border-border">
							{userInitials}
						</div>
					)}
				</div>

				{/* Mobile: Hamburger */}
				<div className="md:hidden flex items-center gap-2">
					<button aria-label="Help" className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors" onClick={() => (window.location.href = helpHref)}>
						<HelpCircle className="h-4 w-4" />
					</button>
					<button aria-label="Toggle theme" onClick={toggleTheme} className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors">
						{mounted && isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
					</button>
					<button aria-label="Menu" onClick={() => setOpen(o => !o)} className="h-9 w-9 inline-flex items-center justify-center rounded-md hover:bg-muted transition-colors">
						{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
					</button>
				</div>
			</div>

			{/* Mobile dropdown */}
			<div className={cn(
				"md:hidden border-b border-border bg-background",
				open ? "block" : "hidden"
			)}>
				<div className="mx-auto max-w-6xl px-4 py-2 space-y-1">
					{navItems.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							onClick={() => setOpen(false)}
							className={cn(
								"block px-3 py-2 rounded-md text-sm transition-colors",
								"hover:bg-muted",
								isActive(item.href) ? "text-indigo-600 dark:text-indigo-300 underline underline-offset-4" : "text-foreground"
							)}
						>
							{item.name}
						</Link>
					))}
				</div>
			</div>
		</nav>
	);
}