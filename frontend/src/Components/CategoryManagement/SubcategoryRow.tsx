import Box from "@mui/material/Box";
import { Category, Subcategory } from "../../Models/Category";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";

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
		<Box key={subcategory.subcategory} sx={{ marginTop: "10px" }}>
			<Divider sx={{ marginBottom: "10px" }} />
			<Grid container spacing={2} alignItems='center'>
				<Grid item xs={5}>
					<TextField
						fullWidth
						label='Subcategory Name'
						value={subcategory.subcategory.replace(/_/g, " ")}
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
				</Grid>
				<Grid item xs={5}>
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
				</Grid>
				<Grid item xs={2}>
					<Button
						fullWidth
						variant='outlined'
						color='error'
						onClick={() => handleDeleteSubcategory(category, subcategory)}
					>
						Delete
					</Button>
				</Grid>
			</Grid>
		</Box>
	);
};

export default SubcategoryRow;
