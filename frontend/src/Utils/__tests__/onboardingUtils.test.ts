import {
	checkOnboardingStatus,
	markOnboardingComplete,
	resetOnboardingStatus,
	hasSufficientCategories,
	shouldShowOnboarding,
	hasCategories,
} from "../onboardingUtils";
import { Category } from "../../Models/Category";

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};

	return {
		getItem: (key: string) => store[key] || null,
		setItem: (key: string, value: string) => {
			store[key] = value.toString();
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
	};
})();

Object.defineProperty(window, "localStorage", {
	value: localStorageMock,
});

describe("onboardingUtils", () => {
	beforeEach(() => {
		localStorageMock.clear();
	});

	describe("checkOnboardingStatus", () => {
		it("returns false when onboarding is not complete", () => {
			expect(checkOnboardingStatus()).toBe(false);
		});

		it("returns true when onboarding is complete", () => {
			localStorageMock.setItem("nett_onboarding_complete", "true");
			expect(checkOnboardingStatus()).toBe(true);
		});

		it("returns false when onboarding status is set to false", () => {
			localStorageMock.setItem("nett_onboarding_complete", "false");
			expect(checkOnboardingStatus()).toBe(false);
		});
	});

	describe("markOnboardingComplete", () => {
		it("marks onboarding as complete in localStorage", () => {
			markOnboardingComplete();
			expect(localStorageMock.getItem("nett_onboarding_complete")).toBe("true");
		});
	});

	describe("resetOnboardingStatus", () => {
		it("removes onboarding status from localStorage", () => {
			localStorageMock.setItem("nett_onboarding_complete", "true");
			resetOnboardingStatus();
			expect(localStorageMock.getItem("nett_onboarding_complete")).toBeNull();
		});
	});

	describe("hasSufficientCategories", () => {
		it("returns false when categories array is empty", () => {
			expect(hasSufficientCategories([])).toBe(false);
		});

		it("returns false when categories count is less than 3", () => {
			const categories: Category[] = [
				{ id: "1", name: "Food", subcategories: [] },
				{ id: "2", name: "Transport", subcategories: [] },
			];
			expect(hasSufficientCategories(categories)).toBe(false);
		});

		it("returns true when categories count is exactly 3", () => {
			const categories: Category[] = [
				{ id: "1", name: "Food", subcategories: [] },
				{ id: "2", name: "Transport", subcategories: [] },
				{ id: "3", name: "Entertainment", subcategories: [] },
			];
			expect(hasSufficientCategories(categories)).toBe(true);
		});

		it("returns true when categories count is greater than 3", () => {
			const categories: Category[] = [
				{ id: "1", name: "Food", subcategories: [] },
				{ id: "2", name: "Transport", subcategories: [] },
				{ id: "3", name: "Entertainment", subcategories: [] },
				{ id: "4", name: "Bills", subcategories: [] },
			];
			expect(hasSufficientCategories(categories)).toBe(true);
		});
	});

	describe("hasCategories", () => {
		it("returns false when categories array is empty", () => {
			expect(hasCategories([])).toBe(false);
		});

		it("returns true when categories array has at least one category", () => {
			const categories: Category[] = [
				{ id: "1", name: "Food", subcategories: [] },
			];
			expect(hasCategories(categories)).toBe(true);
		});
	});

	describe("shouldShowOnboarding", () => {
		it("returns false when onboarding is already complete", () => {
			localStorageMock.setItem("nett_onboarding_complete", "true");
			const categories: Category[] = [];
			expect(shouldShowOnboarding(categories)).toBe(false);
		});

		it("returns true when onboarding is not complete and categories are insufficient", () => {
			const categories: Category[] = [
				{ id: "1", name: "Food", subcategories: [] },
			];
			expect(shouldShowOnboarding(categories)).toBe(true);
		});

		it("returns false when onboarding is not complete but categories are sufficient", () => {
			const categories: Category[] = [
				{ id: "1", name: "Food", subcategories: [] },
				{ id: "2", name: "Transport", subcategories: [] },
				{ id: "3", name: "Entertainment", subcategories: [] },
			];
			expect(shouldShowOnboarding(categories)).toBe(false);
		});

		it("returns true when no categories exist and onboarding is not complete", () => {
			expect(shouldShowOnboarding([])).toBe(true);
		});
	});
});

