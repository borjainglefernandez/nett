import { Box, Button, Divider, Grid2, TextField } from "@mui/material";
import { Category, Subcategory } from "../../Models/Category";

interface SubcategoryRowProps {
	category: Category;
	subcategory: Subcategory;
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

const SubcategoryRow: React.FC<SubcategoryRowProps> = ({
	category,
	subcategory,
	handleSubcategoryChange,
	handleDeleteSubcategory,
}) => {
	return (
		<Box key={subcategory.name} sx={{ marginTop: "10px" }}>
			<Divider sx={{ marginBottom: "10px" }} />
			<Grid2 container spacing={2} alignItems='center'>
				<Grid2 size={5}>
					<TextField
						fullWidth
						label='Subcategory Name'
						value={subcategory.name.replace(/_/g, " ")}
						onChange={(e) =>
							handleSubcategoryChange(
								category,
								subcategory,
								"subcategory",
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
						value={subcategory.description}
						onChange={(e) =>
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
						onClick={() => handleDeleteSubcategory(category, subcategory)}
					>
						Delete
					</Button>
				</Grid2>
			</Grid2>
		</Box>
	);
};

export default SubcategoryRow;
