import { useState } from "react";
import { Box, Button, Divider, Grid2, TextField } from "@mui/material";
import { Category, Subcategory } from "../../Models/Category";

interface SubcategoryRowProps {
	category: Category;
	subcategory: Subcategory;
	handleSubcategoryChange: (
		category: Category,
		subcategory: Subcategory,
		field: keyof Subcategory,
		value: string
	) => void;
	handleDeleteSubcategory: (subcategory: Subcategory) => void;
}

const SubcategoryRow: React.FC<SubcategoryRowProps> = ({
	category,
	subcategory,
	handleSubcategoryChange,
	handleDeleteSubcategory,
}) => {
	const [subcategoryNameValue, setSubcategoryNameValue] = useState(
		subcategory.name.replace(/_/g, " ")
	);
	const [subcategoryDescriptionValue, setSubcategoryDescriptionValue] =
		useState(subcategory.description);

	const [nameError, setNameError] = useState(!subcategory.name.trim());
	const [descriptionError, setDescriptionError] = useState(
		!subcategory.description.trim()
	);

	const handleNameBlur = () => {
		if (!subcategoryNameValue.trim()) {
			setNameError(true);
		} else {
			setNameError(false);
			handleSubcategoryChange(
				category,
				subcategory,
				"name",
				subcategoryNameValue
			);
		}
	};

	const handleDescriptionBlur = () => {
		if (!subcategoryDescriptionValue.trim()) {
			setDescriptionError(true);
		} else {
			setDescriptionError(false);
			handleSubcategoryChange(
				category,
				subcategory,
				"description",
				subcategoryDescriptionValue
			);
		}
	};

	return (
		<Box key={subcategory.name} sx={{ marginTop: "10px" }}>
			<Divider sx={{ marginBottom: "10px" }} />
			<Grid2 container spacing={2} alignItems='center'>
				<Grid2 size={5}>
					<TextField
						fullWidth
						required
						error={nameError}
						helperText={nameError ? "Name is required" : ""}
						label='Subcategory Name'
						value={subcategoryNameValue}
						onChange={(e) => setSubcategoryNameValue(e.target.value)}
						onBlur={handleNameBlur}
						sx={{ backgroundColor: "white", borderRadius: 1 }}
					/>
				</Grid2>
				<Grid2 size={5}>
					<TextField
						fullWidth
						required
						error={descriptionError}
						helperText={descriptionError ? "Description is required" : ""}
						label='Description'
						value={subcategoryDescriptionValue}
						onChange={(e) => setSubcategoryDescriptionValue(e.target.value)}
						onBlur={handleDescriptionBlur}
						sx={{ backgroundColor: "white", borderRadius: 1 }}
					/>
				</Grid2>
				<Grid2 size={2}>
					<Button
						fullWidth
						variant='outlined'
						color='error'
						onClick={() => handleDeleteSubcategory(subcategory)}
					>
						Delete
					</Button>
				</Grid2>
			</Grid2>
		</Box>
	);
};

export default SubcategoryRow;
