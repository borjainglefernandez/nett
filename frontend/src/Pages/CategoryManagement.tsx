import { useEffect, useState } from "react";
import axios from "axios";
import {
	TextField,
	Button,
	Box,
	Typography,
	Grid2,
	Card,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
} from "@mui/material";
import { Error } from "../Models/Error";
import { Category, Subcategory } from "../Models/Category";
import CategoryCard from "../Components/CategoryManagement/CategoryCard";
import AppAlert from "../Components/Alerts/AppAlert";
import useAppAlert from "../hooks/appAlert";
import useApiService from "../hooks/apiService"; // Importing the API service
import { useNavigate } from "react-router-dom";
import { MAIN_PAGE_ROUTE } from "../Constants/RouteConstants";

const CategoryManagement = () => {
	const alert = useAppAlert();
	const { get, post } = useApiService();
	const navigate = useNavigate();

	const [categories, setCategories] = useState<Category[]>([]);
	const [newCategory, setNewCategory] = useState<string>("");
	const [modifiedCategories, setModifiedCategories] = useState<Set<string>>(
		new Set()
	);
	const [modifiedSubcategories, setModifiedSubcategories] = useState<
		Set<string>
	>(new Set());
	const [loading, setLoading] = useState<boolean>(true);
	const [openDialog, setOpenDialog] = useState<boolean>(false);
	const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
		null
	);
	const [subcategoryToDelete, setSubcategoryToDelete] =
		useState<Subcategory | null>(null);

	const handleBackButtonClick = () => {
		navigate(MAIN_PAGE_ROUTE);
	};

	useEffect(() => {
		const fetchCategories = async () => {
			const data = await get("/api/transaction/categories"); // Use the get method
			console.log(data);
			if (data) {
				setCategories(data);
			}
			setLoading(false);
		};
		fetchCategories();
	}, []);

	// Category Handlers
	const handleAddCategory = async () => {
		if (!newCategory.trim()) return;
		const newCategoryObj: Category = {
			id: "",
			name: newCategory.trim(),
			subcategories: [],
		};
		setCategories((prev) => [...prev, newCategoryObj]);
		const data = await post("/api/category", newCategoryObj); // Use the post method
		if (data) {
			setNewCategory("");
			alert.trigger(
				`Category "${newCategory}" created successfully!`,
				"success"
			);
		}
	};

	const handleCategoryChange = async (category: Category, value: string) => {
		try {
			setCategories((prev) =>
				prev.map((otherCategory) =>
					otherCategory.name === category.name
						? { ...otherCategory, name: value }
						: otherCategory
				)
			);
			setModifiedCategories((prev) => new Set(prev).add(category.id));
		} catch (error) {
			console.error("Error updating category", error);
		}
	};

	const handleDeleteCategoryDialogOpen = (category: Category) => {
		setCategoryToDelete(category);
		setOpenDialog(true);
	};

	const handleDeleteCategory = async () => {
		if (categoryToDelete) {
			try {
				await axios.delete(`/api/category/${categoryToDelete.id}`);
				alert.trigger(
					`Category "${categoryToDelete.name}" deleted successfully!`,
					"success"
				);
				setCategories((prev) =>
					prev.filter((cat) => cat.id !== categoryToDelete.id)
				);
			} catch (error) {
				console.log(error);
				if (axios.isAxiosError(error)) {
					const errResponse = error?.response?.data;
					const apiError: Error = {
						status_code: errResponse.status_code,
						display_message: errResponse.display_message,
						error_code: errResponse.error_code,
						error_type: errResponse.error_type,
					};
					alert.trigger(
						`Error deleting category: ${apiError.display_message}`,
						"error"
					);
				} else {
					alert.trigger(
						"An unexpected error occurred while deleting the category.",
						"error"
					);
				}
			}
		}
		setOpenDialog(false);
	};

	// Subcategory Handlers
	const handleSubcategoryChange = async (
		category: Category,
		subcategory: Subcategory,
		field: keyof Subcategory, // Enforces valid fields
		value: string
	) => {
		try {
			setCategories((prev) =>
				prev.map((otherCategory) =>
					category.id === otherCategory.id
						? {
								...otherCategory,
								subcategories: otherCategory.subcategories.map(
									(otherSubcategory) =>
										subcategory.id === otherSubcategory.id
											? { ...otherSubcategory, [field]: value }
											: otherSubcategory
								),
						  }
						: otherCategory
				)
			);
			setModifiedSubcategories((prev) => new Set(prev).add(subcategory.id));
		} catch (error) {
			console.error("Error updating subcategory", error);
		}
	};

	const handleAddSubcategory = (category: Category) => {
		setCategories((prev) =>
			prev.map((otherCategory) =>
				category.name === otherCategory.name
					? {
							...otherCategory,
							subcategories: [
								...otherCategory.subcategories,
								{
									id: "",
									name: "",
									description: "",
									category_id: otherCategory.id,
								},
							],
					  }
					: otherCategory
			)
		);
	};

	const handleDeleteSubcategoryDialogOpen = (subcategory: Subcategory) => {
		setSubcategoryToDelete(subcategory);
		setOpenDialog(true);
	};

	const handleDeleteSubcategory = async () => {
		if (!subcategoryToDelete) return;

		const removeSubcategoryFromState = () => {
			setCategories((prev) =>
				prev.map((cat) =>
					cat.id === subcategoryToDelete.category_id
						? {
								...cat,
								subcategories: cat.subcategories.filter(
									(sub) => sub.id !== subcategoryToDelete.id
								),
						  }
						: cat
				)
			);
		};

		const showSuccessAlert = () => {
			alert.trigger(
				`Subcategory "${subcategoryToDelete.name}" deleted successfully`,
				"success"
			);
		};

		const showErrorAlert = (message: string) => {
			alert.trigger(`Error deleting subcategory: ${message}`, "error");
		};

		try {
			// Check if the subcategory exists
			await axios.get(`/api/subcategory/${subcategoryToDelete.id}`);

			// If it exists, delete it
			await axios.delete(`/api/subcategory/${subcategoryToDelete.id}`);

			removeSubcategoryFromState();
			showSuccessAlert();
		} catch (error) {
			if (axios.isAxiosError(error)) {
				if (error.response?.status === 404) {
					// Subcategory not found, remove from state anyway
					removeSubcategoryFromState();
					showSuccessAlert();
				} else {
					const errResponse = error?.response?.data;
					showErrorAlert(
						errResponse?.display_message || "Unknown error occurred."
					);
				}
			} else {
				alert.trigger(
					"An unexpected error occurred while deleting the subcategory.",
					"error"
				);
			}
		}

		setOpenDialog(false);
	};

	const handleOnSaveChanges = async () => {
		try {
			const categoryUpdates = categories.filter((category) =>
				modifiedCategories.has(category.id)
			);

			const subcategoryUpdates: Subcategory[] = [];
			categories.forEach((category) => {
				category.subcategories.forEach((subcategory) => {
					if (modifiedSubcategories.has(subcategory.id)) {
						subcategoryUpdates.push(subcategory);
					}
				});
			});

			if (categoryUpdates.length === 0 && subcategoryUpdates.length === 0) {
				alert.trigger("No changes to save!", "success");
				return;
			}

			// Validation: Check for blank fields
			const hasBlankCategoryField = categoryUpdates.some(
				(cat) => !cat.name || cat.name.trim() === ""
			);
			const hasBlankSubcategoryField = subcategoryUpdates.some(
				(sub) =>
					!sub.name ||
					sub.name.trim() === "" ||
					!sub.description ||
					sub.description.trim() === ""
			);

			if (hasBlankCategoryField || hasBlankSubcategoryField) {
				alert.trigger(
					"One or more category or subcategory fields are blank.",
					"error"
				);
				return;
			}

			// Make API requests for each modified category
			await Promise.all(
				categoryUpdates.map((category: Category) =>
					axios.put("/api/category", category)
				)
			);

			await Promise.all(
				subcategoryUpdates.map((subcategory: Subcategory) =>
					axios.put("/api/subcategory", subcategory)
				)
			);

			alert.trigger("Changes saved successfully!", "success");

			// Clear modified state
			setModifiedCategories(new Set());
			setModifiedSubcategories(new Set());
		} catch (error) {
			console.log(error);
			if (axios.isAxiosError(error)) {
				const errResponse = error?.response?.data;
				const apiError: Error = {
					status_code: errResponse.status_code,
					display_message: errResponse.display_message,
					error_code: errResponse.error_code,
					error_type: errResponse.error_type,
				};
				alert.trigger(
					`Error saving changes: ${apiError.display_message}`,
					"error"
				);
			} else {
				alert.trigger(
					"An unexpected error occurred while deleting the category.",
					"error"
				);
			}
		}
	};

	const handleCloseAlert = () => {
		setOpenDialog(false);
		setCategoryToDelete(null);
		setSubcategoryToDelete(null);
	};

	// Show a loading spinner until categories are fetched
	if (loading) {
		return (
			<Box
				sx={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "100vh",
				}}
			>
				<CircularProgress />
			</Box>
		);
	}

	return (
		<Box sx={{ maxWidth: "900px", margin: "auto", padding: "20px" }}>
			<Button
				variant='contained'
				color='primary'
				onClick={handleBackButtonClick}
				sx={{ marginBottom: "20px" }}
			>
				Back to Home
			</Button>
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "20px",
				}}
			>
				<Typography variant='h4' sx={{ fontWeight: "bold" }}>
					Category Management
				</Typography>
				<Button
					variant='contained'
					color='success'
					onClick={handleOnSaveChanges}
				>
					Save Changes
				</Button>
			</Box>

			{/* ADD NEW CATEGORY */}
			<Card sx={{ padding: "20px", marginBottom: "20px", boxShadow: 2 }}>
				<Grid2 container spacing={2} alignItems='center'>
					<Grid2 size={8}>
						<TextField
							fullWidth
							label='New Category Name'
							value={newCategory}
							onChange={(e) => setNewCategory(e.target.value)}
							sx={{ backgroundColor: "white", borderRadius: 1 }}
						/>
					</Grid2>
					<Grid2 size={4}>
						<Button
							fullWidth
							variant='contained'
							color='primary'
							onClick={handleAddCategory}
						>
							Add Category
						</Button>
					</Grid2>
				</Grid2>
			</Card>

			{categories.map((category) => (
				<CategoryCard
					key={category.id}
					category={category}
					handleCategoryChange={handleCategoryChange}
					handleDeleteCategory={handleDeleteCategoryDialogOpen}
					handleAddSubcategory={handleAddSubcategory}
					handleSubcategoryChange={handleSubcategoryChange}
					handleDeleteSubcategory={handleDeleteSubcategoryDialogOpen}
				/>
			))}

			{/* Confirmation Dialog */}
			<Dialog open={openDialog}>
				<DialogTitle>
					{categoryToDelete
						? `Delete Category "${categoryToDelete.name}"`
						: subcategoryToDelete
						? `Delete Subcategory "${subcategoryToDelete.name}"`
						: ""}
				</DialogTitle>
				<DialogContent>
					{categoryToDelete
						? "This will remove the category and all its subcategories. Proceed?"
						: subcategoryToDelete
						? "This will remove the subcategory. Proceed?"
						: ""}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => handleCloseAlert()} color='primary'>
						Cancel
					</Button>
					<Button
						onClick={() =>
							categoryToDelete
								? handleDeleteCategory()
								: handleDeleteSubcategory()
						}
						color='error'
					>
						Delete
					</Button>
				</DialogActions>
			</Dialog>

			<AppAlert
				open={alert.open}
				message={alert.message}
				severity={alert.severity}
				onClose={alert.close}
			/>
		</Box>
	);
};

export default CategoryManagement;
