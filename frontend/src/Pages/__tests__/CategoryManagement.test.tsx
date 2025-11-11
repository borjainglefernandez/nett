import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CategoryManagement from "../CategoryManagement";

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

jest.mock("../../Components/CategoryManagement/CategoryCard", () => ({
	__esModule: true,
	default: ({
		category,
		handleCategoryChange,
		handleDeleteCategory,
		handleAddSubcategory,
		handleSubcategoryChange,
		handleDeleteSubcategory,
	}: any) => (
		<div data-testid={`category-card-${category.id}`}>
			<span>{category.name}</span>
			<button
				onClick={() =>
					handleCategoryChange(category, `${category.name}-updated`)
				}
			>
				Rename Category
			</button>
			<button onClick={() => handleAddSubcategory(category)}>
				Add Subcategory
			</button>
			{category.subcategories.map((sub: any) => (
				<div key={sub.id}>
					<button
						onClick={() =>
							handleSubcategoryChange(
								category,
								sub,
								"name",
								`${sub.name}-updated`
							)
						}
					>
						Rename Subcategory {sub.name}
					</button>
					<button onClick={() => handleDeleteSubcategory(sub)}>
						Delete Subcategory {sub.name}
					</button>
				</div>
			))}
			<button onClick={() => handleDeleteCategory(category)}>
				Delete Category
			</button>
		</div>
	),
}));

jest.mock("react-router-dom", () => ({
	__esModule: true,
	MemoryRouter: ({ children }: { children: React.ReactNode }) => (
		<>{children}</>
	),
	useNavigate: () => mockNavigate,
}));

const renderPage = () => render(<CategoryManagement />);

describe("CategoryManagement page", () => {
	const categoriesResponse = [
		{
			id: "cat-1",
			name: "House",
			subcategories: [
				{
					id: "sub-1",
					name: "Cleaning",
					description: "Keep things tidy",
					category_id: "cat-1",
				},
			],
		},
	];

	beforeEach(() => {
		jest.clearAllMocks();
		mockNavigate.mockReset();
		mockGet.mockImplementation((url: string) => {
			if (url === "/api/category") {
				return Promise.resolve(categoriesResponse);
			}
			if (url.startsWith("/api/subcategory/")) {
				return Promise.resolve({ id: "sub-1" });
			}
			return Promise.resolve([]);
		});
		mockPost.mockResolvedValue({});
		mockPut.mockResolvedValue({});
		mockDelete.mockResolvedValue(true);
	});

	it("loads categories on mount", async () => {
		renderPage();

		await waitFor(() => {
			expect(mockGet).toHaveBeenCalledWith("/api/category");
		});

		expect(await screen.findByText("Category Management")).toBeInTheDocument();
		expect(
			await screen.findByTestId("category-card-cat-1")
		).toBeInTheDocument();
	});

	it("adds a new category", async () => {
		renderPage();

		const input = await screen.findByLabelText("New Category Name");
		await userEvent.type(input, "New Category");

		await userEvent.click(screen.getByRole("button", { name: "Add Category" }));

		await waitFor(() => {
			expect(mockPost).toHaveBeenCalledWith(
				"/api/category",
				expect.objectContaining({ name: "New Category" })
			);
			expect(mockAlert.trigger).toHaveBeenCalledWith(
				'Category "New Category" created successfully!',
				"success"
			);
		});
	});

	it("saves modified categories", async () => {
		renderPage();

		await userEvent.click(
			await screen.findByRole("button", { name: "Rename Category" })
		);

		await userEvent.click(screen.getByRole("button", { name: "Save Changes" }));

		await waitFor(() => {
			expect(mockPut).toHaveBeenCalledWith(
				"/api/category",
				expect.objectContaining({ id: "cat-1", name: "House-updated" })
			);
			expect(mockAlert.trigger).toHaveBeenCalledWith(
				"Changes saved successfully!",
				"success"
			);
		});
	});

	it("opens delete dialog and deletes a category", async () => {
		renderPage();

		await userEvent.click(
			await screen.findByRole("button", { name: "Delete Category" })
		);

		const confirmButton = await screen.findByRole("button", { name: "Delete" });
		await userEvent.click(confirmButton);

		await waitFor(() => {
			expect(mockDelete).toHaveBeenCalledWith("/api/category/cat-1");
			expect(mockAlert.trigger).toHaveBeenCalledWith(
				'Category "House" deleted successfully!',
				"success"
			);
		});
	});

	it("deletes a subcategory when confirmed", async () => {
		renderPage();

		await userEvent.click(
			await screen.findByRole("button", { name: "Delete Subcategory Cleaning" })
		);

		const confirmButton = await screen.findByRole("button", { name: "Delete" });
		await userEvent.click(confirmButton);

		await waitFor(() => {
			expect(mockDelete).toHaveBeenCalledWith("/api/subcategory/sub-1");
			expect(mockAlert.trigger).toHaveBeenCalledWith(
				'Subcategory "Cleaning" deleted successfully',
				"success"
			);
		});
	});
});
