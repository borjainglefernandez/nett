import { render, screen, fireEvent, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TransactionNameCell from "../TransactionNameCell";

describe("TransactionNameCell", () => {
	const updateTransactionField = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
		updateTransactionField.mockResolvedValue(undefined);
	});

	it("displays the initial transaction name and avatar fallback", () => {
		render(
			<TransactionNameCell
				id='txn-1'
				value='Coffee'
				updateTransactionField={updateTransactionField}
			/>
		);

		expect(screen.getByText("Coffee")).toBeInTheDocument();
		expect(screen.getByText("C")).toBeInTheDocument();
	});

	it("shows the logo image once it loads", () => {
		render(
			<TransactionNameCell
				id='txn-1'
				value='Coffee'
				logoUrl='https://logo.test/coffee.png'
				updateTransactionField={updateTransactionField}
			/>
		);

		const img = screen.getByRole("img", { hidden: true });

		fireEvent.load(img);

		expect(img).toHaveAttribute("src", "https://logo.test/coffee.png");
	});

	it("enters edit mode and saves updated name", async () => {
		const user = userEvent.setup();

		render(
			<TransactionNameCell
				id='txn-1'
				value='Coffee'
				updateTransactionField={updateTransactionField}
			/>
		);

		await user.click(screen.getByText("Coffee"));

		const input = screen.getByRole("textbox");
		await user.clear(input);
		await user.type(input, "Latte");

		await act(async () => {
			fireEvent.blur(input);
		});

		expect(updateTransactionField).toHaveBeenCalledWith(
			"txn-1",
			{ name: "Latte" },
			'Transaction name updated to "Latte"',
			"Failed to update transaction name"
		);
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});

	it("does not trigger an update when the name is unchanged", async () => {
		const user = userEvent.setup();

		render(
			<TransactionNameCell
				id='txn-1'
				value='Coffee'
				updateTransactionField={updateTransactionField}
			/>
		);

		await user.click(screen.getByText("Coffee"));
		const input = screen.getByRole("textbox");

		await act(async () => {
			fireEvent.blur(input);
		});

		expect(updateTransactionField).not.toHaveBeenCalled();
		expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
	});
});
