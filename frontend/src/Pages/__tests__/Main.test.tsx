import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react";
import Context from "../../Context";
import Main from "../Main";
import { createMockAccount } from "../../test-utils";

const mockApiService = {
	get: jest.fn(),
	post: jest.fn(),
	del: jest.fn(),
};

const mockAccountListCalls: any[] = [];

jest.mock("../../hooks/apiService", () => ({
	__esModule: true,
	default: () => mockApiService,
}));

jest.mock("../../hooks/appAlert", () => ({
	__esModule: true,
	default: () => ({
		trigger: jest.fn(),
		close: jest.fn(),
		open: false,
		message: "",
		severity: "info" as const,
	}),
}));

jest.mock("../../Components/AccountsList/AccountList", () => ({
	__esModule: true,
	default: (props: any) => {
		mockAccountListCalls.push(props);
		return null;
	},
}));

jest.mock("../../Components/TransactionTable/TransactionTable", () => ({
	__esModule: true,
	default: () => null,
}));

jest.mock("../../Components/BudgetDashboard/BudgetDashboard", () => ({
	__esModule: true,
	default: () => null,
}));

jest.mock("../../Components/CategoryManagement/CategoryCard", () => ({
	__esModule: true,
	default: () => null,
}));

const renderMain = () => {
	const contextValue = {
		linkToken: "",
		error: { error_message: "", error_code: "", error_type: "" },
		accountsNeedRefresh: false,
		redirectLoading: false,
		dispatch: jest.fn(),
	};

	return render(
		<Context.Provider value={contextValue}>
			<Main />
		</Context.Provider>
	);
};

const expectAccountsRendered = async () => {
	await waitFor(() => {
		const hasAccounts = mockAccountListCalls.some(
			(props) => props.accounts && props.accounts.length > 0
		);
		expect(hasAccounts).toBe(true);
	});
};

describe("Main", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockAccountListCalls.length = 0;
		mockApiService.get.mockReset();
		mockApiService.post.mockResolvedValue({ link_token: "token" });
		mockApiService.del.mockResolvedValue({});
	});

	it("calls the accounts endpoint on mount", async () => {
		mockApiService.get.mockImplementation((url: string) => {
			if (url === "/api/item") return Promise.resolve([]);
			if (url === "/api/account") return Promise.resolve([]);
			if (url.startsWith("/api/account/")) return Promise.resolve([]);
			return Promise.resolve([]);
		});

		renderMain();

		await waitFor(() => {
			expect(mockApiService.get).toHaveBeenCalledWith("/api/account");
		});

		expect(
			screen.getByRole("tab", { name: "Account List" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: "Transaction Table" })
		).toBeInTheDocument();
		expect(
			screen.getByRole("tab", { name: "Budget Summary" })
		).toBeInTheDocument();
	});

	it("invokes remove item flow and calls delete endpoint", async () => {
		const accounts = [
			createMockAccount({
				id: "acc-1",
				item_id: "item-1",
				name: "Account 1",
				institution_name: "Test Bank",
			}),
		];

		mockApiService.get.mockImplementation((url: string) => {
			if (url === "/api/item") return Promise.resolve([]);
			if (url === "/api/account") return Promise.resolve(accounts);
			if (url.startsWith("/api/account/")) return Promise.resolve([]);
			return Promise.resolve([]);
		});

		renderMain();

		await expectAccountsRendered();

		const latestCall = mockAccountListCalls[mockAccountListCalls.length - 1];

		await act(async () => {
			latestCall.removeItem("item-1");
		});

		await waitFor(() => {
			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});

		const confirmButton = screen.getByRole("button", {
			name: "Remove Bank Connection",
		});
		await act(async () => {
			confirmButton.click();
		});

		await waitFor(() => {
			expect(mockApiService.del).toHaveBeenCalledWith("/api/item/item-1");
		});
	});
});
