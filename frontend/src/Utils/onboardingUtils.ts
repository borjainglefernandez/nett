import { Category } from "../Models/Category";

const ONBOARDING_COMPLETE_KEY = "nett_onboarding_complete";
const MIN_CATEGORIES_REQUIRED = 3;

/**
 * Check if the user has completed onboarding
 * @returns boolean indicating if onboarding is complete
 */
export const checkOnboardingStatus = (): boolean => {
	const status = localStorage.getItem(ONBOARDING_COMPLETE_KEY);
	return status === "true";
};

/**
 * Mark onboarding as complete
 */
export const markOnboardingComplete = (): void => {
	localStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
};

/**
 * Reset onboarding status (useful for testing or allowing users to retake onboarding)
 */
export const resetOnboardingStatus = (): void => {
	localStorage.removeItem(ONBOARDING_COMPLETE_KEY);
};

/**
 * Check if user has sufficient categories set up
 * @param categories - Array of categories to check
 * @returns boolean indicating if user has at least MIN_CATEGORIES_REQUIRED categories
 */
export const hasSufficientCategories = (categories: Category[]): boolean => {
	return categories.length >= MIN_CATEGORIES_REQUIRED;
};

/**
 * Determine if onboarding should be shown
 * @param categories - Array of categories to check
 * @returns boolean indicating if onboarding should be displayed
 */
export const shouldShowOnboarding = (categories: Category[]): boolean => {
	// If onboarding is already complete, don't show it
	if (checkOnboardingStatus()) {
		return false;
	}

	// If user doesn't have sufficient categories, show onboarding
	return !hasSufficientCategories(categories);
};

/**
 * Check if user has any categories at all
 * @param categories - Array of categories to check
 * @returns boolean indicating if user has at least one category
 */
export const hasCategories = (categories: Category[]): boolean => {
	return categories.length > 0;
};
