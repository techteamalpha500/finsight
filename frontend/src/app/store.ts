"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AllocationPlan, AssetClass } from "./PortfolioManagement/domain/allocationEngine";

// One-time cleanup of older persisted keys that may carry stale drafts
try { if (typeof window !== "undefined") { localStorage.removeItem("finsight-v1"); localStorage.removeItem("finsight-v2"); } } catch {}

export interface UserProfile {
	name?: string;
	currency?: string;
}

export interface Holding {
	id: string;
	instrumentClass: AssetClass;
	name: string;
	symbol?: string;
	units?: number;
	price?: number;
	investedAmount?: number;
	currentValue?: number;
}

export type ExpenseCategory = "Food" | "Travel" | "Bills" | "Shopping" | "Entertainment" | "Health" | "Groceries" | "Fuel" | "Utilities" | "Healthcare" | "Other";

export interface Expense {
	id: string;
	text: string; // original input or description
	amount: number;
	category: ExpenseCategory | string;
	date: string; // ISO string
	createdAt?: string; // ISO timestamp, used for sorting, not shown
	note?: string;
}

interface AppState {
	profile: UserProfile;
	questionnaire: Record<string, any>;
	plan: AllocationPlan | null;
	holdings: Holding[];
	// Portfolio metadata
	portfolios: Array<{ id: string; name: string; createdAt?: string }>;
	activePortfolioId?: string;
	driftTolerancePct: number;
	emergencyMonths: number;

	// Constraints (client-side for now)
	constraintsByPortfolio: Record<string, { efMonths?: number; liquidityAmount?: number; liquidityMonths?: number; notes?: string }>;

	expenses: Expense[];
	categoryMemory: Record<string, ExpenseCategory | string>; // keyword -> category
	expenseReminderDaily: boolean;
	categoryBudgets: Record<string, Record<string, number>>; // legacy monthly budgets (kept for compatibility)
	defaultCategoryBudgets: Record<string, number>; // one-time per-user budgets

	// Expense Tracker preferences (persisted locally)
	spendBaselineMode: "last" | "avg3" | "ytd";
	spendSensitivity: "low" | "medium" | "high";

	// Custom mode persistence
	customDraftByPortfolio: Record<string, AllocationPlan | null>;
	customLocksByPortfolio: Record<string, Record<string, boolean>>;

	// Per-mode last saved snapshots (client-side assist)
	advisorSavedByPortfolio: Record<string, AllocationPlan | null>;
	customSavedByPortfolio: Record<string, AllocationPlan | null>;

	setProfile: (profile: Partial<UserProfile>) => void;
	setQuestionAnswer: (key: string, value: any) => void;
	setQuestionnaire: (q: Record<string, any>) => void;
	setPlan: (plan: AllocationPlan | null) => void;
	setPortfolios: (items: Array<{ id: string; name: string; createdAt?: string }>) => void;
	setActivePortfolio: (id: string) => void;
	addHolding: (h: Holding) => void;
	updateHolding: (id: string, updates: Partial<Holding>) => void;
	deleteHolding: (id: string) => void;
	setDriftTolerancePct: (v: number) => void;
	setEmergencyMonths: (v: number) => void;
	reset: () => void;

	addExpense: (e: Expense) => void;
	setExpenses: (e: Expense[]) => void;
	updateExpense: (id: string, updates: Partial<Expense>) => void;
	deleteExpense: (id: string) => void;
	rememberCategory: (keyword: string, category: ExpenseCategory | string) => void;
	setExpenseReminderDaily: (enabled: boolean) => void;
	setCategoryBudget: (ym: string, category: string, amount: number) => void;
	setDefaultCategoryBudgets: (budgets: Record<string, number>) => void;
	setDefaultCategoryBudget: (category: string, amount: number) => void;
	setSpendBaselineMode: (mode: "last" | "avg3" | "ytd") => void;
	setSpendSensitivity: (level: "low" | "medium" | "high") => void;

	setConstraints: (portfolioId: string, c: Partial<{ efMonths?: number; liquidityAmount?: number; liquidityMonths?: number; notes?: string }>) => void;
	getConstraints: (portfolioId: string) => { efMonths?: number; liquidityAmount?: number; liquidityMonths?: number; notes?: string } | undefined;

	setCustomDraft: (portfolioId: string, plan: AllocationPlan | null) => void;
	getCustomDraft: (portfolioId: string) => AllocationPlan | null;
	setCustomLocks: (portfolioId: string, locks: Record<string, boolean>) => void;
	getCustomLocks: (portfolioId: string) => Record<string, boolean>;
	setAdvisorSaved: (portfolioId: string, plan: AllocationPlan | null) => void;
	getAdvisorSaved: (portfolioId: string) => AllocationPlan | null;
	setCustomSaved: (portfolioId: string, plan: AllocationPlan | null) => void;
	getCustomSaved: (portfolioId: string) => AllocationPlan | null;
}

export const useApp = create<AppState>()(
	persist(
		(set, get) => ({
			profile: { name: "", currency: "INR" },
			questionnaire: { preferredAssets: [] },
			plan: null,
			holdings: [],
			portfolios: [],
			driftTolerancePct: 5,
			emergencyMonths: 6,

			constraintsByPortfolio: {},

			expenses: [],
			categoryMemory: {},
			expenseReminderDaily: false,
			categoryBudgets: {},
			defaultCategoryBudgets: {},
			spendBaselineMode: "last",
			spendSensitivity: "medium",

			customDraftByPortfolio: {},
			customLocksByPortfolio: {},
			advisorSavedByPortfolio: {},
			customSavedByPortfolio: {},

			setProfile: (profile: Partial<UserProfile>) => set((state: AppState) => ({ profile: { ...state.profile, ...profile } })),
			setQuestionAnswer: (key: string, value: any) => set((state: AppState) => ({ questionnaire: { ...state.questionnaire, [key]: value } })),
			setQuestionnaire: (q: Record<string, any>) => set(() => ({ questionnaire: { ...q } })),
			setPlan: (plan: AllocationPlan | null) => set(() => ({ plan })),
			setPortfolios: (items: Array<{ id: string; name: string; createdAt?: string }>) => set(() => ({ portfolios: items })),
			setActivePortfolio: (id: string) => set(() => ({ activePortfolioId: id })),
			addHolding: (h: Holding) => set((state: AppState) => ({ holdings: [...state.holdings, h] })),
			updateHolding: (id: string, updates: Partial<Holding>) => set((state: AppState) => ({ holdings: state.holdings.map(h => (h.id === id ? { ...h, ...updates } : h)) })),
			deleteHolding: (id: string) => set((state: AppState) => ({ holdings: state.holdings.filter(h => h.id !== id) })), 
			setDriftTolerancePct: (v: number) => set(() => ({ driftTolerancePct: Math.min(10, Math.max(3, Math.round(v))) })),
			setEmergencyMonths: (v: number) => set(() => ({ emergencyMonths: Math.min(12, Math.max(3, Math.round(v))) })),
			reset: () => set(() => ({ profile: { name: "", currency: "INR" }, questionnaire: { preferredAssets: [] }, plan: null, holdings: [], driftTolerancePct: 5, emergencyMonths: 6, expenses: [], categoryMemory: {}, expenseReminderDaily: false, categoryBudgets: {}, defaultCategoryBudgets: {}, customDraftByPortfolio: {}, customLocksByPortfolio: {}, advisorSavedByPortfolio: {}, customSavedByPortfolio: {} })),

			addExpense: (e: Expense) => set((state: AppState) => ({ expenses: [e, ...state.expenses] })),
			setExpenses: (e: Expense[]) => set(() => ({ expenses: [...e] })),
			updateExpense: (id: string, updates: Partial<Expense>) => set((state: AppState) => ({ expenses: state.expenses.map(ex => (ex.id === id ? { ...ex, ...updates } : ex)) })),
			deleteExpense: (id: string) => set((state: AppState) => ({ expenses: state.expenses.filter(ex => ex.id !== id) })),
			rememberCategory: (keyword: string, category: ExpenseCategory | string) => set((state: AppState) => ({ categoryMemory: { ...state.categoryMemory, [keyword.toLowerCase()]: category } })),
			setExpenseReminderDaily: (enabled: boolean) => set(() => ({ expenseReminderDaily: !!enabled })),
			setCategoryBudget: (ym: string, category: string, amount: number) => set((state: AppState) => ({
				categoryBudgets: {
					...state.categoryBudgets,
					[ym]: {
						...(state.categoryBudgets[ym] || {}),
						[category]: Math.max(0, Number(amount) || 0),
					},
				},
			})),
			setDefaultCategoryBudgets: (budgets: Record<string, number>) => set(() => ({ defaultCategoryBudgets: { ...budgets } })),
			setDefaultCategoryBudget: (category: string, amount: number) => set((state: AppState) => ({ defaultCategoryBudgets: { ...state.defaultCategoryBudgets, [category]: Math.max(0, Number(amount) || 0) } })),
			setSpendBaselineMode: (mode: "last" | "avg3" | "ytd") => set(() => ({ spendBaselineMode: mode })),
			setSpendSensitivity: (level: "low" | "medium" | "high") => set(() => ({ spendSensitivity: level })),

			setConstraints: (portfolioId: string, c: Partial<{ efMonths?: number; liquidityAmount?: number; liquidityMonths?: number; notes?: string }>) => set((state: AppState) => ({ constraintsByPortfolio: { ...state.constraintsByPortfolio, [portfolioId]: { ...(state.constraintsByPortfolio?.[portfolioId]||{}), ...c } } })),
			getConstraints: (portfolioId: string) => (get().constraintsByPortfolio?.[portfolioId]),

			setCustomDraft: (portfolioId: string, plan: AllocationPlan | null) => set((state: AppState) => ({ customDraftByPortfolio: { ...state.customDraftByPortfolio, [portfolioId]: plan } })),
			getCustomDraft: (portfolioId: string) => (get().customDraftByPortfolio?.[portfolioId] || null),
			setCustomLocks: (portfolioId: string, locks: Record<string, boolean>) => set((state: AppState) => ({ customLocksByPortfolio: { ...state.customLocksByPortfolio, [portfolioId]: { ...(state.customLocksByPortfolio?.[portfolioId]||{}), ...locks } } })),
			getCustomLocks: (portfolioId: string) => (get().customLocksByPortfolio?.[portfolioId] || {}),
			setAdvisorSaved: (portfolioId: string, plan: AllocationPlan | null) => set((state: AppState) => ({ advisorSavedByPortfolio: { ...state.advisorSavedByPortfolio, [portfolioId]: plan } })),
			getAdvisorSaved: (portfolioId: string) => (get().advisorSavedByPortfolio?.[portfolioId] || null),
			setCustomSaved: (portfolioId: string, plan: AllocationPlan | null) => set((state: AppState) => ({ customSavedByPortfolio: { ...state.customSavedByPortfolio, [portfolioId]: plan } })),
			getCustomSaved: (portfolioId: string) => (get().customSavedByPortfolio?.[portfolioId] || null),
		}),
		{
			name: "finsight-v3",
			storage: createJSONStorage(() => localStorage),
			partialize: (state: any) => {
				const { plan, ...rest } = state || {};
				return rest;
			},
		}
	)
);