import { useEffect, useState } from "react";
import axios from "axios";
import { TextField, Button, Box, Typography, Grid, Grid2 } from "@mui/material";
import { Category, Subcategory } from "../Models/Category";

const CategoryManagement = () => {
	const [categories, setCategories] = useState<Category[]>([]); // Use the Category type here
	const [newCategory, setNewCategory] = useState<string>("");

	// Fetch categories from the API
	useEffect(() => {
		const fetchCategories = async () => {
			try {
				const response = await axios.get("/api/transaction/categories");
				const fetchedCategories: Category[] = response.data; // Type the response as Category[]
				setCategories(fetchedCategories);
			} catch (error) {
				console.error("Error fetching categories", error);
			}
		};

		fetchCategories();
	}, []);

	const handleCategoryChange = (categoryName: string, value: string) => {
		setCategories((prev) =>
			prev.map((category) =>
				category.name === categoryName ? { ...category, name: value } : category
			)
		);
	};

	const handleSubcategoryChange = (
		categoryName: string,
		subcategoryName: string,
		field: string,
		value: string
	) => {
		setCategories((prev) =>
			prev.map((category) =>
				category.name === categoryName
					? {
							...category,
							subcategories: category.subcategories.map((subcategory) =>
								subcategory.subcategory === subcategoryName
									? { ...subcategory, [field]: value }
									: subcategory
							),
					  }
					: category
			)
		);
	};

	const handleAddSubcategory = (categoryName: string) => {
		const newSubcategory: Subcategory = {
			description: "",
			subcategory: "",
		};
		setCategories((prev) =>
			prev.map((category) =>
				category.name === categoryName
					? {
							...category,
							subcategories: [...category.subcategories, newSubcategory],
					  }
					: category
			)
		);
	};

	const handleDeleteSubcategory = (
		categoryName: string,
		subcategoryName: string
	) => {
		setCategories((prev) =>
			prev.map((category) =>
				category.name === categoryName
					? {
							...category,
							subcategories: category.subcategories.filter(
								(subcategory) => subcategory.subcategory !== subcategoryName
							),
					  }
					: category
			)
		);
	};

	const handleAddCategory = () => {
		const newCategoryData: Category = {
			name: newCategory,
			subcategories: [],
		};
		setCategories((prev) => [...prev, newCategoryData]);
		setNewCategory(""); // Reset new category input
	};

	return (
		<Box>
			<Typography variant='h4'>Category Management</Typography>
			<Box>
				<Grid2 container spacing={2} alignItems='center'>
					<Grid2>
						<TextField
							fullWidth
							label='New Category Name'
							value={newCategory}
							onChange={(e) => setNewCategory(e.target.value)}
						/>
					</Grid2>
					<Grid2>
						<Button variant='contained' onClick={handleAddCategory}>
							Add Category
						</Button>
					</Grid2>
				</Grid2>
				{categories.map((category: Category) => (
					<Box key={category.name} sx={{ marginBottom: "20px" }}>
						<Grid2 container spacing={2} alignItems='center'>
							<Grid2>
								<TextField
									fullWidth
									label='Category Name'
									value={category.name}
									onChange={(e) =>
										handleCategoryChange(category.name, e.target.value)
									}
								/>
							</Grid2>
							<Grid2>
								<Button
									variant='outlined'
									color='error'
									onClick={() =>
										setCategories((prev) =>
											prev.filter((cat) => cat.name !== category.name)
										)
									}
								>
									Delete Category
								</Button>
							</Grid2>
						</Grid2>
						{category.subcategories.map((subcategory, index) => (
							<Box
								key={subcategory.subcategory}
								sx={{ paddingLeft: "20px", marginTop: "10px" }}
							>
								<Grid container spacing={2} alignItems='center'>
									<Grid item xs={5}>
										<TextField
											fullWidth
											label='Subcategory Name'
											value={subcategory.subcategory}
											onChange={(e) =>
												handleSubcategoryChange(
													category.name,
													subcategory.subcategory,
													"subcategory",
													e.target.value
												)
											}
										/>
									</Grid>
									<Grid item xs={5}>
										<TextField
											fullWidth
											label='Description'
											value={subcategory.description}
											onChange={(e) =>
												handleSubcategoryChange(
													category.name,
													subcategory.subcategory,
													"description",
													e.target.value
												)
											}
										/>
									</Grid>
									<Grid item xs={2}>
										<Button
											variant='outlined'
											color='error'
											onClick={() =>
												handleDeleteSubcategory(
													category.name,
													subcategory.subcategory
												)
											}
										>
											Delete Subcategory
										</Button>
									</Grid>
								</Grid>
							</Box>
						))}

						<Box sx={{ marginTop: "10px" }}>
							<Button
								variant='outlined'
								onClick={() => handleAddSubcategory(category.name)}
							>
								Add Subcategory
							</Button>
						</Box>
					</Box>
				))}
			</Box>
		</Box>
	);
};

export default CategoryManagement;
