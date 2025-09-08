"use client";
import React, { useMemo, useState, useRef } from "react";

import type { AssetClass } from "../../domain/allocationEngine";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Plus, Edit2, Trash2, X, Search, TrendingUp, BarChart3, PieChart as PieChartIcon, Upload, Lock, ExternalLink, AlertCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { Card as PlanCard, CardContent as PlanCardContent, CardHeader as PlanCardHeader, CardTitle as PlanCardTitle } from "../../../components/Card";
import { Button } from "../../../components/Button";
import { fetchMutualFundSchemes, searchFundsByName, TransformedFund, saveHolding, fetchUserHoldings, HoldingData, preloadMutualFundData, clearMFCache, deleteHolding, fetchStockCompanies, searchStockCompanies, StockCompany, preloadStockData, parseCASFile, importCASData } from "../../../../lib/dynamodb";
import { validateCASFile, extractBrokerFromFilename, formatCASDataForDisplay, type CASData } from "./casParser";

// Asset class colors for charts
const CLASS_COLORS = {
	"Stocks": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", chart: "#3B82F6" },
	"Equity MF": { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300", chart: "#10B981" },
	"ETF": { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-300", chart: "#8B5CF6" },
	"Debt": { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", chart: "#8B5CF6" },
	"Liquid": { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", chart: "#F59E0B" },
	"Gold": { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", chart: "#EAB308" },
	"Real Estate": { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-700 dark:text-rose-300", chart: "#F43F5E" },
};

// Portfolio role colors for charts
const ROLE_COLORS = {
	"Equity": "#3B82F6",      // Blue
	"Defensive": "#10B981",   // Emerald
	"Satellite": "#8B5CF6",   // Purple
	"Core": "#F59E0B",        // Orange
	"Growth": "#06B6D4",      // Cyan
	"Value": "#EAB308",       // Yellow
	"Balanced": "#F43F5E",    // Rose
	"Conservative": "#6366F1", // Indigo
};

// Role-based instrument type mapping
const ROLE_INSTRUMENT_TYPES = {
	Equity: [
		{ label: "Stocks", value: "Stocks", category: "Stocks" },
		{ label: "Mutual Funds", value: "Mutual Funds", category: "Mutual Funds" },
		{ label: "Equity ETF", value: "Equity ETF", category: "Stocks" }
	],
	Defensive: [
		{ label: "Bonds", value: "Bonds", category: "Debt" },
		{ label: "Debt MF", value: "Debt MF", category: "Mutual Funds" },
		{ label: "Liquid MF", value: "Liquid MF", category: "Mutual Funds" },
		{ label: "Cash", value: "Cash", category: "Liquid" }
	],
	Satellite: [
		{ label: "Gold ETF", value: "Gold ETF", category: "Gold" },
		{ label: "Gold MF", value: "Gold MF", category: "Mutual Funds" },
		{ label: "Physical Gold", value: "Physical Gold", category: "Gold" },
		{ label: "REITs", value: "REITs", category: "Real Estate" },
		{ label: "Properties", value: "Properties", category: "Real Estate" }
	]
};

// Auto-map instrument type to AssetClass
function mapInstrumentTypeToAssetClass(instrumentType: string): AssetClass {
	if (instrumentType.includes("MF")) return "Equity MF";
	if (instrumentType.includes("Gold")) return "Gold";
	if (instrumentType.includes("Real Estate") || instrumentType.includes("REIT") || instrumentType.includes("Property")) return "Real Estate";
	if (instrumentType.includes("Bond") || instrumentType.includes("Debt")) return "Debt";
	if (instrumentType.includes("Liquid") || instrumentType.includes("Cash")) return "Liquid";
	if (instrumentType.includes("Stock") || instrumentType.includes("ETF")) return "Stocks";
	return "Stocks"; // Default fallback
}

// Utility functions
function computeHoldingValue(holding: HoldingData): number {
	if (holding.currentValue !== undefined) return holding.currentValue;
	if (holding.units && holding.price) return holding.units * holding.price;
	if (holding.investedAmount) return holding.investedAmount;
	return 0;
}

function computeInvestedAmount(holding: HoldingData): number {
	if (holding.investedAmount !== undefined) return holding.investedAmount;
	if (holding.units && holding.price) return holding.units * holding.price;
	return 0;
}

function getRoleForAssetClass(assetClass: AssetClass): 'Equity' | 'Defensive' | 'Satellite' {
	switch (assetClass) {
		case 'Stocks':
		case 'Equity MF':
		case 'ETF':
			return 'Equity';
		case 'Debt':
		case 'Liquid':
			return 'Defensive';
		case 'Gold':
		case 'Real Estate':
			return 'Satellite';
		default:
			return 'Equity';
	}
}

export default function HoldingsPage() {
	const [holdings, setHoldings] = useState<HoldingData[]>([]);
	
	// Modal state
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [editingId, setEditingId] = useState<string | null>(null);
	
	// Entry mode: 'manual' or 'import'
	const [entryMode, setEntryMode] = useState<'manual' | 'import'>('manual');
	
	// Import-related state
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [password, setPassword] = useState("");
	const [isDragOver, setIsDragOver] = useState(false);
	const [isProcessing, setIsProcessing] = useState(false);
	const [importError, setImportError] = useState("");
	const fileInputRef = useRef<HTMLInputElement>(null);
	
	// Pagination state
	const [currentPage, setCurrentPage] = useState(1);
	const itemsPerPage = 10;
	
	// Filter state
	const [filterAssetClass, setFilterAssetClass] = useState<string | null>(null);
	const [filterAssetRole, setFilterAssetRole] = useState<string | null>(null);
	
	// New state for asset class-based flow
	const [selectedRole, setSelectedRole] = useState<'Stocks' | 'Mutual Funds' | 'ETF' | 'Gold' | 'Real Estate' | null>(null);
	const [selectedInstrumentType, setSelectedInstrumentType] = useState<string | null>(null);
	const [inputMode, setInputMode] = useState<'units' | 'amount'>('units');
	
	// Store original values for edit mode reset
	const [originalForm, setOriginalForm] = useState<HoldingData | null>(null);
	
	// Loading state for data refresh
	const [isRefreshing, setIsRefreshing] = useState(false);
	
	// Enhanced stock functionality
	const [stockSearchTerm, setStockSearchTerm] = useState("");
	const [selectedStock, setSelectedStock] = useState<StockCompany | null>(null);
	const [filteredStockOptions, setFilteredStockOptions] = useState<StockCompany[]>([]);
	const [showStockDropdown, setShowStockDropdown] = useState(false);
	const [stockEntryMode, setStockEntryMode] = useState<'units' | 'amount'>('units');
	
	// Stock data state
	const [stockOptions, setStockOptions] = useState<StockCompany[]>([]);
	const [isLoadingStocks, setIsLoadingStocks] = useState(false);
	
	// Form state
	const [form, setForm] = useState({
		instrumentClass: "Stocks" as AssetClass,
		name: "",
		symbol: "",
		units: "",
		price: "",
		investedAmount: "",
		currentValue: "",
		propertyType: "",
		broker: "manual" // Default to manual entry
	});
	


	// Mutual Fund functionality
	const [mfSearchTerm, setMfSearchTerm] = useState("");
	const [selectedMF, setSelectedMF] = useState<TransformedFund | null>(null);
	const [mfOptions, setMfOptions] = useState<TransformedFund[]>([]);
	const [filteredMFOptions, setFilteredMFOptions] = useState<TransformedFund[]>([]);
	const [showMFDropdown, setShowMFDropdown] = useState(false);
	const [mfCalculatedUnits, setMfCalculatedUnits] = useState<number | null>(null);
	const [mfCurrentValue, setMfCurrentValue] = useState<number | null>(null);
	const [mfGainLoss, setMfGainLoss] = useState<number | null>(null);
	const [mfGainLossPercent, setMfGainLossPercent] = useState<number | null>(null);

	// ETF functionality
	const [etfSearchTerm, setEtfSearchTerm] = useState("");
	const [selectedETF, setSelectedETF] = useState<TransformedFund | null>(null);
	const [etfOptions, setEtfOptions] = useState<TransformedFund[]>([]);
	const [filteredETFOptions, setFilteredETFOptions] = useState<TransformedFund[]>([]);
	const [showETFDropdown, setShowETFDropdown] = useState(false);
	const [etfCalculatedUnits, setEtfCalculatedUnits] = useState<number | null>(null);
	const [etfCurrentValue, setEtfCurrentValue] = useState<number | null>(null);
	const [etfGainLoss, setEtfGainLoss] = useState<number | null>(null);
	const [etfGainLossPercent, setEtfGainLossPercent] = useState<number | null>(null);

	// Load mutual fund and ETF data directly from DynamoDB
	React.useEffect(() => {
		async function loadMFData() {
			try {
				// Preload data on component mount
				await preloadMutualFundData();
				const funds = await fetchMutualFundSchemes();
				// Filter for mutual funds (is_etf = false)
				const mfData = funds.filter(fund => !fund.isETF);
				setMfOptions(mfData);
			} catch (error) {
				// Silent fail - user will see empty results
			}
		}
		
		async function loadETFData() {
			try {
				const funds = await fetchMutualFundSchemes();
				// Filter for ETFs (is_etf = true)
				const etfData = funds.filter(fund => fund.isETF);
				setEtfOptions(etfData);
			} catch (error) {
				// Silent fail - user will see empty results
			}
		}
		
		loadMFData();
		loadETFData();
	}, []);

	// Load stock data with preloading
	React.useEffect(() => {
		async function loadStockDataWithPreload() {
			try {
				// Preload stock data on component mount
				await preloadStockData();
				const stocks = await fetchStockCompanies();
				setStockOptions(stocks);
			} catch (error) {
				console.error('Error loading stock data:', error);
				// Silent fail - set empty array
				setStockOptions([]);
			}
		}
		loadStockDataWithPreload();
	}, []);

	// Load holdings from DynamoDB
	async function loadHoldingsData() {
		try {
			// For now, using a mock user ID. In production, this should come from user authentication
			const mockUserId = 'user-123';
			const dbHoldings = await fetchUserHoldings(mockUserId);
			
			// Transform DynamoDB holdings to local state format
			const transformedHoldings = dbHoldings.map(dbHolding => ({
				id: dbHolding.id,
				user_id: dbHolding.user_id,
				instrumentClass: dbHolding.instrumentClass as AssetClass,
				name: dbHolding.name,
				symbol: dbHolding.symbol,
				units: dbHolding.units,
				price: dbHolding.price,
				investedAmount: dbHolding.investedAmount,
				currentValue: dbHolding.currentValue,
				asset_class: dbHolding.asset_class,
				portfolio_role: dbHolding.portfolio_role,
				created_at: dbHolding.created_at,
				updated_at: dbHolding.updated_at
			}));
			
			// Sort by created_at descending (newest first) and set holdings
			const sortedHoldings = transformedHoldings.sort((a, b) => {
				const dateA = new Date(a.created_at || 0).getTime();
				const dateB = new Date(b.created_at || 0).getTime();
				return dateB - dateA; // Descending order
			});
			
			setHoldings(sortedHoldings);
		} catch (error) {
			// Silent fail - set empty array
			setHoldings([]);
		}
	}


	
	React.useEffect(() => {
		loadHoldingsData();
	}, []);

	// Filter stock options using cached data
	const filterStockOptions = async (term: string): Promise<void> => {
		if (term.trim() === "") {
			setFilteredStockOptions([]);
			setShowStockDropdown(false);
		} else {
			try {
				// searchStockCompanies now uses cached data automatically
				const filtered = await searchStockCompanies(term);
				setFilteredStockOptions(filtered.slice(0, 10));
				setShowStockDropdown(filtered.length > 0);
			} catch (error) {
				console.error('Error searching stocks:', error);
				setFilteredStockOptions([]);
				setShowStockDropdown(false);
			}
		}
	};

	const filterMFOptions = async (term: string): Promise<void> => {
		try {
			// Get all funds and filter by ETF status based on selected role
			const allFunds = await fetchMutualFundSchemes();
			
			// Filter funds based on ETF status only
			let filtered = allFunds.filter(fund => {
				if (selectedRole === 'Mutual Funds') {
					// Show only non-ETF funds (is_etf = false)
					return !fund.isETF;
				} else if (selectedRole === 'ETF') {
					// Show only ETF funds (is_etf = true)
					return fund.isETF;
				}
				return false;
			});
			
			// Then filter by search term if provided
			if (term.trim()) {
				const searchTerm = term.toLowerCase();
				filtered = filtered.filter(fund => 
					fund.name.toLowerCase().includes(searchTerm) || 
					fund.fullName.toLowerCase().includes(searchTerm)
				);
			}
			
			// Limit results and set state
			const limitedResults = filtered.slice(0, 10);
			setFilteredMFOptions(limitedResults);
			// Only show dropdown if there's a search term
			setShowMFDropdown(!!(term.trim() && limitedResults.length > 0));
		} catch (error) {
			// Clear results on error
			setFilteredMFOptions([]);
			setShowMFDropdown(false);
		}
	};

	const filterETFOptions = async (term: string): Promise<void> => {
		try {
			// Filter ETFs only
			let filtered = etfOptions.filter(fund => fund.isETF);
			
			// Then filter by search term if provided
			if (term.trim()) {
				const searchTerm = term.toLowerCase();
				filtered = filtered.filter(fund => 
					fund.name.toLowerCase().includes(searchTerm) || 
					fund.fullName.toLowerCase().includes(searchTerm)
				);
			}
			
			// Limit results and set state
			const limitedResults = filtered.slice(0, 10);
			setFilteredETFOptions(limitedResults);
			// Only show dropdown if there's a search term
			setShowETFDropdown(!!(term.trim() && limitedResults.length > 0));
		} catch (error) {
			// Clear results on error
			setFilteredETFOptions([]);
			setShowETFDropdown(false);
		}
	};

	// Debounce search terms to reduce lag
	const [debouncedMfSearchTerm, setDebouncedMfSearchTerm] = useState(mfSearchTerm);
	const [debouncedStockSearchTerm, setDebouncedStockSearchTerm] = useState(stockSearchTerm);
	
	React.useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedMfSearchTerm(mfSearchTerm);
		}, 300); // 300ms delay
		
		return () => clearTimeout(timer);
	}, [mfSearchTerm]);
	
	React.useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedStockSearchTerm(stockSearchTerm);
		}, 300); // 300ms delay
		
		return () => clearTimeout(timer);
	}, [stockSearchTerm]);
	
	// Use debounced search terms for better performance
	React.useEffect(() => {
		if (debouncedMfSearchTerm.trim()) {
			filterMFOptions(debouncedMfSearchTerm);
		} else {
			// When no search term, clear the dropdown and options
			setFilteredMFOptions([]);
			setShowMFDropdown(false);
		}
	}, [debouncedMfSearchTerm, selectedRole]);


	
	React.useEffect(() => {
		if (debouncedStockSearchTerm.trim()) {
			filterStockOptions(debouncedStockSearchTerm);
		} else {
			setFilteredStockOptions([]);
			setShowStockDropdown(false);
		}
	}, [debouncedStockSearchTerm]);
	
	// Auto-calculate MF values
	React.useEffect(() => {
		if (selectedMF && form.investedAmount && selectedMF.currentNAV) {
			const investedAmount = parseFloat(form.investedAmount);
			if (!isNaN(investedAmount) && investedAmount > 0) {
				// For simplicity, using current NAV as purchase NAV (in real app, fetch historical NAV)
				const purchaseNAV = selectedMF.currentNAV; // TODO: Fetch historical NAV based on date
				const units = investedAmount / purchaseNAV;
				const currentValue = units * selectedMF.currentNAV;
				const gainLoss = currentValue - investedAmount;
				const gainLossPercent = (gainLoss / investedAmount) * 100;
				
				setMfCalculatedUnits(units);
				setMfCurrentValue(currentValue);
				setMfGainLoss(gainLoss);
				setMfGainLossPercent(gainLossPercent);
				
				// Auto-set calculated current value in form
				setForm({ ...form, currentValue: currentValue.toFixed(2) });
			}
		}
	}, [selectedMF, form.investedAmount]);



	// Filter holdings based on selected filters
	const filteredHoldings = useMemo(() => {
		if (!holdings) return [];
		
		return holdings.filter(holding => {
			// Use asset_class from holdings table if available, fallback to instrumentClass
			const assetClass = holding.asset_class || holding.instrumentClass;
			// Use portfolio_role from holdings table if available, fallback to calculated role
			const portfolioRole = holding.portfolio_role || getRoleForAssetClass(holding.instrumentClass as AssetClass);
			
			// Enhanced asset class filtering to handle broader categories
			let matchesAssetClass = true;
			if (filterAssetClass) {
				if (filterAssetClass === 'Equity') {
					matchesAssetClass = assetClass === 'Equity MF' || assetClass === 'Stocks';
				} else if (filterAssetClass === 'Debt') {
					matchesAssetClass = assetClass === 'Debt MF' || assetClass === 'Debt ETF';
				} else if (filterAssetClass === 'Liquid') {
					matchesAssetClass = assetClass === 'Liquid MF' || assetClass === 'Liquid ETF';
				} else {
					matchesAssetClass = assetClass === filterAssetClass;
				}
			}
			const matchesAssetRole = !filterAssetRole || portfolioRole === filterAssetRole;
			return matchesAssetClass && matchesAssetRole;
		});
	}, [holdings, filterAssetClass, filterAssetRole]);

	// Sorting state
	const [sortKey, setSortKey] = useState<'instrument' | 'class' | 'current' | 'invested' | 'pl' | 'created_at'>('created_at');
	const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

	function toggleSort(key: typeof sortKey) {
		setSortKey(prev => {
			if (prev === key) {
				setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
				return prev;
			}
			setSortDir('asc');
			return key;
		});
	}

	const sortedHoldings = useMemo(() => {
		const list = [...filteredHoldings];
		list.sort((a, b) => {
			let av = 0 as any, bv = 0 as any;
			switch (sortKey) {
				case 'instrument':
					av = a.name || '';
					bv = b.name || '';
					return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
				case 'class':
					// Use asset_class from holdings table if available, fallback to instrumentClass
					av = a.asset_class || a.instrumentClass || '';
					bv = b.asset_class || b.instrumentClass || '';
					return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
				case 'current':
					av = computeHoldingValue(a);
					bv = computeHoldingValue(b);
					return sortDir === 'asc' ? av - bv : bv - av;
				case 'invested':
					av = computeInvestedAmount(a);
					bv = computeInvestedAmount(b);
					return sortDir === 'asc' ? av - bv : bv - av;
				case 'pl':
					av = computeHoldingValue(a) - computeInvestedAmount(a);
					bv = computeHoldingValue(b) - computeInvestedAmount(b);
					return sortDir === 'asc' ? av - bv : bv - av;
				case 'created_at':
				default:
					av = a && (a as any).created_at ? new Date((a as any).created_at).getTime() : 0;
					bv = b && (b as any).created_at ? new Date((b as any).created_at).getTime() : 0;
					return sortDir === 'asc' ? av - bv : bv - av;
			}
		});
		return list;
	}, [filteredHoldings, sortKey, sortDir]);

	// Calculate totals for KPI cards - using filtered data
	const totalValue = useMemo(() => (filteredHoldings || []).reduce((s: number, h: HoldingData) => s + computeHoldingValue(h), 0), [filteredHoldings]);
	const totalInvested = useMemo(() => (filteredHoldings || []).reduce((s: number, h: HoldingData) => s + computeInvestedAmount(h), 0), [filteredHoldings]);
	const totalPL = useMemo(() => totalValue - totalInvested, [totalValue, totalInvested]);
	const totalPLPct = useMemo(() => (totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0), [totalPL, totalInvested]);

	// Portfolio allocation data for pie chart
	const portfolioAllocationData = useMemo(() => {
		if (!filteredHoldings || filteredHoldings.length === 0) return [];
		
		const allocationMap = new Map<string, number>();
		
		filteredHoldings.forEach(holding => {
			// Use asset_class from holdings table if available, fallback to instrumentClass
			const assetClass = holding.asset_class || holding.instrumentClass;
			const currentValue = computeHoldingValue(holding);
			allocationMap.set(assetClass, (allocationMap.get(assetClass) || 0) + currentValue);
		});
		
		// Convert to array and sort by value
		const allocationArray = Array.from(allocationMap.entries()).map(([name, value]) => ({
			name,
			value,
			color: CLASS_COLORS[name as keyof typeof CLASS_COLORS]?.chart || '#8B5CF6'
		})).sort((a, b) => b.value - a.value);
		
		return allocationArray;
	}, [filteredHoldings]);

	// Portfolio role allocation data for pie chart
	const portfolioRoleData = useMemo(() => {
		if (!filteredHoldings || filteredHoldings.length === 0) return [];

		const roleMap = new Map<string, number>();

		filteredHoldings.forEach(holding => {
			// Use portfolio_role from holdings table if available, fallback to calculated role
			const role = holding.portfolio_role || getRoleForAssetClass(holding.instrumentClass as AssetClass);
			const currentValue = computeHoldingValue(holding);
			roleMap.set(role, (roleMap.get(role) || 0) + currentValue);
		});

		const roleArray = Array.from(roleMap.entries()).map(([name, value]) => {
			const color = ROLE_COLORS[name as keyof typeof ROLE_COLORS] || '#8B5CF6';
			return {
				name,
				value,
				color
			};
		}).sort((a, b) => b.value - a.value);
		return roleArray;
	}, [filteredHoldings]);

	// Get unique asset classes from holdings data
	const uniqueAssetClasses = useMemo(() => {
		if (!holdings || holdings.length === 0) return [];
		const assetClasses = new Set<string>();
		holdings.forEach(holding => {
			const assetClass = holding.asset_class || holding.instrumentClass;
			if (assetClass) {
				assetClasses.add(assetClass);
			}
		});
		return Array.from(assetClasses).sort();
	}, [holdings]);

	// Pagination logic
	const totalPages = Math.ceil((sortedHoldings?.length || 0) / itemsPerPage);
	const startIndex = (currentPage - 1) * itemsPerPage;
	const endIndex = startIndex + itemsPerPage;
	const currentHoldings = sortedHoldings?.slice(startIndex, endIndex) || [];

	// Reset to first page when holdings change
	React.useEffect(() => {
		setCurrentPage(1);
	}, [holdings?.length]);

	function resetForm() {
		if (editingId && originalForm) {
			// If editing, restore original values
			const formData = {
				instrumentClass: originalForm.instrumentClass as AssetClass,
				name: originalForm.name,
				symbol: originalForm.symbol || "",
				units: originalForm.units?.toString() || "",
				price: originalForm.price?.toString() || "",
				investedAmount: originalForm.investedAmount?.toString() || "",
				currentValue: originalForm.currentValue?.toString() || "",
				propertyType: (originalForm as any).propertyType || "",
				broker: (originalForm as any).broker || "manual"
			};
			setForm(formData);
			setMfSearchTerm(originalForm.name);
		} else {
			// If adding new, reset to empty form
			setForm({ instrumentClass: "Stocks", name: "", symbol: "", units: "", price: "", investedAmount: "", currentValue: "", propertyType: "", broker: "manual" });
			// Reset stock functionality
			setStockSearchTerm("");
			setSelectedStock(null);
			setFilteredStockOptions([]);
			setShowStockDropdown(false);
			// Reset MF functionality
			setMfSearchTerm("");
			setSelectedMF(null);
			setFilteredMFOptions([]);
			setShowMFDropdown(false);
			setMfCalculatedUnits(null);
			setMfCurrentValue(null);
			setMfGainLoss(null);
			setMfGainLossPercent(null);
			// Reset role-based state
			setSelectedRole(null);
			setSelectedInstrumentType(null);
			setInputMode('units');
			// Reset entry mode and import state
			setEntryMode('manual');
			setSelectedFile(null);
			setPassword("");
			setImportError("");
		}
		}
	
	function clearEditState() {
		setEditingId(null);
		setOriginalForm(null);
		setSelectedRole(null);
		setSelectedInstrumentType(null);
		setSelectedMF(null);
		setSelectedStock(null);
		setEntryMode('manual');
		setSelectedFile(null);
		setPassword("");
		setImportError("");
	}
	
	async function submitForm(e: React.FormEvent) {
		e.preventDefault();
		
		// Handle import mode
		if (entryMode === 'import') {
			if (!selectedFile || (form.broker === 'other' && !password.trim())) return;
			
			setIsProcessing(true);
			setImportError("");

			try {
				// Step 1: Parse the CAS file using the import-stocks lambda
				const casData = await parseCASFile(selectedFile, password, form.broker);
				
				// Step 2: Import the parsed data to holdings using portfolio lambda
				const result = await importCASData(casData);
				
				// Handle the import result
				await handleImportStocks(result);
				
				// Close modal and reset
				setIsModalOpen(false);
				clearEditState();
				resetForm();
			} catch (err) {
				console.error('Import error:', err);
				setImportError(err instanceof Error ? err.message : "Failed to process file. Please check the file and password.");
			} finally {
				setIsProcessing(false);
			}
			return;
		}
		
		// Handle manual mode
		if (!form.name.trim()) return;
		
		// Map selected asset class to instrument class
		let instrumentClass: AssetClass = "Stocks";
		let assetClass: string | undefined;
		let portfolioRole: string | undefined;
		
		// If we're editing, try to preserve the existing asset_class and portfolio_role
		if (editingId && originalForm) {
			// For editing, use the existing values if available
			assetClass = originalForm.asset_class;
			portfolioRole = originalForm.portfolio_role;
		}
		
		// If we don't have asset_class and portfolio_role from editing, calculate them
		if (!assetClass || !portfolioRole) {
			if (selectedRole === 'Stocks') {
				instrumentClass = "Stocks";
				assetClass = "Stocks";
				portfolioRole = "Equity";
			} else if (selectedRole === 'Mutual Funds') {
				instrumentClass = "Equity MF";
				// For Mutual Funds, use the values from the selected fund
				if (selectedMF) {
					assetClass = selectedMF.asset_class || "Equity MF";
					portfolioRole = selectedMF.portfolioRole || "Equity";
				}
			} else if (selectedRole === 'ETF') {
				instrumentClass = "ETF";
				// For ETFs, use the values from the selected fund
				if (selectedETF) {
					assetClass = selectedETF.asset_class || "ETF";
					portfolioRole = selectedETF.portfolioRole || "Equity";
				}
			} else if (selectedRole === 'Gold') {
				instrumentClass = "Gold";
				assetClass = "Gold";
				portfolioRole = "Satellite";
			} else if (selectedRole === 'Real Estate') {
				instrumentClass = "Real Estate";
				assetClass = "Real Estate";
				portfolioRole = "Satellite";
			}
		}
		
		// Calculate units for Mutual Funds and ETFs based on investment amount and NAV
		let calculatedUnits: number | undefined;
		if ((selectedRole === 'Mutual Funds' || selectedRole === 'ETF') && form.investedAmount && form.price) {
			calculatedUnits = parseFloat(form.investedAmount) / parseFloat(form.price);
		}

		const holding: HoldingData = {
			id: editingId || uuidv4(),
			user_id: 'user-123', // Mock user ID
			instrumentClass: instrumentClass,
			name: form.name.trim(),
			symbol: form.symbol.trim() || undefined,
			units: calculatedUnits || (form.units ? parseFloat(form.units) : undefined),
			price: form.price ? parseFloat(form.price) : undefined,
			investedAmount: form.investedAmount ? parseFloat(form.investedAmount) : undefined,
			currentValue: form.currentValue ? parseFloat(form.currentValue) : undefined,
			asset_class: assetClass,
			portfolio_role: portfolioRole,
			broker: form.broker,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString()
		};
		
		try {
			// Save to DynamoDB
			await saveHolding(holding);
			
			// Show loading state and refresh holdings from DynamoDB
			setIsRefreshing(true);
			await loadHoldingsData();
			setIsRefreshing(false);
			
			setIsModalOpen(false);
			clearEditState();
			resetForm();
		} catch (error) {
			alert('Failed to save holding. Please try again.');
		}
	}

	function openEdit(holding: HoldingData) {
		setEditingId(holding.id);
		
		// Determine role and instrument type based on holding data
		let role: 'Stocks' | 'Mutual Funds' | 'ETF' | 'Gold' | 'Real Estate';
		let instrumentType: string;
		
		if (holding.instrumentClass === 'Stocks') {
			role = 'Stocks';
			instrumentType = 'Stocks';
		} else if (holding.instrumentClass === 'Equity MF') {
			role = 'Mutual Funds';
			instrumentType = 'Mutual Funds';
		} else if (holding.instrumentClass === 'ETF') {
			role = 'ETF';
			instrumentType = 'ETF';
		} else if (holding.instrumentClass === 'Gold') {
			role = 'Gold';
			instrumentType = 'Physical Gold';
		} else if (holding.instrumentClass === 'Real Estate') {
			role = 'Real Estate';
			instrumentType = 'Properties';
		} else {
			// Default fallback
			role = 'Stocks';
			instrumentType = 'Stocks';
		}
		
		setSelectedRole(role);
		setSelectedInstrumentType(instrumentType);
		
		// Store original values for reset functionality
		setOriginalForm(holding);
		setForm({
			instrumentClass: holding.instrumentClass as AssetClass,
			name: holding.name,
			symbol: holding.symbol || "",
			units: holding.units?.toString() || "",
			price: holding.price?.toString() || "",
			investedAmount: holding.investedAmount?.toString() || "",
			currentValue: holding.currentValue?.toString() || "",
			propertyType: (holding as any).propertyType || ""
		});
		
		// Set search terms to show the names for all asset classes
		if (holding.instrumentClass === 'Equity MF' || holding.instrumentClass === 'ETF') {
			setMfSearchTerm(holding.name);
			// Try to find and set the selected mutual fund to preserve asset class and portfolio role
			if (holding.symbol) {
				// Find the mutual fund by symbol (scheme code)
				fetchMutualFundSchemes().then(funds => {
					const fund = funds.find(f => f.schemeCode === holding.symbol);
					if (fund) {
						setSelectedMF(fund);
					}
				}).catch(() => {
					// Silently fail if we can't fetch funds
				});
			}
		} else if (holding.instrumentClass === 'Stocks') {
			setStockSearchTerm(holding.name);
		}
		
		setIsModalOpen(true);
	}

	async function handleDeleteHolding(id: string) {
		if (confirm("Are you sure you want to delete this holding?")) {
			try {
				// Delete from DynamoDB
				await deleteHolding(id, 'user-123'); // portfolioId - should come from authentication
				
				// Remove from local state after successful deletion
				setHoldings(prev => prev.filter(h => h.id !== id));
			} catch (error) {
				alert('Failed to delete holding. Please try again.');
			}
		}
	}

	// Import-related functions
	const brokers = [
		"Manual Entry",
		"Zerodha",
		"Groww", 
		"Upstox",
		"Angel",
		"Other"
	];

	// Define supported file formats for each broker
	const brokerFileFormats = {
		"Other": {
			label: "CAS File",
			description: "Upload your Consolidated Account Statement (CAS)",
			accept: ".pdf",
			helpText: "CAS (Consolidated Account Statement) is a document that contains all your holdings across different brokers."
		},
		"Zerodha": {
			label: "Zerodha Holdings File",
			description: "Upload your Zerodha holdings export file",
			accept: ".csv,.xlsx,.pdf",
			helpText: "Export your holdings from Zerodha Console as CSV/Excel or upload your CAS file."
		},
		"Groww": {
			label: "Groww Holdings File", 
			description: "Upload your Groww holdings export file",
			accept: ".csv,.xlsx,.pdf",
			helpText: "Export your holdings from Groww app as CSV/Excel or upload your CAS file."
		},
		"Upstox": {
			label: "Upstox Holdings File",
			description: "Upload your Upstox holdings export file", 
			accept: ".csv,.xlsx,.pdf",
			helpText: "Export your holdings from Upstox Pro as CSV/Excel or upload your CAS file."
		},
		"Angel": {
			label: "Angel Holdings File",
			description: "Upload your Angel holdings export file",
			accept: ".csv,.xlsx,.pdf", 
			helpText: "Export your holdings from Angel One as CSV/Excel or upload your CAS file."
		}
	};

	// File validation function
	const validateFile = (file: File, selectedBroker: string): boolean => {
		// Check file size (max 10MB)
		if (file.size > 10 * 1024 * 1024) {
			return false;
		}
		
		const format = brokerFileFormats[selectedBroker as keyof typeof brokerFileFormats];
		if (!format) return false;
		
		const acceptedTypes = format.accept.split(',').map(type => type.trim());
		
		// Check file extension
		const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
		return acceptedTypes.includes(fileExtension);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(true);
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);
		
		const files = e.dataTransfer.files;
		if (files.length > 0) {
			const file = files[0];
			if (validateFile(file, form.broker)) {
				setSelectedFile(file);
				setImportError("");
				// Auto-detect broker from filename
				const detectedBroker = extractBrokerFromFilename(file.name);
				if (detectedBroker !== 'Other') {
					setForm({ ...form, broker: detectedBroker.toLowerCase() });
				}
			} else {
				const currentFormat = brokerFileFormats[form.broker as keyof typeof brokerFileFormats];
				setImportError(`Please upload a valid file (${currentFormat?.accept || 'supported format'}) under 10MB`);
			}
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			if (validateFile(file, form.broker)) {
				setSelectedFile(file);
				setImportError("");
				// Auto-detect broker from filename
				const detectedBroker = extractBrokerFromFilename(file.name);
				if (detectedBroker !== 'Other') {
					setForm({ ...form, broker: detectedBroker.toLowerCase() });
				}
			} else {
				const currentFormat = brokerFileFormats[form.broker as keyof typeof brokerFileFormats];
				setImportError(`Please upload a valid file (${currentFormat?.accept || 'supported format'}) under 10MB`);
			}
		}
	};

	// Handle import from CAS
	async function handleImportStocks(importResult: any) {
		try {
			setIsRefreshing(true);
			
			// Refresh holdings data from the database
			await loadHoldingsData();
			setIsRefreshing(false);
			
			// Show success message with import details
			const message = `Successfully imported ${importResult.imported} new stocks and updated ${importResult.updated} existing stocks from ${importResult.broker || 'CAS file'}!`;
			
			if (importResult.errors && importResult.errors.length > 0) {
				alert(`${message}\n\nNote: ${importResult.errors.length} stocks had errors during import.`);
			} else {
				alert(message);
			}
		} catch (error) {
			setIsRefreshing(false);
			alert('Failed to refresh holdings after import. Please reload the page.');
		}
	}

	return (
		<div className="max-w-full space-y-4 pl-2">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-sm text-muted-foreground">Holdings</div>
				</div>
				<div className="flex items-center gap-2">
					<Button 
						onClick={() => setIsModalOpen(true)} 
						variant="outline" 
						size="sm"
						leftIcon={<Plus size={16} />}
					>
						Add Holding
					</Button>
				</div>
			</div>
			
			{/* KPI Row */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
				<PlanCard>
					<PlanCardContent className="p-3 text-center">
						<div className="text-xs text-muted-foreground mb-1">Total Value</div>
						<div className="text-lg font-semibold text-foreground mb-1">₹{Math.round(totalValue).toLocaleString()}</div>
						<div className="text-[10px] text-muted-foreground">Portfolio Worth</div>
					</PlanCardContent>
				</PlanCard>
				<PlanCard>
					<PlanCardContent className="p-3 text-center">
						<div className="text-xs text-muted-foreground mb-1">Invested</div>
						<div className="text-lg font-semibold text-foreground mb-1">₹{Math.round(totalInvested).toLocaleString()}</div>
						<div className="text-[10px] text-muted-foreground">Capital Deployed</div>
					</PlanCardContent>
				</PlanCard>
				<PlanCard>
					<PlanCardContent className="p-3 text-center">
						<div className="text-xs text-muted-foreground mb-1">P/L</div>
						<div className={`text-lg font-semibold mb-1 ${totalPL >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
							₹{Math.round(totalPL).toLocaleString()}
						</div>
						<div className="text-[10px] text-muted-foreground">Profit/Loss</div>
					</PlanCardContent>
				</PlanCard>
				<PlanCard>
					<PlanCardContent className="p-3 text-center">
						<div className="text-xs text-muted-foreground mb-1">P/L %</div>
						<div className={`text-lg font-semibold mb-1 ${totalPLPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
							{totalPLPct >= 0 ? `${totalPLPct.toFixed(2)}%` : "—"}
						</div>
						<div className="text-[10px] text-muted-foreground">Return %</div>
					</PlanCardContent>
				</PlanCard>
			</div>

			{/* Holdings Table and Charts - Side by Side */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
				{/* Holdings Table - Takes 2 columns */}
				<div className="lg:col-span-2">
					<PlanCard>
						<PlanCardHeader className="px-4 py-3 border-b border-border">
							<PlanCardTitle className="text-sm font-medium flex items-center gap-2">
								<BarChart3 size={16} />
								All Holdings
							</PlanCardTitle>
						</PlanCardHeader>
						<PlanCardContent className="p-4">
						{/* Filters */}
						<div className="mb-4 flex flex-wrap gap-3">
							<div className="flex items-center gap-2">
								<label className="text-xs font-medium text-muted-foreground">Asset Class:</label>
								<select
									value={filterAssetClass || ''}
									onChange={(e) => setFilterAssetClass(e.target.value || null)}
									className="px-3 py-1.5 text-xs border border-border rounded-md bg-background"
								>
									<option value="">All Classes</option>
									{uniqueAssetClasses.map(assetClass => (
										<option key={assetClass} value={assetClass}>{assetClass}</option>
									))}
								</select>
							</div>
							<div className="flex items-center gap-2">
								<label className="text-xs font-medium text-muted-foreground">Portfolio Role:</label>
								<select
									value={filterAssetRole || ''}
									onChange={(e) => setFilterAssetRole(e.target.value || null)}
									className="px-3 py-1.5 text-xs border border-border rounded-md bg-background"
								>
									<option value="">All Roles</option>
									<option value="Equity">Equity</option>
									<option value="Defensive">Defensive</option>
									<option value="Satellite">Satellite</option>
								</select>
							</div>
						</div>
						
						{holdings && holdings.length > 0 ? (
							<div>
								{/* Desktop Table View */}
								<div className="hidden md:block rounded-xl border border-border overflow-auto">
									<table className="w-full text-left text-xs">
										<thead className="bg-card sticky top-0 z-10">
											<tr>
												<th className="py-2 px-3 text-muted-foreground cursor-pointer" onClick={() => toggleSort('instrument')}>Instrument</th>
												<th className="py-2 px-3 text-muted-foreground cursor-pointer" onClick={() => toggleSort('class')}>Asset Class / Portfolio Role</th>
												<th className="py-2 px-3 text-muted-foreground">Units</th>
												<th className="py-2 px-3 text-muted-foreground cursor-pointer" onClick={() => toggleSort('current')}>Price</th>
												<th className="py-2 px-3 text-muted-foreground text-right cursor-pointer" onClick={() => toggleSort('current')}>Current Value</th>
												<th className="py-2 px-3 text-muted-foreground text-right cursor-pointer" onClick={() => toggleSort('invested')}>Invested Amount</th>
												<th className="py-2 px-3 text-muted-foreground text-right cursor-pointer" onClick={() => toggleSort('pl')}>P/L</th>
												<th className="py-2 px-3 text-muted-foreground">Actions</th>
											</tr>
										</thead>
										<tbody>
											{currentHoldings.map((holding) => {
												const currentValue = computeHoldingValue(holding);
												const investedAmount = computeInvestedAmount(holding);
												const pl = currentValue - investedAmount;
												const plPercent = investedAmount > 0 ? (pl / investedAmount) * 100 : 0;
												
												return (
													<tr key={holding.id} className="border-t border-border/50">
														<td className="py-2 px-3 font-medium">
															<div className="text-foreground">{holding.name}</div>
														</td>
														<td className="py-2 px-3">
															<div className="space-y-0.5">
																<div className="text-sm text-foreground font-medium">{holding.asset_class || holding.instrumentClass}</div>
																<div className="text-xs text-muted-foreground italic">{holding.portfolio_role || getRoleForAssetClass(holding.instrumentClass)}</div>
															</div>
														</td>
														<td className="py-2 px-3">{holding.units?.toFixed(2) || '0.00'}</td>
														<td className="py-2 px-3">₹{holding.price?.toLocaleString() || '0.00'}</td>
														<td className="py-2 px-3 text-right">₹{currentValue.toLocaleString()}</td>
														<td className="py-2 px-3 text-right">₹{investedAmount.toLocaleString()}</td>
														<td className="py-2 px-3 text-right">
															<div className={`${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
																₹{pl.toLocaleString()}
															</div>
															<div className={`text-[10px] ${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
																{plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
															</div>
														</td>
														<td className="py-2 px-3">
															<div className="flex items-center gap-2">
																<button 
																	onClick={() => openEdit(holding)} 
																	className="p-1 rounded hover:bg-muted transition-colors text-blue-600 hover:text-blue-700"
																	title="Edit"
																>
																	<Edit2 size={14} />
																</button>
																<button 
																	onClick={() => handleDeleteHolding(holding.id)} 
																	className="p-1 rounded hover:bg-muted transition-colors text-rose-600 hover:text-rose-700"
																	title="Delete"
																>
																	<Trash2 size={14} />
																</button>
															</div>
														</td>
													</tr>
												);
											})}
										</tbody>
									</table>
								</div>

								{/* Mobile Card View */}
								<div className="md:hidden space-y-3">
									{currentHoldings.map((holding) => {
										const currentValue = computeHoldingValue(holding);
										const investedAmount = computeInvestedAmount(holding);
										const pl = currentValue - investedAmount;
										const plPercent = investedAmount > 0 ? (pl / investedAmount) * 100 : 0;
										
										return (
											<div key={holding.id} className="bg-card border border-border rounded-xl p-4">
												{/* Header with Instrument and Actions */}
												<div className="flex items-start justify-between mb-3">
													<div className="flex-1">
														<div className="font-medium text-foreground text-sm mb-1">{holding.name}</div>
														<div className="text-xs text-muted-foreground">
															{holding.asset_class || holding.instrumentClass} • {holding.portfolio_role || getRoleForAssetClass(holding.instrumentClass)}
														</div>
													</div>
													<div className="flex items-center gap-2 ml-3">
														<button 
															onClick={() => openEdit(holding)} 
															className="p-1.5 rounded-lg hover:bg-muted transition-colors text-blue-600 hover:text-blue-700"
															title="Edit"
														>
															<Edit2 size={16} />
														</button>
														<button 
															onClick={() => handleDeleteHolding(holding.id)} 
															className="p-1.5 rounded-lg hover:bg-muted transition-colors text-rose-600 hover:text-rose-700"
															title="Delete"
														>
															<Trash2 size={16} />
														</button>
													</div>
												</div>

												{/* Key Metrics */}
												<div className="grid grid-cols-2 gap-4 mb-3">
													<div>
														<div className="text-xs text-muted-foreground mb-1">Units</div>
														<div className="text-sm font-medium text-foreground">{holding.units?.toFixed(2) || '0.00'}</div>
													</div>
													<div>
														<div className="text-xs text-muted-foreground mb-1">Price</div>
														<div className="text-sm font-medium text-foreground">₹{holding.price?.toLocaleString() || '0.00'}</div>
													</div>
												</div>

												{/* Value and P/L */}
												<div className="flex items-center justify-between pt-3 border-t border-border/50">
													<div>
														<div className="text-xs text-muted-foreground mb-1">Current Value</div>
														<div className="text-sm font-semibold text-foreground">₹{currentValue.toLocaleString()}</div>
													</div>
													<div className="text-right">
														<div className="text-xs text-muted-foreground mb-1">P/L</div>
														<div className={`text-sm font-semibold ${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
															₹{pl.toLocaleString()}
														</div>
														<div className={`text-xs ${pl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
															{plPercent >= 0 ? '+' : ''}{plPercent.toFixed(2)}%
														</div>
													</div>
												</div>
											</div>
										);
									})}
								</div>
								
								{/* Pagination Controls */}
								{totalPages > 1 && (
									<div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
										<div className="text-xs text-muted-foreground">
											Showing {startIndex + 1} to {Math.min(endIndex, sortedHoldings.length)} of {sortedHoldings.length} holdings
											{sortedHoldings.length !== holdings.length && (
												<span className="ml-2 text-blue-600">(filtered from {holdings.length} total)</span>
											)}
										</div>
										<div className="flex items-center gap-2">
											<button
												onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
												disabled={currentPage === 1}
												className="px-2 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											>
												Previous
											</button>
											
											<div className="flex items-center gap-1">
												{Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
													<button
														key={page}
														onClick={() => setCurrentPage(page)}
														className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
															currentPage === page
																? 'bg-primary text-primary-foreground'
																: 'text-foreground bg-card border border-border hover:bg-muted'
														}`}
													>
														{page}
													</button>
												))}
											</div>
											
											<button
												onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
												disabled={currentPage === totalPages}
												className="px-2 py-1.5 text-xs font-medium text-foreground bg-card border border-border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
											>
												Next
											</button>
										</div>
									</div>
								)}
							</div>
						) : (
							<div className="text-center py-8 text-muted-foreground">
								<div className="text-4xl mb-2">📊</div>
								<div className="text-lg font-medium mb-2">No holdings yet</div>
								<div className="text-sm">Click "Add Holding" to get started with your portfolio</div>
							</div>
						)}
					</PlanCardContent>
				</PlanCard>
				</div>

				{/* Charts Section - Right Side */}
				<div className="lg:col-span-1 space-y-6">
					{/* Asset Class Chart */}
					<PlanCard>
						<PlanCardHeader className="px-4 py-3 border-b border-border">
							<PlanCardTitle className="text-sm font-medium flex items-center gap-2">
								<PieChartIcon size={16} />
								Asset Class
							</PlanCardTitle>
						</PlanCardHeader>
						<PlanCardContent className="p-4">
							{holdings && holdings.length > 0 ? (
								<div className="space-y-4">
									<div className="h-32 flex items-center justify-center">
										<ResponsiveContainer width="100%" height="100%">
											<PieChart>
												<Pie
													data={portfolioAllocationData}
													cx="50%"
													cy="50%"
													innerRadius={20}
													outerRadius={50}
													paddingAngle={2}
													dataKey="value"
												>
													{portfolioAllocationData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={entry.color} />
													))}
												</Pie>
												<Tooltip 
													formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']}
													labelFormatter={(label) => `${label}`}
													contentStyle={{
														backgroundColor: 'hsl(var(--card))',
														border: '1px solid hsl(var(--border))',
														borderRadius: '8px',
														boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
													}}
												/>
											</PieChart>
										</ResponsiveContainer>
									</div>
									
									{/* Asset Class Summary */}
									<div className="space-y-2">
										{portfolioAllocationData.map((item, index) => (
											<div key={index} className="flex items-center justify-between text-xs">
												<div className="flex items-center gap-2">
													<div 
														className="w-2 h-2 rounded-full" 
														style={{ backgroundColor: item.color }}
													></div>
													<span className="text-foreground font-medium">{item.name}</span>
												</div>
												<div className="text-muted-foreground font-medium">
													{((item.value / totalValue) * 100).toFixed(1)}%
												</div>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="text-center py-8 text-muted-foreground">
									<div className="text-2xl mb-2">📊</div>
									<div className="text-sm">No data to display</div>
								</div>
							)}
						</PlanCardContent>
					</PlanCard>

					{/* Portfolio Role Chart - Bar Chart */}
					<PlanCard>
						<PlanCardHeader className="px-4 py-3 border-b border-border">
							<PlanCardTitle className="text-sm font-medium flex items-center gap-2">
								<BarChart3 size={16} />
								Portfolio Role
							</PlanCardTitle>
						</PlanCardHeader>
						<PlanCardContent className="p-4">
							{holdings && holdings.length > 0 ? (
								<div className="space-y-4">
									<div className="h-32 flex items-center justify-center">
										<ResponsiveContainer width="100%" height="100%">
											<BarChart data={portfolioRoleData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
												<CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
												<XAxis 
													dataKey="name" 
													tick={{ fontSize: 10 }}
													axisLine={false}
													tickLine={false}
												/>
												<YAxis 
													tick={{ fontSize: 10 }}
													axisLine={false}
													tickLine={false}
													tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`}
												/>
												<Tooltip 
													formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']}
													contentStyle={{
														backgroundColor: 'hsl(var(--card))',
														border: '1px solid hsl(var(--border))',
														borderRadius: '8px',
														boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
													}}
												/>
												<Bar dataKey="value" radius={[2, 2, 0, 0]} xAxisId={0}>
													{portfolioRoleData.map((entry, index) => (
														<Cell key={`cell-${index}`} fill={entry.color} />
													))}
												</Bar>
											</BarChart>
										</ResponsiveContainer>
									</div>
									
									{/* Portfolio Role Summary */}
									<div className="space-y-2">
										{portfolioRoleData.map((item, index) => (
											<div key={index} className="flex items-center justify-between text-xs">
												<div className="flex items-center gap-2">
													<div 
														className="w-2 h-2 rounded-full" 
														style={{ backgroundColor: item.color }}
													></div>
													<span className="text-foreground font-medium">{item.name}</span>
												</div>
												<div className="text-muted-foreground font-medium">
													{((item.value / totalValue) * 100).toFixed(1)}%
												</div>
											</div>
										))}
									</div>
								</div>
							) : (
								<div className="text-center py-8 text-muted-foreground">
									<div className="text-2xl mb-2">📊</div>
									<div className="text-sm">No data to display</div>
								</div>
							)}
						</PlanCardContent>
					</PlanCard>
				</div>
			</div>

			{/* Add/Edit Modal */}
			{isModalOpen && (
				<div className="fixed inset-0 z-50">
					<div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsModalOpen(false); resetForm(); }} />
					<div className="absolute inset-x-4 top-16 mx-auto w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
						{/* Header */}
						<div className="px-6 py-4 border-b border-border flex items-center justify-between">
							<div>
								<div className="text-lg font-bold text-foreground">{editingId ? "Edit Holding" : "Add New Holding"}</div>
								<div className="text-sm text-muted-foreground mt-1">
									{editingId ? "Modify existing holding details" : 
									 entryMode === 'manual' ? "Select portfolio role and instrument details" : 
									 "Import holdings from broker or CAS file"}
								</div>
							</div>
							<button onClick={() => { setIsModalOpen(false); resetForm(); }} className="p-2 rounded-full hover:bg-muted transition-colors" aria-label="Close">
								<X size={18} className="text-muted-foreground" />
							</button>
						</div>
						
						{/* Entry Mode Selection - Top Row */}
						{!editingId && (
							<div className="px-6 py-3 border-b border-border">
								<div className="text-center">
									<label className="block text-sm font-medium text-foreground mb-3 flex items-center justify-center gap-2">
										<BarChart3 size={16} />
										Entry Mode
									</label>
									<div className="flex items-center justify-center gap-3">
										<button
											type="button"
											onClick={() => {
												setEntryMode('manual');
												setSelectedRole(null);
												setSelectedFile(null);
												setPassword("");
												setImportError("");
											}}
											className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
												entryMode === 'manual'
													? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105 ring-2 ring-blue-500/30"
													: "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-102"
											}`}
										>
											Manual Entry
										</button>
										<button
											type="button"
											onClick={() => {
												setEntryMode('import');
												setSelectedRole(null);
												setForm({ ...form, broker: "other" });
											}}
											className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
												entryMode === 'import'
													? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg scale-105 ring-2 ring-emerald-500/30"
													: "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-102"
											}`}
										>
											Import from File
										</button>
									</div>
								</div>
							</div>
						)}

						{/* Broker Selection - Only for import mode or when editing */}
						{(entryMode === 'import' || editingId) && (
							<div className="px-6 py-3 border-b border-border">
								<div className="text-center">
									<label className="block text-sm font-medium text-foreground mb-3 flex items-center justify-center gap-2">
										<BarChart3 size={16} />
										Broker
									</label>
									<select
										value={form.broker}
										onChange={(e) => setForm({ ...form, broker: e.target.value })}
										className="w-full max-w-xs mx-auto rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
									>
										{brokers.map((brokerOption) => (
											<option key={brokerOption} value={brokerOption.toLowerCase()}>
												{brokerOption}
											</option>
										))}
									</select>
								</div>
							</div>
						)}

						{/* Asset Class Selection - Only for manual mode */}
						{entryMode === 'manual' && !editingId && (
							<div className="px-6 py-3 border-b border-border">
								<div className="text-center">
									<label className="block text-sm font-medium text-foreground mb-3 flex items-center justify-center gap-2">
										<BarChart3 size={16} />
										Asset Class
									</label>
									<div className="flex items-center justify-center gap-3">
										{(['Stocks', 'Mutual Funds', 'ETF', 'Gold', 'Real Estate'] as const).map(assetClass => (
											<button
												key={assetClass}
												type="button"
												onClick={() => {
													setSelectedRole(assetClass as any);
													setSelectedInstrumentType(null);
													// hard reset form and per-asset state
													setForm({ instrumentClass: "Stocks", name: "", symbol: "", units: "", price: "", investedAmount: "", currentValue: "", propertyType: "", broker: form.broker });
													setStockSearchTerm("");
													setSelectedStock(null);
													setFilteredStockOptions([]);
													setShowStockDropdown(false);
													setMfSearchTerm("");
													setSelectedMF(null);
													setFilteredMFOptions([]);
													setShowMFDropdown(false);
												}}
												className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 transform ${
													selectedRole === assetClass
														? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-105 ring-2 ring-blue-500/30"
														: "bg-muted text-muted-foreground hover:bg-muted/80 hover:scale-102"
												}`}
											>
												{assetClass}
											</button>
										))}
									</div>
								</div>
							</div>
						)}
						
						<div className="min-h-[300px]">
							{/* Form Column - Full Width */}
							<div className="w-full p-4">
								{/* Import Mode Form */}
								{entryMode === 'import' ? (
									<form onSubmit={submitForm} className="space-y-6">
										{/* File Upload Section */}
										<div>
											<label className="block text-sm font-medium text-foreground mb-2">
												{brokerFileFormats[form.broker as keyof typeof brokerFileFormats]?.label || "File"}
											</label>
											<div
												className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
													isDragOver
														? "border-primary bg-primary/5"
														: "border-border hover:border-primary/50"
												}`}
												onDragOver={handleDragOver}
												onDragLeave={handleDragLeave}
												onDrop={handleDrop}
											>
												<input
													ref={fileInputRef}
													type="file"
													accept={brokerFileFormats[form.broker as keyof typeof brokerFileFormats]?.accept || "*"}
													onChange={handleFileSelect}
													className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
													disabled={isProcessing}
												/>
												
												{selectedFile ? (
													<div className="space-y-2">
														<Upload className="mx-auto h-8 w-8 text-primary" />
														<div className="text-sm font-medium text-foreground">{selectedFile.name}</div>
														<div className="text-xs text-muted-foreground">
															{(selectedFile.size / 1024 / 1024).toFixed(2)} MB
														</div>
														<button
															type="button"
															onClick={() => setSelectedFile(null)}
															className="text-xs text-rose-600 hover:text-rose-700"
															disabled={isProcessing}
														>
															Remove file
														</button>
													</div>
												) : (
													<div className="space-y-2">
														<Upload className="mx-auto h-8 w-8 text-muted-foreground" />
														<div className="text-sm font-medium text-foreground">
															Drop your file here or click to browse
														</div>
														<div className="text-xs text-muted-foreground">
															{brokerFileFormats[form.broker as keyof typeof brokerFileFormats]?.description || "Select a file to upload"}
														</div>
													</div>
												)}
											</div>
											
											{/* Help Link */}
											<div className="mt-2">
												<a
													href="#"
													className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
													onClick={(e) => {
														e.preventDefault();
														const helpText = brokerFileFormats[form.broker as keyof typeof brokerFileFormats]?.helpText || "No help available";
														alert(helpText);
													}}
												>
													<ExternalLink size={12} />
													{form.broker === "other" ? "How to generate CAS?" : "How to export holdings?"}
												</a>
											</div>
										</div>

										{/* Password Field - Only show for CAS files (Other broker) */}
										{form.broker === 'other' && (
											<div>
												<label className="block text-sm font-medium text-foreground mb-2">
													Password
												</label>
												<div className="relative">
													<Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
													<input
														type="password"
														value={password}
														onChange={(e) => setPassword(e.target.value)}
														placeholder="Enter CAS password"
														className="w-full rounded-lg border border-border bg-background pl-10 pr-3 py-2 text-sm text-foreground"
														disabled={isProcessing}
													/>
												</div>
												<div className="text-xs text-muted-foreground mt-1">
													Password used to protect your CAS file
												</div>
											</div>
										)}

										{/* Error Message */}
										{importError && (
											<div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-lg">
												<AlertCircle className="h-4 w-4 text-rose-600" />
												<span className="text-sm text-rose-700 dark:text-rose-300">{importError}</span>
											</div>
										)}

										{/* Note */}
										<div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
											<div className="text-xs text-blue-700 dark:text-blue-300">
												<strong>Note:</strong> Existing stocks in your portfolio will be updated with the imported data.
											</div>
										</div>

										{/* Form Actions */}
										<div className="flex items-center justify-between pt-6 border-t border-border">
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => { 
														setIsModalOpen(false); 
														clearEditState(); 
														resetForm(); 
													}}
													className="px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-sm"
												>
													Cancel
												</button>
											</div>
											
											<button
												type="submit"
												disabled={!selectedFile || (form.broker === 'other' && !password.trim()) || isProcessing}
												className="min-w-[140px] px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
											>
												{isProcessing ? "Processing..." : "Import Holdings"}
											</button>
										</div>
									</form>
								) : selectedRole ? (
									<form onSubmit={submitForm} className="space-y-6">
										{/* Stocks Form */}
										{selectedRole === 'Stocks' && (
											<>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Stock Name *</label>
													<div className="relative">
														<input
															value={selectedStock ? `${selectedStock.companyName} (${selectedStock.symbol})` : stockSearchTerm}
															onChange={(e) => {
																if (editingId) return; // Disable in edit mode
																const newValue = e.target.value;
																setStockSearchTerm(newValue);
																
																// If user is typing something different from the selected stock, clear the selection
																if (selectedStock && newValue !== selectedStock.companyName) {
																	setSelectedStock(null);
																	setForm({ ...form, name: '', symbol: '', price: '' });
																}
																
																if (newValue.trim() === '') {
																	setShowStockDropdown(false);
																	setFilteredStockOptions([]);
																	setSelectedStock(null);
																	setForm({ ...form, name: '', symbol: '', price: '' });
																}
															}}
															onFocus={() => {
																if (editingId) return; // Disable in edit mode
																if (stockSearchTerm.trim()) {
																	filterStockOptions(stockSearchTerm);
																}
															}}
															disabled={editingId !== null}
															className={`w-full rounded-lg border border-border px-3 py-2 text-sm ${
																editingId !== null 
																	? 'bg-muted text-muted-foreground cursor-not-allowed' 
																	: 'bg-background text-foreground'
															}`}
															placeholder={editingId !== null ? "Stock name cannot be changed during edit" : "Search for stocks..."}
														/>
																												{showStockDropdown && filteredStockOptions.length > 0 && !editingId && stockSearchTerm.trim() !== '' && (
															<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
																{filteredStockOptions.map((stock) => (
																	<div
																		key={stock.symbol}
																		onClick={() => {
																			setSelectedStock(stock);
																			setStockSearchTerm(stock.companyName);
															setForm({ ...form, name: stock.companyName, symbol: stock.symbol, price: '' });
															setShowStockDropdown(false);
															setFilteredStockOptions([]);
														}}
														className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
													>
														<div className="font-medium text-sm">{stock.companyName}</div>
														<div className="text-xs text-muted-foreground">{stock.symbol} • {stock.exchange}</div>
													</div>
																))}
															</div>
														)}
													</div>
												</div>
												

												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Units/Quantity *</label>
													<input
														type="number"
														value={form.units || ''}
														onChange={(e) => setForm({ ...form, units: e.target.value })}
														required
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
														placeholder="0"
														step="0.01"
													/>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Current Price per Unit *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.price || ''}
															onChange={(e) => setForm({ ...form, price: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>

											</>
										)}

																																								{/* Mutual Funds Form */}
								{selectedRole === 'Mutual Funds' && (
											<>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Fund Name *</label>
													<div className="relative">
														<input
															value={mfSearchTerm}
															onChange={(e) => {
																setMfSearchTerm(e.target.value);
																if (e.target.value.trim() === '') {
																	setShowMFDropdown(false);
																	setFilteredMFOptions([]);
																} else {
																	filterMFOptions(e.target.value);
																}
															}}
															onFocus={() => {
																if (mfSearchTerm.trim()) {
																	filterMFOptions(mfSearchTerm);
																}
															}}
															disabled={editingId !== null}
															className={`w-full rounded-lg border border-border px-3 py-2 text-sm ${
																editingId !== null 
																	? 'bg-muted text-muted-foreground cursor-not-allowed' 
																	: 'bg-background text-foreground'
															}`}
															placeholder={editingId !== null ? "Fund name cannot be changed during edit" : "Search for mutual funds..."}
														/>
														{showMFDropdown && filteredMFOptions.length > 0 && !editingId && mfSearchTerm.trim() !== '' && (
															<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
																{filteredMFOptions.map((fund) => (
																	<div
														key={fund.schemeCode}
														onClick={() => {
															setSelectedMF(fund);
															setMfSearchTerm(fund.name);
															setForm({ ...form, name: fund.name, symbol: fund.schemeCode, price: fund.currentNAV.toString() });
															setShowMFDropdown(false);
															setFilteredMFOptions([]);
														}}
														className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
																	>
														<div className="font-medium text-sm">{fund.name}</div>
														<div className="text-xs text-muted-foreground">
															NAV: ₹{fund.currentNAV} • {fund.asset_class} • {fund.portfolioRole}
														</div>
																	</div>
																))}
															</div>
														)}
													</div>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Investment Amount *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.investedAmount || ''}
															onChange={(e) => setForm({ ...form, investedAmount: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>

												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Current NAV *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.price || ''}
															onChange={(e) => setForm({ ...form, price: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>

											</>
										)}

										{/* ETF Form */}
										{selectedRole === 'ETF' && (
											<>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">ETF Name *</label>
													<div className="relative">
														<input
															value={etfSearchTerm}
															onChange={(e) => {
																setEtfSearchTerm(e.target.value);
																if (e.target.value.trim() === '') {
																	setShowETFDropdown(false);
																	setFilteredETFOptions([]);
																} else {
																	filterETFOptions(e.target.value);
																}
															}}
															onFocus={() => {
																if (etfSearchTerm.trim()) {
																	filterETFOptions(etfSearchTerm);
																}
															}}
															disabled={editingId !== null}
															className={`w-full rounded-lg border border-border px-3 py-2 text-sm ${
																editingId !== null 
																	? 'bg-muted text-muted-foreground cursor-not-allowed' 
																	: 'bg-background text-foreground'
															}`}
															placeholder={editingId !== null ? "ETF name cannot be changed during edit" : "Search for ETFs..."}
														/>
														{showETFDropdown && filteredETFOptions.length > 0 && !editingId && etfSearchTerm.trim() !== '' && (
															<div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-auto">
																{filteredETFOptions.map((fund) => (
																	<div
														key={fund.schemeCode}
														onClick={() => {
															setSelectedETF(fund);
															setEtfSearchTerm(fund.name);
															setForm({ ...form, name: fund.name, symbol: fund.schemeCode, price: fund.currentNAV.toString() });
															setShowETFDropdown(false);
															setFilteredETFOptions([]);
														}}
														className="px-3 py-2 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
																	>
														<div className="font-medium text-sm">{fund.name}</div>
														<div className="text-xs text-muted-foreground">
															NAV: ₹{fund.currentNAV} • {fund.asset_class} • {fund.portfolioRole}
														</div>
																	</div>
																))}
															</div>
														)}
													</div>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Investment Amount *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.investedAmount || ''}
															onChange={(e) => setForm({ ...form, investedAmount: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Current Price per Unit *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">₹</span>
														<input
															type="number"
															value={form.price || ''}
															onChange={(e) => setForm({ ...form, price: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>

											</>
										)}

										{/* Gold Form */}
										{selectedRole === 'Gold' && (
											<>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Gold Type *</label>
													<input
														value={form.name}
														onChange={(e) => {
															if (editingId) return; // Disable in edit mode
															setForm({ ...form, name: e.target.value });
														}}
														disabled={editingId !== null}
														required
														className={`w-full rounded-lg border border-border px-3 py-2 text-sm ${
															editingId !== null 
																? 'bg-muted text-muted-foreground cursor-not-allowed' 
																: 'bg-background text-foreground'
														}`}
														placeholder={editingId !== null ? "Gold type cannot be changed during edit" : "e.g., Physical Gold, Gold Coins, Gold Bars"}
													/>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Quantity (grams) *</label>
													<input
														type="number"
														value={form.units || ''}
														onChange={(e) => setForm({ ...form, units: e.target.value })}
														required
														className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
														placeholder="0"
														step="0.01"
													/>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Current Price per Unit *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.price || ''}
															onChange={(e) => setForm({ ...form, price: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>


											</>
										)}

										{/* Real Estate Form */}
										{selectedRole === 'Real Estate' && (
											<>
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Property Name *</label>
													<input
														value={form.name}
														onChange={(e) => {
															if (editingId) return; // Disable in edit mode
															setForm({ ...form, name: e.target.value });
														}}
														disabled={editingId !== null}
														required
														className={`w-full rounded-lg border border-border px-3 py-2 text-sm ${
															editingId !== null 
																? 'bg-muted text-muted-foreground cursor-not-allowed' 
																: 'bg-background text-foreground'
														}`}
														placeholder={editingId !== null ? "Property name cannot be changed during edit" : "Enter property name"}
													/>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Property Type *</label>
													<select
														value={form.propertyType || ''}
														onChange={(e) => {
															if (editingId) return; // Disable in edit mode
															setForm({ ...form, propertyType: e.target.value });
														}}
														disabled={editingId !== null}
														required
														className={`w-full rounded-lg border border-border px-3 py-2 text-sm ${
															editingId !== null 
																? 'bg-muted text-muted-foreground cursor-not-allowed' 
																: 'bg-background text-foreground'
														}`}
													>
														<option value="">Select property type</option>
														<option value="Residential">Residential</option>
														<option value="Commercial">Commercial</option>
														<option value="Land">Land</option>
														<option value="REIT">REIT</option>
													</select>
												</div>
												
												<div>
													<label className="block text-sm font-medium text-foreground mb-2">Investment Amount *</label>
													<div className="relative">
														<span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground">₹</span>
														<input
															type="number"
															value={form.investedAmount || ''}
															onChange={(e) => setForm({ ...form, investedAmount: e.target.value })}
															required
															className="w-full rounded-lg border border-border bg-background pl-8 pr-3 py-2 text-sm text-foreground"
															placeholder="0.00"
															step="0.01"
														/>
													</div>
												</div>
											</>
										)}

										{/* Form Actions */}
										<div className="flex items-center justify-between pt-6 border-t border-border">
											<div className="flex items-center gap-2">
												<button
													type="button"
													onClick={() => { 
														setIsModalOpen(false); 
														clearEditState(); 
														resetForm(); 
													}}
													className="px-4 py-2 rounded-lg text-foreground hover:bg-muted transition-colors text-sm"
												>
													Cancel
												</button>
												<button
													type="button"
													onClick={resetForm}
													className="px-4 py-2 rounded-lg border border-border text-foreground hover:bg-muted transition-colors text-sm"
												>
													Reset
												</button>
											</div>
											
											{/* Simple KPI Section */}
											<div className="flex items-center gap-4">
												{form.investedAmount && (
													<div className="text-right">
														<div className="text-xs text-muted-foreground">Investment</div>
														<div className="text-sm font-medium">₹{parseFloat(form.investedAmount || '0').toLocaleString()}</div>
													</div>
												)}
												{/* Show calculated units for Mutual Funds */}
												{selectedRole === 'Mutual Funds' && form.investedAmount && form.price && (
													<div className="text-right">
														<div className="text-xs text-muted-foreground">Units to be added</div>
														<div className="text-sm font-medium">{(parseFloat(form.investedAmount || '0') / parseFloat(form.price || '1')).toFixed(4)}</div>
													</div>
												)}
												{/* Show calculated units for ETFs */}
												{selectedRole === 'ETF' && form.investedAmount && form.price && (
													<div className="text-right">
														<div className="text-xs text-muted-foreground">Units to be added</div>
														<div className="text-sm font-medium">{(parseFloat(form.investedAmount || '0') / parseFloat(form.price || '1')).toFixed(4)}</div>
													</div>
												)}
												{form.units && form.price && (
													<div className="text-right">
														<div className="text-xs text-muted-foreground">Value</div>
														<div className="text-sm font-medium">₹{(parseFloat(form.units || '0') * parseFloat(form.price || '0')).toLocaleString()}</div>
													</div>
												)}
												<button
													type="submit"
													className="min-w-[140px] px-6 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-sm"
												>
													{editingId ? "Save Changes" : "Add Holding"}
												</button>
											</div>
										</div>
									</form>
								) : (
									<div className="flex items-center justify-center h-full">
										<div className="text-center text-muted-foreground">
											<div className="text-3xl mb-3">📋</div>
											<div className="text-base font-medium mb-1">Select Instrument Type</div>
											<div className="text-xs">Choose an instrument type from the left menu to continue</div>
										</div>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			)}

		</div>
	);
}