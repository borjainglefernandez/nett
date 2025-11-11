import { render, screen, fireEvent } from "@testing-library/react";
import CategoryCard from "../CategoryCard";
import { Category, Subcategory } from "../../../Models/Category";

const mockHandleSubcategoryChange = jest.fn();
const mockHandleDeleteSubcategory = jest.fn();

jest.mock("../SubcategoryRow", () => ({
	__esModule: true,
	default: (props: any) => {
		const SubcategoryRow = () => (
			<div
				data-testid='subcategory-row'
				onClick={() => props.handleDeleteSubcategory(props.subcategory)}
			>
				{props.subcategory.name}
			</div>
		);
		return <SubcategoryRow />;
	},
}));

describe("CategoryCard", () => {
	const buildCategory = (): Category => ({
		id: "cat-1",
		name: "house_hold",
		description: "",
		subcategories: [{ id: "sub-1", name: "cleaning", description: "Cleaning" }],
	});

	const setup = () => {
		const category = buildCategory();
		const handleCategoryChange = jest.fn();
		const handleDeleteCategory = jest.fn();
		const handleAddSubcategory = jest.fn();

		render(
			<CategoryCard
				category={category}
				handleCategoryChange={handleCategoryChange}
				handleDeleteCategory={handleDeleteCategory}
				handleAddSubcategory={handleAddSubcategory}
				handleSubcategoryChange={mockHandleSubcategoryChange}
				handleDeleteSubcategory={mockHandleDeleteSubcategory}
			/>
		);

		return {
			category,
			handleCategoryChange,
			handleDeleteCategory,
			handleAddSubcategory,
		};
	};

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("invokes handlers when the category name changes and blurs", () => {
		const { handleCategoryChange, category } = setup();

		const input = screen.getByLabelText("Category Name") as HTMLInputElement;
		fireEvent.change(input, { target: { value: "House Hold" } });
		fireEvent.blur(input);

		expect(handleCategoryChange).toHaveBeenCalledWith(category, "House Hold");
	});

	it("calls delete and toggle handlers", () => {
		const { handleDeleteCategory, handleAddSubcategory, category } = setup();

		fireEvent.click(screen.getByRole("button", { name: "Delete Category" }));
		expect(handleDeleteCategory).toHaveBeenCalledWith(category);

		fireEvent.click(screen.getByRole("button", { name: "Show Subcategories" }));
		expect(screen.getByTestId("subcategory-row")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "Add Subcategory" }));
		expect(handleAddSubcategory).toHaveBeenCalledWith(category);
	});
});
