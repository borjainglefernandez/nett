import { useEffect, useState } from "react";
import axios from "axios";
import { TextField, Button, Box, Typography, Grid, Card } from "@mui/material";
import { Category, Subcategory } from "../Models/Category";
import CategoryCard from "../Components/CategoryManagement/CategoryCard";

const CategoryManagement = () => {
	const [categories, setCategories] = useState<Category[]>([]);
	const [newCategory, setNewCategory] = useState<string>("");

	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const response = await axios.get("/api/transaction/categories");
				setCategories(response.data);
			} catch (error) {
				console.error("Error fetching categories", error);
			}
		};
		fetchCategories();
	}, []);

	// Handlers
	const handleCategoryChange = (category: Category, value: string) => {
		setCategories((prev) =>
			prev.map((otherCategory: Category) =>
				otherCategory.name === category.name
					? { ...otherCategory, name: value }
					: otherCategory
			)
		);
	};

	const handleSubcategoryChange = (
		category: Category,
		subcategory: Subcategory,
		field: string,
		value: string
	) => {
		setCategories((prev) =>
			prev.map((otherCategory: Category) =>
				category.name === otherCategory.name
					? {
							...otherCategory,
							subcategories: otherCategory.subcategories.map(
								(otherSubcategory: Subcategory) =>
									subcategory.subcategory === otherSubcategory.subcategory
										? { ...otherSubcategory, [field]: value }
										: otherSubcategory
							),
					  }
					: otherCategory
			)
		);
	};

	const handleAddSubcategory = (category: Category) => {
		setCategories((prev) =>
			prev.map((otherCategory) =>
				category.name === otherCategory.name
					? {
							...otherCategory,
							subcategories: [
								...category.subcategories,
								{ subcategory: "", description: "" },
							],
					  }
					: otherCategory
			)
		);
	};

	const handleDeleteSubcategory = (
		category: Category,
		subcategory: Subcategory
	) => {
		setCategories((prev) =>
			prev.map((otherCategory: Category) =>
				category.name === otherCategory.name
					? {
							...otherCategory,
							subcategories: otherCategory.subcategories.filter(
								(otherSubcategory: Subcategory) =>
									subcategory.subcategory !== otherSubcategory.subcategory
							),
					  }
					: otherCategory
			)
		);
	};

	const handleAddCategory = () => {
		if (!newCategory.trim()) return;
		setCategories((prev) => [
			...prev,
			{ name: newCategory, subcategories: [] },
		]);
		setNewCategory("");
	};

	const handleDeleteCategory = (category: Category) => {
		setCategories((prev) => prev.filter((cat) => cat.name !== category.name));
	};

	return (
		<Box sx={{ maxWidth: "900px", margin: "auto", padding: "20px" }}>
			<Typography variant='h4' gutterBottom sx={{ fontWeight: "bold" }}>
				Category Management
			</Typography>

			{/* ADD NEW CATEGORY */}
			<Card sx={{ padding: "20px", marginBottom: "20px", boxShadow: 2 }}>
				<Grid container spacing={2} alignItems='center'>
					<Grid item xs={8}>
						<TextField
							fullWidth
							label='New Category Name'
							value={newCategory}
							onChange={(e) => setNewCategory(e.target.value)}
							sx={{ backgroundColor: "white", borderRadius: 1 }}
						/>
					</Grid>
					<Grid item xs={4}>
						<Button
							fullWidth
							variant='contained'
							color='primary'
							onClick={handleAddCategory}
						>
							Add Category
						</Button>
					</Grid>
				</Grid>
			</Card>

			{categories.map((category) => (
				<CategoryCard
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
