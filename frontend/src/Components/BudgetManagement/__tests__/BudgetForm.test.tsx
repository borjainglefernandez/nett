import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BudgetForm from "../BudgetForm";
import Budget, { BudgetFrequency } from "../../../Models/Budget";
import { Category } from "../../../Models/Category";

describe("BudgetForm", () => {
	const setup = () => {
		const categories: Category[] = [
			{
				id: "cat-1",
				name: "Food",
				description: "",
				subcategories: [
					{ id: "sub-1", name: "Groceries", description: "Groceries" },
				],
			},
		];

		const budget: Budget = {
			id: "budget-1",
			amount: 100,
			frequency: BudgetFrequency.MONTHLY,
			category_id: null,
			subcategory_id: null,
		} as Budget;

		const onChange = jest.fn();
		const onSubmit = jest.fn();

		render(
			<BudgetForm
				budget={budget}
				categories={categories}
				onChange={onChange}
				onSubmit={onSubmit}
				submitLabel='Save'
			/>
		);

		return { categories, budget, onChange, onSubmit };
	};

	it("sends updated amount to onChange", () => {
		const { onChange } = setup();

		const amountField = screen.getByLabelText("Amount") as HTMLInputElement;
		fireEvent.change(amountField, { target: { value: "150" } });

		expect(onChange).toHaveBeenCalled();
		expect(onChange.mock.calls[0][0].amount).toBe(150);
	});

	it("updates category and subcategory selections", async () => {
		const { onChange } = setup();

		const [, categorySelect, subcategorySelect] =
			screen.getAllByRole("combobox");

		fireEvent.mouseDown(categorySelect);
		fireEvent.click(await screen.findByRole("option", { name: "Food" }));

		await waitFor(() => {
			const lastCall = onChange.mock.calls.at(-1);
			expect(lastCall?.[0].category_id).toBe("cat-1");
		});

		fireEvent.mouseDown(subcategorySelect);
		fireEvent.click(await screen.findByRole("option", { name: "Groceries" }));

		await waitFor(() => {
			const lastCall = onChange.mock.calls.at(-1);
			expect(lastCall?.[0].subcategory_id).toBe("sub-1");
		});
	});

	it("invokes onSubmit when the save button is clicked", () => {
		const { onSubmit } = setup();

		fireEvent.click(screen.getByRole("button", { name: "Save" }));

		expect(onSubmit).toHaveBeenCalled();
	});
});
