import React, { useEffect, useState } from "react";
import {
	Box,
	Typography,
	TextField,
	Button,
	Card,
	CardContent,
	Grid2,
	CircularProgress,
	Alert,
} from "@mui/material";
import { Category, Subcategory } from "../../Models/Category";
import useAppAlert from "../../hooks/appAlert";
import useApiService from "../../hooks/apiService";
import { hasSufficientCategories } from "../../Utils/onboardingUtils";
import CategoryCard from "../CategoryManagement/CategoryCard";

interface OnboardingStepCategoriesProps {
	onComplete: (complete: boolean) => void;
	onNext: () => void;
}

const OnboardingStepCategories: React.FC<OnboardingStepCategoriesProps> = ({
	onComplete,
	onNext,
}) => {
	const alert = useAppAlert();
	const { get, post, put, del } = useApiService(alert);
	const [categories, setCategories] = useState<Category[]>([]);
	const [newCategory, setNewCategory] = useState<string>("");
	const [loading, setLoading] = useState<boolean>(true);
	const [modifiedCategories, setModifiedCategories] = useState<Set<string>>(
		new Set()
	);
	const [modifiedSubcategories, setModifiedSubcategories] = useState<
		Set<string>
	>(new Set());

	useEffect(() => {
		const fetchCategories = async () => {
			const data = await get("/api/category");
			if (data) {
				setCategories(data);
			}
			setLoading(false);
		};
		fetchCategories();
	}, []);

	useEffect(() => {
		const isComplete = hasSufficientCategories(categories);
		onComplete(isComplete);
	}, [categories, onComplete]);

	const handleAddCategory = async () => {
		if (!newCategory.trim()) return;
		const newCategoryObj: Category = {
			id: "",
			name: newCategory.trim(),
			subcategories: [],
		};
		setCategories((prev) => [...prev, newCategoryObj]);
		const data = await post("/api/category", newCategoryObj);
		if (data) {
			setNewCategory("");
			alert.trigger(
				`Category "${newCategory}" created successfully!`,
				"success"
			);
		}
	};

	const handleCategoryChange = async (category: Category, value: string) => {
		try {
			setCategories((prev) =>
				prev.map((otherCategory) =>
					otherCategory.id === category.id
						? { ...otherCategory, name: value }
						: otherCategory
				)
			);
			setModifiedCategories((prev) => new Set(prev).add(category.id));
		} catch (error) {
			console.error("Error updating category", error);
		}
	};

	const handleAddSubcategory = (category: Category) => {
		setCategories((prev) =>
			prev.map((otherCategory) =>
				category.id === otherCategory.id
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

	const handleSubcategoryChange = async (
		category: Category,
		subcategory: Subcategory,
		field: keyof Subcategory,
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
			if (subcategory.id) {
				setModifiedSubcategories((prev) => new Set(prev).add(subcategory.id));
			}
		} catch (error) {
			console.error("Error updating subcategory", error);
		}
	};

	const handleDeleteCategory = async (category: Category) => {
		if (category.id) {
			const data = await del(`/api/category/${category.id}`);
			if (data) {
				setCategories((prev) => prev.filter((cat) => cat.id !== category.id));
				alert.trigger(
					`Category "${category.name}" deleted successfully!`,
					"success"
				);
			}
		} else {
			// Remove from state if it doesn't have an ID
			setCategories((prev) => prev.filter((cat) => cat.id !== category.id));
		}
	};

	const handleDeleteSubcategory = async (subcategory: Subcategory) => {
		if (subcategory.id) {
			const data = await del(`/api/subcategory/${subcategory.id}`);
			if (data) {
				setCategories((prev) =>
					prev.map((cat) =>
						cat.id === subcategory.category_id
							? {
									...cat,
									subcategories: cat.subcategories.filter(
										(sub) => sub.id !== subcategory.id
									),
							  }
							: cat
					)
				);
				alert.trigger(
					`Subcategory "${subcategory.name}" deleted successfully`,
					"success"
				);
			}
		} else {
			// Remove from state if it doesn't have an ID
			setCategories((prev) =>
				prev.map((cat) =>
					cat.id === subcategory.category_id
						? {
								...cat,
								subcategories: cat.subcategories.filter(
									(sub) => sub.id !== subcategory.id
								),
						  }
						: cat
				)
			);
		}
	};

	const handleSaveChanges = async () => {
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
			return;
		}

		// Make API requests for each modified category
		await Promise.all(
			categoryUpdates.map((category: Category) =>
				put("/api/category", category)
			)
		);

		await Promise.all(
			subcategoryUpdates.map((subcategory: Subcategory) =>
				subcategory.id
					? put("/api/subcategory", subcategory)
					: post("/api/subcategory", subcategory)
			)
		);

		setModifiedCategories(new Set());
		setModifiedSubcategories(new Set());
		alert.trigger("Changes saved successfully!", "success");
	};

	if (loading) {
		return (
			<Box
				display='flex'
				justifyContent='center'
				alignItems='center'
				minHeight='400px'
			>
				<CircularProgress />
			</Box>
		);
	}

	const categoryCount = categories.length;
	const isComplete = hasSufficientCategories(categories);
	const remaining = Math.max(0, 3 - categoryCount);

	return (
		<Box>
			<Typography variant='h6' gutterBottom>
				Set Up Your Categories
			</Typography>
			<Typography variant='body2' color='text.secondary' sx={{ mb: 3 }}>
				Categories help organize your transactions. Create at least 3 categories
				to get started.
			</Typography>

			{!isComplete && (
				<Alert severity='info' sx={{ mb: 3 }}>
					You need {remaining} more categor{remaining === 1 ? "y" : "ies"} to
					continue.
				</Alert>
			)}

			{isComplete && (
				<Alert severity='success' sx={{ mb: 3 }}>
					Great! You have {categoryCount} categor
					{categoryCount === 1 ? "y" : "ies"}. You can proceed to the next step.
				</Alert>
			)}

			<Card sx={{ padding: "20px", marginBottom: "20px", boxShadow: 2 }}>
				<Grid2 container spacing={2} alignItems='center'>
					<Grid2 size={8}>
						<TextField
							fullWidth
							label='New Category Name'
							value={newCategory}
							onChange={(e) => setNewCategory(e.target.value)}
							onKeyPress={(e) => {
								if (e.key === "Enter") {
									handleAddCategory();
								}
							}}
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
					key={category.id || category.name}
					category={category}
					handleCategoryChange={handleCategoryChange}
					handleDeleteCategory={handleDeleteCategory}
					handleAddSubcategory={handleAddSubcategory}
					handleSubcategoryChange={handleSubcategoryChange}
					handleDeleteSubcategory={handleDeleteSubcategory}
				/>
			))}

			{(modifiedCategories.size > 0 || modifiedSubcategories.size > 0) && (
				<Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
					<Button
						variant='contained'
						color='success'
						onClick={handleSaveChanges}
					>
						Save Changes
					</Button>
				</Box>
			)}
		</Box>
	);
};

export default OnboardingStepCategories;
