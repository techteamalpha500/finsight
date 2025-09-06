import type { ExpenseCategory } from "../store";

// Predefined rules (rules-first)
const keywordToCategory: Record<string, ExpenseCategory | string> = {
  // ---------------- Food ----------------
  groceries: "Food", grocery: "Food", supermarket: "Food", bigbasket: "Food", dmart: "Food",
  reliancefresh: "Food", spencers: "Food", more: "Food", naturesbasket: "Food",
  restaurant: "Food", dining: "Food", dine: "Food", lunch: "Food", dinner: "Food",
  pizza: "Food", burger: "Food", breakfast: "Food", snacks: "Food", coffee: "Food",
  tea: "Food", swiggy: "Food", zomato: "Food", ubereats: "Food", eatfit: "Food",
  freshmenu: "Food", box8: "Food", dominos: "Food", kfc: "Food", mcdonalds: "Food",
  starbucks: "Food", chaayos: "Food", behrouz: "Food", bikanervala: "Food",

  // ---------------- Travel ----------------
  travel: "Travel", transport: "Travel", commute: "Travel", taxi: "Travel",
  uber: "Travel", ola: "Travel", rapido: "Travel", jugnoo: "Travel",
  bus: "Travel", redbus: "Travel", train: "Travel", irctc: "Travel", metro: "Travel",
  flight: "Travel", airline: "Travel", indigo: "Travel", airindia: "Travel", vistara: "Travel",
  spicejet: "Travel", gofirst: "Travel", akasa: "Travel",
  fuel: "Travel", petrol: "Travel", diesel: "Travel", gas: "Travel", hp: "Travel", bpcl: "Travel", iocl: "Travel",
  parking: "Travel", toll: "Travel", fastag: "Travel",

  // ---------------- Entertainment ----------------
  entertainment: "Entertainment", cinema: "Entertainment", movie: "Entertainment",
  movies: "Entertainment", inox: "Entertainment", pvr: "Entertainment", carnival: "Entertainment",
  theatre: "Entertainment", amusement: "Entertainment", gaming: "Entertainment", playstation: "Entertainment",
  xbox: "Entertainment", steam: "Entertainment", pubg: "Entertainment", freefire: "Entertainment",
  outing: "Entertainment", concert: "Entertainment", cricket: "Entertainment", sports: "Entertainment",

  // ---------------- Subscriptions ----------------
  subscription: "Subscription", recurring: "Subscription", netflix: "Subscription",
  hotstar: "Subscription", disney: "Subscription", sunnxt: "Subscription", zee5: "Subscription",
  sony: "Subscription", sonyLiv: "Subscription", amazonprime: "Subscription", prime: "Subscription",
  spotify: "Subscription", wynk: "Subscription", gaana: "Subscription", jiosaavn: "Subscription",
  youtube: "Subscription", youtubePremium: "Subscription", audible: "Subscription", kindle: "Subscription",
  newspaper: "Subscription", magazine: "Subscription", membership: "Subscription", clubhouse: "Subscription",

  // ---------------- Shopping ----------------
  shopping: "Shopping", apparel: "Shopping", clothing: "Shopping", fashion: "Shopping", mall: "Shopping",
  amazon: "Shopping", flipkart: "Shopping", myntra: "Shopping", ajio: "Shopping", nykaa: "Shopping",
  tatacliq: "Shopping", snapdeal: "Shopping", meesho: "Shopping", shopclues: "Shopping",
  electronics: "Shopping", gadget: "Shopping", chroma: "Shopping", vijaysales: "Shopping",
  relianceDigital: "Shopping", decathlon: "Shopping", lifestyle: "Shopping", pantaloons: "Shopping",
  zara: "Shopping", hnm: "Shopping", ikea: "Shopping", toiletries: "Shopping", soap: "Shopping", shampoo: "Shopping",
  toothpaste: "Shopping",

  // ---------------- Utilities ----------------
  utilities: "Utilities", electricity: "Utilities", power: "Utilities", water: "Utilities",
  pipedgas: "Utilities", internet: "Utilities", broadband: "Utilities",
  wifi: "Utilities", mobile: "Utilities", recharge: "Utilities", airtel: "Utilities",
  jio: "Utilities", bsnl: "Utilities", vodafone: "Utilities", idea: "Utilities",
  bill: "Utilities", postpaid: "Utilities", prepaid: "Utilities", dth: "Utilities",
  tatasky: "Utilities", dishTV: "Utilities", sunDirect: "Utilities",

  // ---------------- Healthcare ----------------
  healthcare: "Healthcare", health: "Healthcare", medicine: "Healthcare", pharmacy: "Healthcare",
  apollo: "Healthcare", medplus: "Healthcare", pharmeasy: "Healthcare", netmeds: "Healthcare",
  practo: "Healthcare", hospital: "Healthcare",
  doctor: "Healthcare", clinic: "Healthcare", lab: "Healthcare", test: "Healthcare",
  diagnostic: "Healthcare", surgery: "Healthcare", vaccination: "Healthcare", insuranceclaim: "Healthcare",

  // ---------------- Housing ----------------
  rent: "Housing", maintenance: "Housing", apartment: "Housing", society: "Housing",
  flat: "Housing", repair: "Housing", renovation: "Housing", furnishing: "Housing",
  cleaning: "Housing", pestcontrol: "Housing", homeLoan: "Housing",

  // ---------------- Education ----------------
  school: "Education", tuition: "Education", college: "Education", university: "Education",
  course: "Education", onlinecourse: "Education", udemy: "Education", coursera: "Education",
  edx: "Education", skillshare: "Education", byjus: "Education", vedantu: "Education",
  whitehatjr: "Education", books: "Education", stationery: "Education", exam: "Education",
  coaching: "Education", training: "Education",

  // ---------------- Insurance ----------------
  insurance: "Insurance", lifeInsurance: "Insurance", healthInsurance: "Insurance",
  term: "Insurance", carInsurance: "Insurance", motorInsurance: "Insurance",
  policybazaar: "Insurance", renewal: "Insurance", premium: "Insurance",

  // ---------------- Investment ----------------
  investment: "Investment", invest: "Investment", stocks: "Investment", shares: "Investment",
  mutualfund: "Investment", sip: "Investment", gold: "Investment", etf: "Investment",
  fd: "Investment", rd: "Investment", bonds: "Investment", crypto: "Investment", bitcoin: "Investment",
  zerodha: "Investment", groww: "Investment", upstox: "Investment", icicidirect: "Investment",

  // ---------------- Loans ----------------
  loan: "Loans", emi: "Loans", creditcard: "Loans", hdfcbank: "Loans", sbi: "Loans", icici: "Loans",
  axis: "Loans", kotak: "Loans", idfc: "Loans", repayment: "Loans", overdraft: "Loans",
  personalLoan: "Loans", homeloan: "Loans", carloan: "Loans", vehicleloan: "Loans",

  // ---------------- Grooming ----------------
  grooming: "Grooming", haircut: "Grooming", salon: "Grooming", spa: "Grooming",
  beauty: "Grooming", cosmetics: "Grooming", parlour: "Grooming", makeup: "Grooming",

  // ---------------- Taxes ----------------
  tax: "Taxes", gst: "Taxes", incometax: "Taxes", tdS: "Taxes", penalty: "Taxes",
  advanceTax: "Taxes", propertyTax: "Taxes",

  // Gifts (includes Donations)
  gift: "Gifts", gifts: "Gifts", birthday: "Gifts", wedding: "Gifts", anniversary: "Gifts",
  present: "Gifts", donation: "Gifts", donations: "Gifts", charity: "Gifts", temple: "Gifts", church: "Gifts", mosque: "Gifts",
  ngo: "Gifts", relief: "Gifts", help: "Gifts",

  // ---------------- Pet Care ----------------
  pet: "Pet Care", dog: "Pet Care", cat: "Pet Care", vet: "Pet Care", pedigree: "Pet Care",
  petfood: "Pet Care", groomingpet: "Pet Care", vaccinationpet: "Pet Care",

  // ---------------- Other ----------------
  other: "Other", misc: "Other", miscellaneous: "Other", general: "Other", unknown: "Other"
};


function escapeRegex(s: string) {
	return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasWord(lower: string, kw: string) {
	const pattern = new RegExp(`\\b${escapeRegex(kw.toLowerCase())}\\b`);
	return pattern.test(lower);
}

export function parseExpenseInput(input: string): { amount?: number; category?: ExpenseCategory | string; note?: string } {
	const text = input.trim();
	if (!text) return {};
	const numMatch = text.match(/(?<!\w)(\d+(?:\.\d+)?)(?!\w)/);
	const amount = numMatch ? parseFloat(numMatch[1]) : undefined;
	const lower = text.toLowerCase();
	let category: ExpenseCategory | string | undefined;
	for (const [kw, cat] of Object.entries(keywordToCategory)) {
		if (hasWord(lower, kw)) { category = cat; break; }
	}
	const note = text.replace(numMatch?.[0] || "", "").trim();
	return { amount, category, note };
}

export function parseMultipleExpenses(input: string): Array<{ raw: string; amount?: number; category?: ExpenseCategory | string; note?: string }> {
	const parts = input.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
	return parts.map(raw => ({ raw, ...parseExpenseInput(raw) }));
}

export function suggestCategory(input: string, memory: Record<string, string>): string | undefined {
	const lower = input.toLowerCase();
	// Rules-first
	for (const [kw, cat] of Object.entries(keywordToCategory)) {
		if (hasWord(lower, kw)) return cat as string;
	}
	// Then local memory mapping (optional; currently not used)
	for (const [kw, cat] of Object.entries(memory || {})) {
		if (hasWord(lower, kw)) return cat;
	}
	return undefined; // AI (Groq) would come after this
}

export { keywordToCategory };

