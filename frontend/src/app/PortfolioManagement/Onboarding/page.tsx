import Questionnaire from "./Questionnaire";

export default function PortfolioManagementOnboardingPage() {
	return (
		<div className="max-w-full space-y-4 pl-2">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div className="flex items-center gap-2">
					<div className="text-sm text-muted-foreground">Onboarding Questionnaire</div>
				</div>
			</div>
			<Questionnaire />
		</div>
	);
}
