import { useState } from "react";
import Card from "@mui/material/Card";
import { Category, Subcategory } from "../../Models/Category";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import SubcategoryRow from "./SubcategoryRow";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";

interface CategoryCardProps {
	category: Category;
	handleCategoryChange: (category: Category, value: string) => void;
	handleDeleteCategory: (category: Category) => void;
	handleAddSubcategory: (category: Category) => void;
	handleSubcategoryChange: (
		category: Category,
		subcategory: Subcategory,
		field: string,
		value: string
	) => void;
	handleDeleteSubcategory: (
		category: Category,
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

	return (
		<Card key={category.name} sx={{ marginBottom: "20px", boxShadow: 3 }}>
			<CardContent>
				<Grid container spacing={2} alignItems='center'>
					<Grid item xs={8}>
						<TextField
							fullWidth
							label='Category Name'
							value={category.name.replace(/_/g, " ")}
							onChange={(e) => handleCategoryChange(category, e.target.value)}
							sx={{ backgroundColor: "white", borderRadius: 1 }}
						/>
					</Grid>
					<Grid item xs={4}>
						<Button
							fullWidth
							variant='outlined'
							color='error'
							onClick={() => handleDeleteCategory(category)}
						>
							Delete Category
						</Button>
					</Grid>
				</Grid>

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
					{category.subcategories.map((subcategory, index) => (
						<SubcategoryRow
							key={index}
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
