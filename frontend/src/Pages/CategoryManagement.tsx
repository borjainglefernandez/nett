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
	Snackbar,
	Alert,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
} from "@mui/material";
import { Error } from "../Models/Error";
import { Category, Subcategory } from "../Models/Category";
import CategoryCard from "../Components/CategoryManagement/CategoryCard";

const CategoryManagement = () => {
	const [categories, setCategories] = useState<Category[]>([]);
	const [newCategory, setNewCategory] = useState<string>("");
	const [modifiedCategories, setModifiedCategories] = useState<Set<string>>(
		new Set()
	);
	const [modifiedSubcategories, setModifiedSubcategories] = useState<
		Set<string>
	>(new Set());
	const [loading, setLoading] = useState<boolean>(true);
	const [alertMessage, setAlertMessage] = useState<string | null>(null);
	const [alertSeverity, setAlertSeverity] = useState<"success" | "error">(
		"success"
	);
	const [openAlert, setOpenAlert] = useState<boolean>(false);
	const [openDialog, setOpenDialog] = useState<boolean>(false);
	const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
		null
	);
	const [subcategoryToDelete, setSubcategoryToDelete] =
		useState<Subcategory | null>(null);

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const response = await axios.get("/api/transaction/categories");
				setCategories(response.data);
			} catch (error) {
				console.error("Error fetching categories", error);
			} finally {
				setLoading(false);
			}
		};
		fetchCategories();
	}, []);

	// Category Handlers
	const handleAddCategory = async () => {
		if (!newCategory.trim()) return;
		let newCategoryObj: Category = {
			id: "",
			name: newCategory.trim(),
			subcategories: [],
		};
		setCategories((prev) => [...prev, newCategoryObj]);
		try {
			await axios.post("/api/category", newCategoryObj);
			setNewCategory("");
			triggerAlert(
				`Category "${newCategory}" created successfully!`,
				"success"
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
				triggerAlert(
					`Error creating category: ${apiError.display_message}`,
					"error"
				);
			} else {
				triggerAlert(
					"An unexpected error occurred while creating the category.",
					"error"
				);
			}
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
				triggerAlert(
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
					triggerAlert(
						`Error deleting category: ${apiError.display_message}`,
						"error"
					);
				} else {
					triggerAlert(
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
			triggerAlert(
				`Subcategory "${subcategoryToDelete.name}" deleted successfully`,
				"success"
			);
		};

		const showErrorAlert = (message: string) => {
			triggerAlert(`Error deleting subcategory: ${message}`, "error");
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
				triggerAlert(
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
				triggerAlert("No changes to save!", "success");
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
				triggerAlert(
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

			triggerAlert("Changes saved successfully!", "success");

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
				triggerAlert(
					`Error saving changes: ${apiError.display_message}`,
					"error"
				);
			} else {
				triggerAlert(
					"An unexpected error occurred while deleting the category.",
					"error"
				);
			}
		}
	};

	const triggerAlert = (message: string, severity: "success" | "error") => {
		console.log("Triggering alert");
		setAlertMessage(message);
		setAlertSeverity(severity);
		setOpenAlert(true);

		setTimeout(() => {
			setOpenAlert(false);
		}, 5000); // matches the autoHideDuration of Snackbar
	};

	const handleCloseAlert = () => {
		setOpenDialog(false);
		setCategoryToDelete(null);
		setSubcategoryToDelete(null);
		console.log("Here");
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

			<Snackbar
				open={openAlert}
				autoHideDuration={5000}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert severity={alertSeverity} sx={{ width: "100%" }}>
					{alertMessage}
				</Alert>
			</Snackbar>
		</Box>
	);
};

export default CategoryManagement;
