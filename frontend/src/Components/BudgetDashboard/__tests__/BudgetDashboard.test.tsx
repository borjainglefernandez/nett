import { render, screen, waitFor } from "@testing-library/react";
import BudgetDashboard from "../BudgetDashboard";

type GetMock = jest.Mock<Promise<any>, [string]>;

const mockGet: GetMock = jest.fn();

jest.mock("../../../hooks/apiService", () => ({
	__esModule: true,
	default: () => ({
		get: mockGet,
	}),
}));

jest.mock("../../../hooks/appAlert", () => ({
	__esModule: true,
	default: () => ({
		trigger: jest.fn(),
		close: jest.fn(),
		open: false,
		message: "",
		severity: "info" as const,
	}),
}));

describe("BudgetDashboard", () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it("shows empty state when no data is returned", async () => {
		mockGet
			.mockResolvedValueOnce([]) // budget periods
			.mockResolvedValueOnce([]); // total spent periods

		render(<BudgetDashboard />);

		await waitFor(() => {
			expect(
				screen.getByText("No budget data available for the selected frequency.")
			).toBeInTheDocument();
		});
		expect(mockGet).toHaveBeenCalledWith(
			expect.stringContaining("/api/budget_period?frequency=")
		);
	});

	it("renders budget information when data is returned", async () => {
		const budgetPeriods = [
			{
				category_name: "Food",
				subcategory_name: "Groceries",
				start_date: "2024-01-01",
				end_date: "2024-01-31",
				limit_amount: "200",
				spent_amount: 150,
			},
		];

		const totalSpentPeriods = [
			{
				start_date: "2024-01-01",
				end_date: "2024-01-31",
				spent_amount: "150.00",
				income_amount: "250.00",
			},
		];

		mockGet.mockImplementation((url: string) => {
			if (url.startsWith("/api/budget_period?")) {
				return Promise.resolve(budgetPeriods);
			}
			if (url.startsWith("/api/budget_period/total?")) {
				return Promise.resolve(totalSpentPeriods);
			}
			return Promise.resolve([]);
		});

		render(<BudgetDashboard />);

		await waitFor(() => {
			expect(screen.getByText("Income")).toBeInTheDocument();
		});

		expect(screen.getByText(/Food \(Groceries\)/)).toBeInTheDocument();
		expect(mockGet).toHaveBeenCalledTimes(2);
	});
});
