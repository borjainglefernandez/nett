import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import AccountSelectableCard from "../AccountSelectableCard";
import { createMockAccount } from "../../../test-utils";

const mockTrigger = jest.fn();
const mockClose = jest.fn();
const mockPut = jest.fn();
const mockDel = jest.fn();

jest.mock("../../Alerts/AppAlert", () => {
	return function MockAppAlert({ open, message, severity, onClose }: any) {
		return open ? (
			<div data-testid='app-alert' data-severity={severity}>
				{message}
				<button onClick={onClose}>Close</button>
			</div>
		) : null;
	};
});

jest.mock("../../../hooks/appAlert", () => ({
	__esModule: true,
	default: () => ({
		trigger: mockTrigger,
		close: mockClose,
		open: false,
		message: "",
		severity: "info",
	}),
}));

jest.mock("../../../hooks/apiService", () => ({
	__esModule: true,
	default: () => ({
		get: jest.fn(),
		post: jest.fn(),
		put: mockPut,
		del: mockDel,
	}),
}));

describe("AccountSelectableCard", () => {
	const mockSelectDeselectAccount = jest.fn();
	const mockAccount = createMockAccount();

	const defaultProps = {
		account: mockAccount,
		isSelected: false,
		selectDeselectAccount: mockSelectDeselectAccount,
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("renders account name", () => {
		render(<AccountSelectableCard {...defaultProps} />);

		expect(screen.getByText(mockAccount.name)).toBeInTheDocument();
	});

	it("renders switch for account selection", () => {
		render(<AccountSelectableCard {...defaultProps} />);

		const switchElement = screen.getByRole("checkbox");
		expect(switchElement).toBeInTheDocument();
		expect(switchElement).not.toBeChecked();
	});

	it("calls selectDeselectAccount when switch is toggled", () => {
		render(<AccountSelectableCard {...defaultProps} />);

		const switchElement = screen.getByRole("checkbox");
		fireEvent.click(switchElement);

		expect(mockSelectDeselectAccount).toHaveBeenCalledWith(mockAccount, true);
	});

	it("shows selected state when provided", () => {
		render(<AccountSelectableCard {...defaultProps} isSelected={true} />);

		expect(screen.getByRole("checkbox")).toBeChecked();
	});

	it("expands and collapses additional details", () => {
		render(<AccountSelectableCard {...defaultProps} />);

		const expandButton = screen.getByLabelText("show more");

		expect(expandButton).toHaveAttribute("aria-expanded", "false");

		fireEvent.click(expandButton);
		expect(expandButton).toHaveAttribute("aria-expanded", "true");
		expect(
			screen.getByText(`${mockAccount.transaction_count} transactions`)
		).toBeInTheDocument();
		expect(screen.getByText(mockAccount.account_type)).toBeInTheDocument();
		expect(screen.getByText(mockAccount.account_subtype)).toBeInTheDocument();

		fireEvent.click(expandButton);
		expect(expandButton).toHaveAttribute("aria-expanded", "false");
	});

	it("enters edit mode when account name is clicked", () => {
		render(<AccountSelectableCard {...defaultProps} />);

		fireEvent.click(screen.getByText(mockAccount.name));
		expect(screen.getByDisplayValue(mockAccount.name)).toBeInTheDocument();
	});

	it("renders account logo when available", () => {
		const accountWithLogo = createMockAccount({
			logo: "test-logo",
		});
		render(
			<AccountSelectableCard {...defaultProps} account={accountWithLogo} />
		);

		const avatar = screen.getByLabelText("account");
		const image = avatar.querySelector("img");
		expect(image).toBeTruthy();
		expect(image).toHaveAttribute("src", "data:image/png;base64,test-logo");
	});

	it("renders fallback avatar when no logo", () => {
		const accountWithoutLogo = createMockAccount({ logo: null });
		render(
			<AccountSelectableCard {...defaultProps} account={accountWithoutLogo} />
		);

		const avatar = screen.getByLabelText("account");
		expect(avatar).toHaveTextContent(accountWithoutLogo.name[0]);
	});

	it("shows last updated text", () => {
		render(<AccountSelectableCard {...defaultProps} />);

		expect(screen.getByText(/Last updated/)).toBeInTheDocument();
	});
});
