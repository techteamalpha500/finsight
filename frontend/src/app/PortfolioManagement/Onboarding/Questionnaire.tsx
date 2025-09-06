"use client";
import React, { useState } from "react";
import QuestionCard from "../components/QuestionCard";
import { questions } from "../domain/questionnaire";
import ProgressBar from "../components/ProgressBar";
import { buildPlan, QuestionnaireAnswers } from "../domain/allocationEngine";
import { useRouter } from "next/navigation";
import { useApp } from "../../store";
import { Button } from "../../components/Button";
import { Card, CardContent } from "../../components/Card";
import { Target, Plus, ExternalLink, ArrowLeft, ArrowRight, Check } from "lucide-react";

export default function Questionnaire() {
	const router = useRouter();
	const { questionnaire, setQuestionAnswer, setPlan, activePortfolioId } = useApp() as any;
	const [step, setStep] = useState(0);
	const [localPlan, setLocalPlan] = useState<any | null>(null);
	const [userGoals, setUserGoals] = useState<any[]>([]);

	const handleAnswer = (key: string, value: string | string[] | number) => {
		setQuestionAnswer(key, value);
	};

	// Load user goals for allocation engine
	const loadGoals = async () => {
		if (!activePortfolioId) return;
		try {
			const res = await fetch(`/api/portfolio/goals?portfolioId=${activePortfolioId}`);
			const data = await res.json();
			const goals = (data?.goals || []).map((it: any) => ({ 
				id: (it.goal?.id) || (it.sk || '').split('#').pop(), 
				...it.goal 
			}));
			setUserGoals(goals);
		} catch (e) {
			console.error('Failed to load goals:', e);
			setUserGoals([]);
		}
	};

	// Load goals when component mounts or portfolio changes
	React.useEffect(() => {
		loadGoals();
	}, [activePortfolioId]);

	const validateAnswers = (): QuestionnaireAnswers | null => {
		try {
			// Convert questionnaire answers to the expected format
			const answers: QuestionnaireAnswers = {
				// Demographics & Time Horizon
				age: questionnaire.age as string,
				investmentHorizon: questionnaire.investmentHorizon as string,
				
				// Financial Situation
				annualIncome: questionnaire.annualIncome as string,
				investmentAmount: Number(questionnaire.investmentAmount) || 100000,
				emergencyFundMonths: questionnaire.emergencyFundMonths as string,
				dependents: questionnaire.dependents as string,
				
				// Risk Tolerance
				volatilityComfort: questionnaire.volatilityComfort as string,
				maxAcceptableLoss: questionnaire.maxAcceptableLoss as string,
				investmentKnowledge: questionnaire.investmentKnowledge as string,
				
				// 🎯 NEW: Goals & Objectives (from Goals page)
				goals: userGoals.filter(g => g.isActive),
				
				// Additional Context
				hasInsurance: questionnaire.hasInsurance === "Yes",
				avoidAssets: Array.isArray(questionnaire.avoidAssets) ? questionnaire.avoidAssets : []
			};

						// Validate required fields (primaryGoal no longer required - goals come from Goals page)
			const requiredFields = [
				'age', 'investmentHorizon', 'annualIncome', 'investmentAmount',
				'emergencyFundMonths', 'dependents', 'volatilityComfort',
				'maxAcceptableLoss', 'investmentKnowledge', 'hasInsurance'
			];

			for (const field of requiredFields) {
				const value = answers[field as keyof QuestionnaireAnswers];
				if (value === undefined || value === null || value === "") {
					console.error(`Missing required field: ${field}`);
					return null;
				}
			}

			// Validate investment amount
			if (answers.investmentAmount <= 0) {
				console.error('Investment amount must be greater than 0');
				return null;
			}

			return answers;
		} catch (error) {
			console.error("Error validating answers:", error);
			return null;
		}
	};

	const nextStep = async () => {
		if (step === questions.length - 1) {
			const validatedAnswers = validateAnswers();
			if (!validatedAnswers) {
				alert("Please complete all required questions before submitting.");
				return;
			}

			try {
				const allocation = buildPlan(validatedAnswers);
				setLocalPlan(allocation);
				setPlan(allocation);
				
				// Create portfolio if needed
				let pid = (useApp.getState() as any).activePortfolioId as string | undefined;
				if (!pid) {
					const created = await (await fetch('/api/portfolio', { 
						method: 'POST', 
						headers: { 'Content-Type': 'application/json' }, 
						body: JSON.stringify({ name: 'My Portfolio' }) 
					})).json();
					pid = created?.portfolioId;
					if (pid) (useApp.getState() as any).setActivePortfolio(pid);
				}
				
				router.push("/PortfolioManagement/Plan");
			} catch (error) {
				console.error("Error building plan:", error);
				alert("Error generating allocation plan. Please try again.");
			}
		} else {
			setStep(s => Math.min(questions.length - 1, s + 1));
		}
	};

	const prevStep = () => setStep(s => Math.max(0, s - 1));

	const isCurrentQuestionValid = () => {
		const currentQuestion = questions[step];
		const answer = questionnaire[currentQuestion.key];
		
		if (currentQuestion.optional) return true;
		if (currentQuestion.key === 'avoidAssets') return true; // Optional multi-select
		if ((currentQuestion as any).isGoalsPage) return true; // Goals page is always valid (can proceed with or without goals)
		
		return answer !== undefined && answer !== null && answer !== "";
	};

	const currentQuestion = questions[step];
	const isGoalsQuestion = (currentQuestion as any).isGoalsPage;

	return (
		<div className="mx-auto max-w-2xl">
			<ProgressBar current={step + 1} total={questions.length} />
			<>
				{isGoalsQuestion ? (
					<Card>
						<CardContent className="p-6">
							<div className="flex items-center gap-3 mb-4">
								<Target className="h-6 w-6 text-blue-600" />
								<h3 className="text-lg font-semibold">{currentQuestion.text}</h3>
							</div>
							<p className="text-sm text-muted-foreground mb-4">{currentQuestion.helperText}</p>
							
							{userGoals.length > 0 ? (
								<div className="space-y-3">
									<div className="text-sm font-medium text-green-700">
										✅ {userGoals.length} goal{userGoals.length !== 1 ? 's' : ''} configured
									</div>
									<div className="grid gap-2">
										{userGoals.slice(0, 3).map((goal: any) => (
											<div key={goal.id} className="flex items-center justify-between p-2 bg-green-50 rounded border">
												<span className="text-sm">{goal.name}</span>
												<span className="text-xs text-muted-foreground">₹{(goal.targetAmount/100000).toFixed(1)}L</span>
											</div>
										))}
										{userGoals.length > 3 && (
											<div className="text-xs text-muted-foreground">...and {userGoals.length - 3} more</div>
										)}
									</div>
									<Button 
										variant="outline" 
										size="sm"
										leftIcon={<ExternalLink className="h-4 w-4" />}
										onClick={() => window.open('/PortfolioManagement/Goals', '_blank')}
									>
										Manage Goals
									</Button>
								</div>
							) : (
								<div className="space-y-3">
									<div className="text-sm text-amber-700">
										⚠️ No goals configured yet
									</div>
									<p className="text-xs text-muted-foreground">
										Setting specific goals helps us create a more personalized allocation strategy.
									</p>
									<Button 
										leftIcon={<Plus className="h-4 w-4" />}
										onClick={() => window.open('/PortfolioManagement/Goals', '_blank')}
									>
										Add Your Goals
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				) : (
					<QuestionCard
						questionText={currentQuestion.text}
						options={currentQuestion.options}
						selected={questionnaire[currentQuestion.key]}
						onChange={(value) => handleAnswer(currentQuestion.key, value)}
						multiSelect={currentQuestion.key === 'avoidAssets'}
						helperText={currentQuestion.helperText}
						maxSelect={currentQuestion.maxSelect}
						type={currentQuestion.type}
					/>
				)}
				
				<div className="flex justify-between w-full mt-8 gap-3">
					<Button 
						variant="outline" 
						size="sm" 
						leftIcon={<ArrowLeft className="h-4 w-4" />}
						onClick={prevStep} 
						disabled={step === 0}
					>
						Back
					</Button>
					<Button 
						variant="outline"
						size="sm" 
						leftIcon={step === questions.length - 1 ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
						onClick={nextStep} 
						disabled={!isCurrentQuestionValid()}
					>
						{step === questions.length - 1 ? "Submit" : "Next"}
					</Button>
				</div>
			</>
		</div>
	);
}