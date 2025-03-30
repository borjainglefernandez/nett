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
				console.log(response);
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
	const handleAddCategory = () => {
		if (!newCategory.trim()) return;
		setCategories((prev) => [
			...prev,
			{ id: newCategory, name: newCategory, subcategories: [] },
		]);
		setNewCategory("");
	};

	const handleCategoryChange = async (category: Category, value: string) => {
		try {
			console.log("Here in handle category");
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

	const handleDeleteCategory = async (category: Category) => {
		if (categoryToDelete) {
			try {
				await axios.delete(`/api/category/${categoryToDelete.id}`);
				setCategories((prev) =>
					prev.filter((cat) => cat.id !== categoryToDelete.id)
				);
				setAlertMessage(
					`Category "${categoryToDelete.name}" deleted successfully!`
				);
				setAlertSeverity("success");
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
		if (subcategoryToDelete) {
			try {
				await axios.delete(`/api/subcategory/${subcategoryToDelete.id}`);
				setCategories((prev) =>
					prev.map((otherCategory) =>
						subcategoryToDelete.category_id === otherCategory.id
							? {
									...otherCategory,
									subcategories: otherCategory.subcategories.filter(
										(otherSubcategory) =>
											subcategoryToDelete.id !== otherSubcategory.id
									),
							  }
							: otherCategory
					)
				);
			} catch (error) {
				console.error("Error deleting subcategory", error);
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
		setAlertMessage(message);
		setAlertSeverity(severity);
		setOpenAlert(true);

		setTimeout(() => {
			setOpenAlert(false);
		}, 5000); // matches the autoHideDuration of Snackbar
	};

	const handleCloseAlert = () => {
		setOpenAlert(false);
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
					key={category.name}
					category={category}
					handleCategoryChange={handleCategoryChange}
					handleDeleteCategory={handleDeleteCategory}
					handleAddSubcategory={handleAddSubcategory}
					handleSubcategoryChange={handleSubcategoryChange}
					handleDeleteSubcategory={handleDeleteSubcategory}
				/>
			))}

			<Snackbar
				open={openAlert}
				autoHideDuration={5000}
				onClose={handleCloseAlert}
				anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
			>
				<Alert
					onClose={handleCloseAlert}
					severity={alertSeverity}
					sx={{ width: "100%" }}
				>
					{alertMessage}
				</Alert>
			</Snackbar>
		</Box>
	);
};

export default CategoryManagement;
