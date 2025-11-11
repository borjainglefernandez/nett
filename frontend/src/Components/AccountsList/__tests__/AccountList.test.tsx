import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AccountList from "../AccountList";
import { createMockAccount } from "../../../test-utils";

// Mock the AccountSelectableCard component
jest.mock("../AccountSelectableCard", () => {
	return function MockAccountSelectableCard({
		account,
		isSelected,
		selectDeselectAccount,
	}: any) {
		return (
			<div data-testid={`account-card-${account.id}`}>
				<span>{account.name}</span>
				<input
					type='checkbox'
					checked={isSelected}
					onChange={() => selectDeselectAccount(account, !isSelected)}
					data-testid={`account-checkbox-${account.id}`}
				/>
			</div>
		);
	};
});

describe("AccountList", () => {
	const mockSelectDeselectAccount = jest.fn();
	const mockRemoveItem = jest.fn();

	const defaultProps = {
		accounts: [],
		selectedAccounts: [],
		selectDeselectAccount: mockSelectDeselectAccount,
		removeItem: mockRemoveItem,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders empty state when no accounts", () => {
		render(<AccountList {...defaultProps} />);

		expect(screen.getByText("No accounts found.")).toBeInTheDocument();
	});

	it("renders accounts grouped by item_id", () => {
		const accounts = [
			createMockAccount({
				id: "account-1",
				item_id: "item-1",
				institution_name: "Chase",
			}),
			createMockAccount({
				id: "account-2",
				item_id: "item-1",
				institution_name: "Chase",
			}),
			createMockAccount({
				id: "account-3",
				item_id: "item-2",
				institution_name: "Bank of America",
			}),
		];

		render(<AccountList {...defaultProps} accounts={accounts} />);

		// Should show two bank connection groups
		expect(screen.getByText("Chase")).toBeInTheDocument();
		expect(screen.getByText("Bank of America")).toBeInTheDocument();

		// Should show account count chips
		expect(screen.getByText("2 accounts")).toBeInTheDocument();
		expect(screen.getByText("1 account")).toBeInTheDocument();
	});

	it("renders Remove Bank Connection buttons for each item", () => {
		const accounts = [
			createMockAccount({
				id: "account-1",
				item_id: "item-1",
				institution_name: "Chase",
			}),
			createMockAccount({
				id: "account-2",
				item_id: "item-2",
				institution_name: "Bank of America",
			}),
		];

		render(<AccountList {...defaultProps} accounts={accounts} />);

		const removeButtons = screen.getAllByText("Remove Bank Connection");
		expect(removeButtons).toHaveLength(2);
	});

	it("calls removeItem when Remove Bank Connection is clicked", () => {
		const accounts = [
			createMockAccount({
				id: "account-1",
				item_id: "item-1",
				institution_name: "Chase",
			}),
		];

		render(<AccountList {...defaultProps} accounts={accounts} />);

		const removeButton = screen.getByText("Remove Bank Connection");
		fireEvent.click(removeButton);

		expect(mockRemoveItem).toHaveBeenCalledWith("item-1");
	});

	it("renders account cards within each group", () => {
		const accounts = [
			createMockAccount({
				id: "account-1",
				item_id: "item-1",
				institution_name: "Chase",
			}),
			createMockAccount({
				id: "account-2",
				item_id: "item-1",
				institution_name: "Chase",
			}),
		];

		render(<AccountList {...defaultProps} accounts={accounts} />);

		expect(screen.getByTestId("account-card-account-1")).toBeInTheDocument();
		expect(screen.getByTestId("account-card-account-2")).toBeInTheDocument();
	});

	it("passes correct props to AccountSelectableCard", () => {
		const accounts = [
			createMockAccount({
				id: "account-1",
				item_id: "item-1",
				institution_name: "Chase",
			}),
		];
		const selectedAccounts = [accounts[0]];

		render(
			<AccountList
				{...defaultProps}
				accounts={accounts}
				selectedAccounts={selectedAccounts}
			/>
		);

		const checkbox = screen.getByTestId("account-checkbox-account-1");
		expect(checkbox).toBeChecked();
	});

	it("handles accounts with logos", () => {
		const accounts = [
			createMockAccount({
				id: "account-1",
				item_id: "item-1",
				institution_name: "Chase",
				logo: "test-logo",
			}),
		];

		render(<AccountList {...defaultProps} accounts={accounts} />);

		const logoImage = screen.getByAltText("Chase");
		expect(logoImage).toBeInTheDocument();
		expect(logoImage).toHaveAttribute("src", "test-logo");
	});

	it("handles accounts without logos", () => {
		const accounts = [
			createMockAccount({
				id: "account-1",
				item_id: "item-1",
				institution_name: "Chase",
				logo: null,
			}),
		];

		render(<AccountList {...defaultProps} accounts={accounts} />);

		// Should not render logo image when logo is null
		expect(screen.queryByAltText("Chase")).not.toBeInTheDocument();
	});

	it("displays correct account count for single account", () => {
		const accounts = [
			createMockAccount({
				id: "account-1",
				item_id: "item-1",
				institution_name: "Chase",
			}),
		];

		render(<AccountList {...defaultProps} accounts={accounts} />);

		expect(screen.getByText("1 account")).toBeInTheDocument();
	});

	it("displays correct account count for multiple accounts", () => {
		const accounts = [
			createMockAccount({
				id: "account-1",
				item_id: "item-1",
				institution_name: "Chase",
			}),
			createMockAccount({
				id: "account-2",
				item_id: "item-1",
				institution_name: "Chase",
			}),
			createMockAccount({
				id: "account-3",
				item_id: "item-1",
				institution_name: "Chase",
			}),
		];

		render(<AccountList {...defaultProps} accounts={accounts} />);

		expect(screen.getByText("3 accounts")).toBeInTheDocument();
	});
});
