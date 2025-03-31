import { useState } from "react";
import {
	TextField,
	Button,
	Box,
	Grid2,
	Card,
	CardContent,
	Collapse,
} from "@mui/material";

import { Category, Subcategory } from "../../Models/Category";
import SubcategoryRow from "./SubcategoryRow";

interface CategoryCardProps {
	category: Category;
	handleCategoryChange: (category: Category, value: string) => void;
	handleDeleteCategory: (category: Category) => void;
	handleAddSubcategory: (category: Category) => void;
	handleSubcategoryChange: (
		category: Category,
		subcategory: Subcategory,
		field: keyof Subcategory, // Enforces valid fields
		value: string
	) => void;
	handleDeleteSubcategory: (
		subcategory: Subcategory
	) => void;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
	category,
	handleCategoryChange,
	handleDeleteCategory,
	handleAddSubcategory,
	handleSubcategoryChange,
	handleDeleteSubcategory,
}) => {
	const [open, setOpen] = useState(false);
	const [categoryNameValue, setCategoryNameValue] = useState(
		category.name.replace(/_/g, " ")
	);

	return (
		<Card key={category.name} sx={{ marginBottom: "20px", boxShadow: 3 }}>
			<CardContent>
				<Grid2 container spacing={2} alignItems='center'>
					<Grid2 size={8}>
						<TextField
							fullWidth
							label='Category Name'
							value={categoryNameValue}
							onChange={(e) => setCategoryNameValue(e.target.value)} // Allow typing
							onBlur={(e) => handleCategoryChange(category, e.target.value)}
							sx={{ backgroundColor: "white", borderRadius: 1 }}
						/>
					</Grid2>
					<Grid2 size={4}>
						<Button
							fullWidth
							variant='outlined'
							color='error'
							onClick={() => handleDeleteCategory(category)}
						>
							Delete Category
						</Button>
					</Grid2>
				</Grid2>

				<Box sx={{ marginTop: "10px" }}>
					<Button
						fullWidth
						variant='text'
						color='primary'
						onClick={() => setOpen(!open)}
					>
						{open ? "Hide Subcategories" : "Show Subcategories"}
					</Button>
				</Box>

				<Collapse in={open}>
					{category.subcategories.map((subcategory) => (
						<SubcategoryRow
							key={subcategory.id}
							category={category}
							subcategory={subcategory}
							handleSubcategoryChange={handleSubcategoryChange}
							handleDeleteSubcategory={handleDeleteSubcategory}
						/>
					))}

					{/* ADD SUBCATEGORY BUTTON */}
					<Box sx={{ marginTop: "15px" }}>
						<Button
							fullWidth
							variant='contained'
							color='primary'
							onClick={() => handleAddSubcategory(category)}
						>
							Add Subcategory
						</Button>
					</Box>
				</Collapse>
			</CardContent>
		</Card>
	);
};

export default CategoryCard;
