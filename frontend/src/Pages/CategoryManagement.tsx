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
} from "@mui/material";
import { Category, Subcategory } from "../Models/Category";
import CategoryCard from "../Components/CategoryManagement/CategoryCard";

const CategoryManagement = () => {
	const [categories, setCategories] = useState<Category[]>([]);
	const [newCategory, setNewCategory] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(true);

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

	// Handlers
	const handleCategoryChange = async (category: Category, value: string) => {
		try {
			await axios.put("/api/category", { id: category.name, name: value });
			setCategories((prev) =>
				prev.map((otherCategory) =>
					otherCategory.name === category.name
						? { ...otherCategory, name: value }
						: otherCategory
				)
			);
		} catch (error) {
			console.error("Error updating category", error);
		}
	};
	
	const handleDeleteCategory = async (category: Category) => {
		try {
			await axios.delete(`/api/category/${category.id}`);
			setCategories((prev) => prev.filter((cat) => cat.id !== category.id));
		} catch (error) {
			console.error("Error deleting category", error);
		}
	};
	
	const handleSubcategoryChange = async (
		category: Category,
		subcategory: Subcategory,
		field: string,
		value: string
	) => {
		try {
			await axios.put("/api/subcategory", {
				id: subcategory.id,
				name: field === "name" ? value : subcategory.name,
				description: field === "description" ? value : subcategory.description,
				category_id: category.id,
			});
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
								{ id: "", name: "", description: "" },
							],
					  }
					: otherCategory
			)
		);
	};

	const handleDeleteSubcategory = async (
		category: Category,
		subcategory: Subcategory
	) => {
		try {
			await axios.delete(`/api/subcategory/${subcategory.id}`);
			setCategories((prev) =>
				prev.map((otherCategory) =>
					category.id === otherCategory.id
						? {
								...otherCategory,
								subcategories: otherCategory.subcategories.filter(
									(otherSubcategory) => subcategory.id !== otherSubcategory.id
								),
						  }
						: otherCategory
				)
			);
		} catch (error) {
			console.error("Error deleting subcategory", error);
		}
	};

	const handleAddCategory = () => {
		if (!newCategory.trim()) return;
		setCategories((prev) => [
			...prev,
			{ id: newCategory, name: newCategory, subcategories: [] },
		]);
		setNewCategory("");
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
			<Typography variant='h4' gutterBottom sx={{ fontWeight: "bold" }}>
				Category Management
			</Typography>

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
		</Box>
	);
};

export default CategoryManagement;
