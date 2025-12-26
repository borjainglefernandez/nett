import React, { useState } from "react";
import {
	Box,
	Stepper,
	Step,
	StepLabel,
	Button,
	Typography,
	Paper,
	Container,
} from "@mui/material";
import OnboardingStepCategories from "./OnboardingStepCategories";
import OnboardingStepBudgets from "./OnboardingStepBudgets";
import OnboardingStepAccounts from "./OnboardingStepAccounts";
import { useNavigate } from "react-router-dom";
import { MAIN_PAGE_ROUTE } from "../../Constants/RouteConstants";
import { markOnboardingComplete } from "../../Utils/onboardingUtils";

const steps = [
	"Set Up Categories",
	"Create Budgets",
	"Connect Your First Account",
];

const OnboardingWizard: React.FC = () => {
	const [activeStep, setActiveStep] = useState(0);
	const [categoriesComplete, setCategoriesComplete] = useState(false);
	const navigate = useNavigate();

	const handleNext = () => {
		if (activeStep === steps.length - 1) {
			// Final step - mark onboarding complete and navigate to main
			markOnboardingComplete();
			navigate(MAIN_PAGE_ROUTE);
		} else {
			setActiveStep((prevActiveStep) => prevActiveStep + 1);
		}
	};

	const handleBack = () => {
		setActiveStep((prevActiveStep) => prevActiveStep - 1);
	};

	const handleSkip = () => {
		if (activeStep === steps.length - 1) {
			// Can't skip final step
			return;
		}
		// Skip to next step
		setActiveStep((prevActiveStep) => prevActiveStep + 1);
	};

	const handleCategoriesComplete = (complete: boolean) => {
		setCategoriesComplete(complete);
	};

	const renderStepContent = (step: number) => {
		switch (step) {
			case 0:
				return (
					<OnboardingStepCategories
						onComplete={handleCategoriesComplete}
						onNext={handleNext}
					/>
				);
			case 1:
				return (
					<OnboardingStepBudgets onNext={handleNext} onSkip={handleSkip} />
				);
			case 2:
				return <OnboardingStepAccounts onComplete={handleNext} />;
			default:
				return null;
		}
	};

	return (
		<Container maxWidth='md' sx={{ py: 4 }}>
			<Paper elevation={3} sx={{ p: 4 }}>
				<Typography variant='h4' component='h1' gutterBottom align='center'>
					Welcome to Nett
				</Typography>
				<Typography
					variant='body1'
					color='text.secondary'
					align='center'
					sx={{ mb: 4 }}
				>
					Let's get you set up in just a few steps
				</Typography>

				<Stepper activeStep={activeStep} sx={{ mb: 4 }}>
					{steps.map((label) => (
						<Step key={label}>
							<StepLabel>{label}</StepLabel>
						</Step>
					))}
				</Stepper>

				<Box sx={{ minHeight: "400px", mb: 4 }}>
					{renderStepContent(activeStep)}
				</Box>

				<Box sx={{ display: "flex", justifyContent: "space-between" }}>
					<Button
						disabled={activeStep === 0}
						onClick={handleBack}
						sx={{ mr: 1 }}
					>
						Back
					</Button>
					<Box sx={{ flex: "1 1 auto" }} />
					{activeStep === 0 && (
						<Button
							variant='contained'
							onClick={handleNext}
							disabled={!categoriesComplete}
						>
							Next
						</Button>
					)}
				</Box>
			</Paper>
		</Container>
	);
};

export default OnboardingWizard;
