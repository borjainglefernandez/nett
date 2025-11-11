import { render, screen, fireEvent } from "@testing-library/react";
import SubcategoryRow from "../SubcategoryRow";
import { Category, Subcategory } from "../../../Models/Category";

describe("SubcategoryRow", () => {
	const category: Category = {
		id: "cat-1",
		name: "House",
		description: "",
		subcategories: [],
	};

	const subcategory: Subcategory = {
		id: "sub-1",
		name: "cleaning",
		description: "Keep things tidy",
	};

	const handleChange = jest.fn();
	const handleDelete = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("validates empty inputs and shows helper text", () => {
		render(
			<SubcategoryRow
				category={category}
				subcategory={subcategory}
				handleSubcategoryChange={handleChange}
				handleDeleteSubcategory={handleDelete}
			/>
		);

		const nameField = screen.getByRole("textbox", {
			name: /Subcategory Name/i,
		});
		fireEvent.change(nameField, { target: { value: "" } });
		fireEvent.blur(nameField);

		expect(screen.getByText("Name is required")).toBeInTheDocument();

		const descriptionField = screen.getByRole("textbox", {
			name: /Description/i,
		});
		fireEvent.change(descriptionField, { target: { value: "" } });
		fireEvent.blur(descriptionField);

		expect(screen.getByText("Description is required")).toBeInTheDocument();
	});

	it("calls handlers when valid values are provided", () => {
		render(
			<SubcategoryRow
				category={category}
				subcategory={subcategory}
				handleSubcategoryChange={handleChange}
				handleDeleteSubcategory={handleDelete}
			/>
		);

		const nameField = screen.getByRole("textbox", {
			name: /Subcategory Name/i,
		});
		fireEvent.change(nameField, { target: { value: "Cleaning Supplies" } });
		fireEvent.blur(nameField);

		expect(handleChange).toHaveBeenCalledWith(
			category,
			subcategory,
			"name",
			"Cleaning Supplies"
		);

		const descriptionField = screen.getByRole("textbox", {
			name: /Description/i,
		});
		fireEvent.change(descriptionField, { target: { value: "All supplies" } });
		fireEvent.blur(descriptionField);

		expect(handleChange).toHaveBeenCalledWith(
			category,
			subcategory,
			"description",
			"All supplies"
		);

		fireEvent.click(screen.getByRole("button", { name: "Delete" }));
		expect(handleDelete).toHaveBeenCalledWith(subcategory);
	});
});
