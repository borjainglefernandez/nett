import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BudgetManagement from "../BudgetManagement";
import { BudgetFrequency } from "../../Models/Budget";

const mockNavigate = jest.fn();
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

const mockAlert = {
	trigger: jest.fn(),
	close: jest.fn(),
	open: false,
	message: "",
	severity: "info" as const,
};

jest.mock("react-router-dom", () => ({
	__esModule: true,
	MemoryRouter: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	useNavigate: () => mockNavigate,
}));

jest.mock("../../hooks/appAlert", () => ({
	__esModule: true,
	default: () => mockAlert,
}));

jest.mock("../../hooks/apiService", () => ({
	__esModule: true,
	default: () => ({
		get: mockGet,
		post: mockPost,
		put: mockPut,
		del: mockDelete,
	}),
}));

jest.mock("../../Components/BudgetManagement/BudgetForm", () => ({
	__esModule: true,
	default: ({ budget, onChange, onSubmit, submitLabel, disabled }: any) => (
		<div data-testid={`budget-form-${budget.id || "new"}`}>
			<span>{budget.id || "new"}</span>
			<button
				onClick={() =>
					onChange({
						...budget,
						amount: 250,
						category_id: "cat-1",
						frequency: "Monthly",
					})
				}
			>
				Modify
			</button>
			<button onClick={onSubmit} disabled={disabled}>
				{submitLabel}
			</button>
		</div>
	),
}));

const renderPage = () => render(<BudgetManagement />);

describe("BudgetManagement page", () => {
	const categoriesResponse = [
		{
			id: "cat-1",
			name: "Food",
			subcategories: [
				{
					id: "sub-1",
					name: "Groceries",
					description: "",
					category_id: "cat-1",
				},
			],
		},
	];

	const budgetsResponse = [
		{
			id: "budget-1",
			amount: 100,
			frequency: BudgetFrequency.MONTHLY,
			category_id: "cat-1",
			subcategory_id: "sub-1",
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
		mockNavigate.mockReset();
		mockGet.mockImplementation((url: string) => {
			if (url === "/api/category") {
				return Promise.resolve(categoriesResponse);
			}
			if (url === "/api/budget") {
				return Promise.resolve(budgetsResponse);
			}
			return Promise.resolve([]);
		});
		mockPost.mockResolvedValue({ id: "new-budget" });
		mockPut.mockResolvedValue({});
		mockDelete.mockResolvedValue(true);
	});

	it("fetches categories and budgets on mount", async () => {
		renderPage();

		await waitFor(() => {
			expect(mockGet).toHaveBeenCalledWith("/api/category");
			expect(mockGet).toHaveBeenCalledWith("/api/budget");
		});

		expect(screen.getByText("Budget Management")).toBeInTheDocument();
		expect(screen.getByTestId("budget-form-budget-1")).toBeInTheDocument();
	});

	it("saves modified budgets", async () => {
		renderPage();

		await waitFor(() =>
			expect(screen.getByTestId("budget-form-budget-1")).toBeInTheDocument()
		);

		await userEvent.click(
			screen.getByTestId("budget-form-budget-1").querySelector("button")!
		);

		await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

		await waitFor(() => {
			expect(mockPut).toHaveBeenCalledWith(
				"/api/budget",
				expect.objectContaining({
					id: "budget-1",
					amount: 250,
				})
			);
			expect(mockAlert.trigger).toHaveBeenCalledWith(
				"Budgets updated successfully!",
				"success"
			);
		});
	});

	it("adds a new budget", async () => {
		renderPage();

		await waitFor(() =>
			expect(screen.getByTestId("budget-form-new")).toBeInTheDocument()
		);

		const newForm = screen.getByTestId("budget-form-new");
		const [modifyButton, submitButton] = newForm.querySelectorAll("button");

		await userEvent.click(modifyButton);
		expect(submitButton).not.toBeDisabled();

		await userEvent.click(submitButton);

		await waitFor(() => {
			expect(mockPost).toHaveBeenCalledWith(
				"/api/budget",
				expect.objectContaining({
					amount: 250,
					category_id: "cat-1",
					frequency: BudgetFrequency.MONTHLY,
				})
			);
			expect(mockAlert.trigger).toHaveBeenCalledWith(
				'Budget "Food" created successfully!',
				"success"
			);
		});
	});

	it("deletes an existing budget after confirmation", async () => {
		renderPage();

		await waitFor(() =>
			expect(screen.getByTestId("budget-form-budget-1")).toBeInTheDocument()
		);

		const deleteButton = screen
			.getByTestId("budget-form-budget-1")
			.querySelectorAll("button")[1];

		await userEvent.click(deleteButton);

		const confirmButton = await screen.findByRole("button", { name: "Delete" });
		await userEvent.click(confirmButton);

		await waitFor(() => {
			expect(mockDelete).toHaveBeenCalledWith("/api/budget/budget-1");
			expect(mockAlert.trigger).toHaveBeenCalledWith(
				"Budget deleted",
				"success"
			);
		});
	});
});
