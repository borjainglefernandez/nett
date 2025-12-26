import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import OnboardingWizard from "../OnboardingWizard";
import * as onboardingUtils from "../../../Utils/onboardingUtils";

// Mock the step components
jest.mock("../OnboardingStepCategories", () => {
	return function MockOnboardingStepCategories({
		onComplete,
		onNext,
	}: {
		onComplete: (complete: boolean) => void;
		onNext: () => void;
	}) {
		return (
			<div data-testid='step-categories'>
				<button onClick={() => onComplete(true)}>Mark Complete</button>
				<button onClick={onNext}>Next</button>
			</div>
		);
	};
});

jest.mock("../OnboardingStepBudgets", () => {
	return function MockOnboardingStepBudgets({
		onNext,
		onSkip,
	}: {
		onNext: () => void;
		onSkip: () => void;
	}) {
		return (
			<div data-testid='step-budgets'>
				<button onClick={onNext}>Next</button>
				<button onClick={onSkip}>Skip</button>
			</div>
		);
	};
});

jest.mock("../OnboardingStepAccounts", () => {
	return function MockOnboardingStepAccounts({
		onComplete,
	}: {
		onComplete: () => void;
	}) {
		return (
			<div data-testid='step-accounts'>
				<button onClick={onComplete}>Complete</button>
			</div>
		);
	};
});

// Mock the onboarding utils
jest.mock("../../../Utils/onboardingUtils", () => ({
	markOnboardingComplete: jest.fn(),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
	useNavigate: () => mockNavigate,
	BrowserRouter: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
}));

describe("OnboardingWizard", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders the wizard with step 1 (categories) initially", () => {
		render(<OnboardingWizard />);

		expect(screen.getByText("Welcome to Nett")).toBeInTheDocument();
		expect(screen.getByText("Set Up Categories")).toBeInTheDocument();
		expect(screen.getByTestId("step-categories")).toBeInTheDocument();
	});

	it("disables Next button when categories are not complete", () => {
		render(<OnboardingWizard />);

		const nextButton = screen.getByText("Next");
		// Button should be disabled initially
		expect(nextButton).toBeDisabled();
	});

	it("enables Next button when categories are complete", async () => {
		render(<OnboardingWizard />);

		const nextButton = screen.getByText("Next");
		expect(nextButton).toBeDisabled();

		const markCompleteButton = screen.getByText("Mark Complete");
		markCompleteButton.click();

		await waitFor(
			() => {
				const enabledNextButton = screen.getByText("Next");
				expect(enabledNextButton).not.toBeDisabled();
			},
			{ timeout: 3000 }
		);
	});

	it("navigates to next step when Next is clicked", async () => {
		render(<OnboardingWizard />);

		// Mark categories as complete
		const markCompleteButton = screen.getByText("Mark Complete");
		markCompleteButton.click();

		await waitFor(
			() => {
				const nextButton = screen.getByText("Next");
				expect(nextButton).not.toBeDisabled();
			},
			{ timeout: 3000 }
		);

		const nextButton = screen.getByText("Next");
		nextButton.click();

		await waitFor(
			() => {
				expect(screen.getByTestId("step-budgets")).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	it("navigates back to previous step when Back is clicked", async () => {
		render(<OnboardingWizard />);

		// Go to step 2
		const markCompleteButton = screen.getByText("Mark Complete");
		markCompleteButton.click();

		await waitFor(
			() => {
				const nextButton = screen.getByText("Next");
				expect(nextButton).not.toBeDisabled();
			},
			{ timeout: 3000 }
		);

		const nextButton = screen.getByText("Next");
		nextButton.click();

		await waitFor(
			() => {
				expect(screen.getByTestId("step-budgets")).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Go back
		const backButton = screen.getByText("Back");
		backButton.click();

		await waitFor(
			() => {
				expect(screen.getByTestId("step-categories")).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);
	});

	it("marks onboarding complete and navigates to main on final step", async () => {
		render(<OnboardingWizard />);

		// Navigate through all steps
		const markCompleteButton = screen.getByText("Mark Complete");
		markCompleteButton.click();

		await waitFor(
			() => {
				const nextButton = screen.getByText("Next");
				expect(nextButton).not.toBeDisabled();
			},
			{ timeout: 3000 }
		);

		// Step 1 -> Step 2
		const nextButton1 = screen.getByText("Next");
		nextButton1.click();

		await waitFor(
			() => {
				expect(screen.getByTestId("step-budgets")).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Step 2 -> Step 3
		const nextButton2 = screen.getByText("Next");
		nextButton2.click();

		await waitFor(
			() => {
				expect(screen.getByTestId("step-accounts")).toBeInTheDocument();
			},
			{ timeout: 3000 }
		);

		// Complete onboarding
		const completeButton = screen.getByText("Complete");
		completeButton.click();

		await waitFor(
			() => {
				expect(onboardingUtils.markOnboardingComplete).toHaveBeenCalled();
				expect(mockNavigate).toHaveBeenCalledWith("/");
			},
			{ timeout: 3000 }
		);
	});
});
