import { useState } from "react";
import { Box, Button, Divider, Grid2, TextField } from "@mui/material";
import { Category, Subcategory } from "../../Models/Category";

interface SubcategoryRowProps {
	category: Category;
	subcategory: Subcategory;
	handleSubcategoryChange: (
		category: Category,
		subcategory: Subcategory,
		field: keyof Subcategory, // Enforces valid fields
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

	return (
		<Box key={subcategory.name} sx={{ marginTop: "10px" }}>
			<Divider sx={{ marginBottom: "10px" }} />
			<Grid2 container spacing={2} alignItems='center'>
				<Grid2 size={5}>
					<TextField
						fullWidth
						label='Subcategory Name'
						value={subcategoryNameValue}
						onChange={(e) => setSubcategoryNameValue(e.target.value)}
						onBlur={(e) =>
							handleSubcategoryChange(
								category,
								subcategory,
								"name",
								e.target.value
							)
						}
						sx={{ backgroundColor: "white", borderRadius: 1 }}
					/>
				</Grid2>
				<Grid2 size={5}>
					<TextField
						fullWidth
						label='Description'
						value={subcategoryDescriptionValue}
						onChange={(e) => setSubcategoryDescriptionValue(e.target.value)}
						onBlur={(e) =>
							handleSubcategoryChange(
								category,
								subcategory,
								"description",
								e.target.value
							)
						}
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
