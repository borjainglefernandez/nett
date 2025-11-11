import React, { ReactElement } from "react";
import { render, RenderOptions } from "@testing-library/react";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import Context from "./Context";
import theme from "./theme";

// Mock the Context provider
const MockContextProvider: React.FC<{ children: React.ReactNode }> = ({
	children,
}) => {
	const mockDispatch =
		typeof jest !== "undefined" && typeof jest.fn === "function"
			? jest.fn()
			: () => {};

	const mockContextValue = {
		linkToken: "test-link-token",
		error: {
			error_message: "",
			error_code: "",
			error_type: "",
		},
		accountsNeedRefresh: false,
		redirectLoading: false,
		dispatch: mockDispatch,
	};

	return (
		<Context.Provider value={mockContextValue}>{children}</Context.Provider>
	);
};

// Custom render function that includes providers
const customRender = (
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper">
) => {
	const AllTheProviders: React.FC<{ children: React.ReactNode }> = ({
		children,
	}) => {
		return (
			<ThemeProvider theme={theme}>
				<CssBaseline />
				<MockContextProvider>{children}</MockContextProvider>
			</ThemeProvider>
		);
	};

	return render(ui, { wrapper: AllTheProviders, ...options });
};

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Common test utilities
export const createMockAccount = (overrides = {}) => ({
	id: "test-account-1",
	name: "Test Checking Account-0000",
	account_type: "depository",
	account_subtype: "checking",
	balance: 1000.0,
	institution_name: "Chase",
	last_updated: new Date("2024-01-01T00:00:00Z"),
	transaction_count: 5,
	logo: null,
	item_id: "test-item-1",
	institution_id: "ins_56",
	active: true,
	...overrides,
});

export const createMockTransaction = (overrides = {}) => ({
	id: "test-txn-1",
	account_id: "test-account-1",
	amount: -50.0,
	date: new Date("2024-01-01"),
	date_time: new Date("2024-01-01T12:00:00Z"),
	name: "Test Transaction",
	merchant_name: "Test Merchant",
	category: ["Food"],
	subcategory: ["Restaurants"],
	account_name: "Test Checking Account-0000",
	...overrides,
});

export const createMockItem = (overrides = {}) => ({
	id: "test-item-1",
	access_token: "test-access-token",
	institution_id: "ins_56",
	...overrides,
});

// Mock API responses
export const mockApiResponses = {
	accounts: [createMockAccount()],
	transactions: [createMockTransaction()],
	items: [createMockItem()],
	linkToken: {
		link_token: "test-link-token",
		expiration: "2024-01-01T00:00:00Z",
		request_id: "test-request-id",
	},
	itemCreation: {
		message: "Successfully created 1 accounts",
		deleted_accounts: 0,
		item_id: "test-item-1",
	},
	itemDeletion: {
		message: "Successfully removed bank connection and 1 accounts",
		deleted_accounts: 1,
		item_id: "test-item-1",
	},
};
