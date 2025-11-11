import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransactionTable from "../TransactionTable";

const mockNavigate = jest.fn();
const mockGet = jest.fn();
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
	useNavigate: () => mockNavigate,
}));

jest.mock("../../../hooks/appAlert", () => ({
	__esModule: true,
	default: () => mockAlert,
}));

jest.mock("../../../hooks/apiService", () => ({
	__esModule: true,
	default: () => ({
		get: mockGet,
		put: mockPut,
		del: mockDelete,
	}),
}));

jest.mock("@mui/material/Select", () => ({
	__esModule: true,
	default: ({ value, onChange, children }: any) => (
		<select
			value={value}
			onChange={(event) =>
				onChange({ target: { value: event.target.value } } as any)
			}
		>
			{children}
		</select>
	),
}));

jest.mock("@mui/material/MenuItem", () => ({
	__esModule: true,
	default: ({ value, children }: any) => (
		<option value={value}>{children}</option>
	),
}));

jest.mock("@mui/x-data-grid", () => {
	const React = require("react");

	const DataGrid = ({ rows, columns, onRowSelectionModelChange }: any) => (
		<div>
			{rows.map((row: any) => (
				<div key={row.id} data-testid={`row-${row.id}`}>
					{columns.map((column: any) => {
						if (column.field === "actions" && column.getActions) {
							const actions = column.getActions({ row });
							return (
								<div
									key={column.field}
									data-testid={`cell-${row.id}-${column.field}`}
								>
									{actions.map((Action: any, idx: number) => (
										<span key={idx}>{Action}</span>
									))}
								</div>
							);
						}

						const rendered = column.renderCell
							? column.renderCell({
									row,
									value: row[column.field],
									id: row.id,
									field: column.field,
							  })
							: row[column.field];

						return (
							<div
								key={column.field}
								data-testid={`cell-${row.id}-${column.field}`}
							>
								{rendered}
							</div>
						);
					})}
					<button
						type='button'
						data-testid={`select-row-${row.id}`}
						onClick={() => onRowSelectionModelChange([row.id])}
					>
						select-row
					</button>
				</div>
			))}
		</div>
	);

	const GridActionsCellItem = ({ label, onClick }: any) => (
		<button type='button' onClick={onClick}>
			{label}
		</button>
	);

	return { DataGrid, GridActionsCellItem };
});

const categoriesResponse = [
	{
		id: "cat-1",
		name: "Food",
		subcategories: [
			{
				id: "sub-1",
				name: "Dining",
				description: "Dining out",
				category_id: "cat-1",
			},
			{
				id: "sub-2",
				name: "Groceries",
				description: "Grocery shopping",
				category_id: "cat-1",
			},
		],
	},
	{
		id: "cat-2",
		name: "Travel",
		subcategories: [
			{
				id: "sub-3",
				name: "Airfare",
				description: "Airfare",
				category_id: "cat-2",
			},
		],
	},
];

const buildTransactions = () => [
	{
		id: "txn-1",
		name: "Coffee Shop",
		amount: 4.5,
		category: categoriesResponse[0],
		subcategory: categoriesResponse[0].subcategories[0],
		date: "2024-01-05T10:00:00Z",
		account_name: "Checking",
		account_id: "acc-1",
		logo_url: "https://logo.test/coffee.png",
	},
];

const renderComponent = (transactions = buildTransactions()) => {
	mockGet.mockImplementation((url: string) => {
		if (url === "/api/category") {
			return Promise.resolve(categoriesResponse);
		}
		return Promise.resolve([]);
	});
	mockPut.mockResolvedValue({});
	mockDelete.mockResolvedValue({});
	mockAlert.trigger.mockClear();

	return render(<TransactionTable transactions={transactions as any} />);
};

describe("TransactionTable", () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("shows an empty state when there are no transactions", async () => {
		renderComponent([]);

		await waitFor(() => {
			expect(mockGet).toHaveBeenCalledWith("/api/category");
		});

		expect(screen.getByText("No transactions to display.")).toBeInTheDocument();
	});

	it("updates the category when a new option is selected", async () => {
		const user = userEvent.setup();
		renderComponent();

		const categoryCell = await screen.findByTestId("cell-txn-1-category");
		const categorySelect = within(categoryCell).getByRole("combobox");

		await user.selectOptions(categorySelect, "Travel");

		await waitFor(() => {
			expect(mockPut).toHaveBeenCalledWith(
				"/api/transaction",
				expect.objectContaining({
					id: "txn-1",
					category: categoriesResponse[1],
					subcategory: categoriesResponse[1].subcategories[0],
				})
			);
		});

		expect(mockAlert.trigger).toHaveBeenCalledWith(
			expect.stringContaining("Category changed to Travel"),
			"success"
		);
	});

	it("updates the subcategory when changed", async () => {
		const user = userEvent.setup();
		renderComponent();

		const subcategoryCell = await screen.findByTestId("cell-txn-1-subcategory");
		const subcategorySelect = within(subcategoryCell).getByRole("combobox");

		await screen.findByText("Groceries");

		await user.selectOptions(subcategorySelect, "Groceries");

		await waitFor(() => {
			expect(mockPut).toHaveBeenCalledWith(
				"/api/transaction",
				expect.objectContaining({
					id: "txn-1",
					subcategory: categoriesResponse[0].subcategories[1],
				})
			);
		});

		expect(mockAlert.trigger).toHaveBeenCalledWith(
			expect.stringContaining("Subcategory changed to Groceries"),
			"success"
		);
	});

	it("deletes a selected transaction", async () => {
		const user = userEvent.setup();
		renderComponent();

		const selectRowButton = await screen.findByTestId("select-row-txn-1");
		await user.click(selectRowButton);

		const deleteSelectedButton = await screen.findByRole("button", {
			name: /Delete Selected \(1\)/i,
		});
		await user.click(deleteSelectedButton);

		const confirmButton = await screen.findByRole("button", { name: "Delete" });
		await user.click(confirmButton);

		await waitFor(() => {
			expect(mockDelete).toHaveBeenCalledWith("/api/transaction/txn-1");
		});

		expect(mockAlert.trigger).toHaveBeenCalledWith(
			"1 transaction(s) deleted",
			"success"
		);
		await waitFor(() => {
			expect(screen.queryByTestId("row-txn-1")).not.toBeInTheDocument();
		});
	});

	it("opens a confirmation dialog for single row delete", async () => {
		const user = userEvent.setup();
		renderComponent();

		const actionCell = await screen.findByTestId("cell-txn-1-actions");
		const deleteAction = within(actionCell).getByRole("button", {
			name: "Delete",
		});
		await user.click(deleteAction);

		const confirmButton = await screen.findByRole("button", { name: "Delete" });
		await user.click(confirmButton);

		await waitFor(() => {
			expect(mockDelete).toHaveBeenCalledWith("/api/transaction/txn-1");
		});

		expect(mockAlert.trigger).toHaveBeenCalledWith(
			"Transaction txn-1 deleted",
			"success"
		);
	});
});
