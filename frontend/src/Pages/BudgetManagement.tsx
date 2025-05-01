import { useEffect, useState } from "react";
import {
	Button,
	Box,
	Typography,
	Card,
	CircularProgress,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
} from "@mui/material";
import { Category } from "../Models/Category";
import useAppAlert from "../hooks/appAlert";
import useApiService from "../hooks/apiService";
import { useNavigate } from "react-router-dom";
import { MAIN_PAGE_ROUTE } from "../Constants/RouteConstants";
import Budget, { BudgetFrequency } from "../Models/Budget";
import AppAlert from "../Components/Alerts/AppAlert";
import BudgetForm from "../Components/Budget/BudgetForm";

const BudgetManagement = () => {
	const alert = useAppAlert();
	const { get, post, put, del } = useApiService(alert);
	const navigate = useNavigate();

	const [categories, setCategories] = useState<Category[]>([]);
	const [budgets, setBudgets] = useState<Budget[]>([]);
	const [modifiedBudgets, setModifiedBudgets] = useState<Set<string>>(
		new Set()
	);
	const [loading, setLoading] = useState<boolean>(true);

	const blankBudget: Budget = {
		id: "",
		amount: 0.0,
		frequency: null,
		category_id: null,
		subcategory_id: null,
	};
	const [newBudget, setNewBudget] = useState<Budget>(blankBudget);

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [budgetToDelete, setBudgetToDelete] = useState<Budget | null>(null);

	const handleBackButtonClick = () => navigate(MAIN_PAGE_ROUTE);

	const fetchBudgets = async () => {
		const data = await get("/api/budget");
		if (data) setBudgets(data);
	};

	useEffect(() => {
		const fetchCategories = async () => {
			const data = await get("/api/transaction/categories");
			if (data) setCategories(data);
		};
		fetchCategories();
		fetchBudgets();
		setLoading(false);
	}, []);

	const handleAddBudget = async () => {
		const newBudgetObj: Budget = {
			id: "",
			amount: newBudget.amount,
			category_id: newBudget.category_id,
			subcategory_id: newBudget.subcategory_id || null,
			frequency: newBudget.frequency as BudgetFrequency,
		};
		const data = await post("/api/budget", newBudgetObj);
		if (data) {
			const category = categories.find((c) => c.id === newBudget.category_id);
			const subcategory = category?.subcategories.find(
				(s) => s.id === newBudget.subcategory_id
			);
			const name = category?.name || subcategory?.name || "Unnamed";
			alert.trigger(`Budget "${name}" created successfully!`, "success");
			setNewBudget({ ...blankBudget });
			await fetchBudgets();
		}
	};

	const handleOnSaveChanges = async () => {
		if (modifiedBudgets.size > 0) {
			const updatedBudgets = budgets.filter((b) => modifiedBudgets.has(b.id));

			const results = await Promise.all(
				updatedBudgets.map((budget: Budget) => put("/api/budget", budget))
			);

			const failed = results.filter((res) => res === undefined);

			if (failed.length === 0) {
				alert.trigger("Budgets updated successfully!", "success");
				setModifiedBudgets(new Set());
			}
		} else {
			alert.trigger("No changes to save", "info");
		}
	};

	const handleConfirmDelete = async () => {
		if (budgetToDelete) {
			console.log("Deleting budget:", budgetToDelete);
			const success = await del(`/api/budget/${budgetToDelete.id}`);
			if (success) {
				alert.trigger("Budget deleted", "success");
				setBudgets((prev) => prev.filter((b) => b.id !== budgetToDelete.id));
			}
			setDeleteDialogOpen(false);
		}
	};

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
			<Button
				variant='contained'
				color='primary'
				onClick={handleBackButtonClick}
				sx={{ mb: 2 }}
			>
				Back to Home
			</Button>
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginBottom: "20px",
				}}
			>
				<Typography variant='h4' sx={{ fontWeight: "bold" }}>
					Budget Management
				</Typography>
				<Button
					variant='contained'
					color='success'
					onClick={handleOnSaveChanges}
				>
					Save Changes
				</Button>
			</Box>

			{/* New Budget Form */}
			<Card sx={{ padding: 2, mb: 3, boxShadow: 2 }}>
				<BudgetForm
					budget={newBudget}
					categories={categories}
					onChange={(updatedBudget: Budget) => {
						setNewBudget({ ...updatedBudget });
					}}
					onSubmit={handleAddBudget}
					submitLabel='Add Budget'
					submitColor='primary'
					disabled={!newBudget.category_id || !newBudget.amount}
				/>
			</Card>

			{/* Existing Budgets */}
			{budgets.map((budget, index) => (
				<Card key={budget.id} sx={{ padding: 2, mb: 3, boxShadow: 2 }}>
					<BudgetForm
						budget={budget}
						categories={categories}
						onChange={(updatedBudget: Budget) => {
							const updated = [...budgets];
							updated[index] = updatedBudget;
							setBudgets(updated);
							setModifiedBudgets((prev) => new Set(prev).add(updatedBudget.id));
						}}
						onSubmit={() => {
							setBudgetToDelete(budget);
							setDeleteDialogOpen(true);
						}}
						submitLabel='Delete Budget'
						submitColor='error'
					/>
				</Card>
			))}

			{/* Delete Confirmation Dialog */}
			<Dialog
				open={deleteDialogOpen}
				onClose={() => setDeleteDialogOpen(false)}
			>
				<DialogTitle>Confirm Delete</DialogTitle>
				<DialogContent>
					Are you sure you want to delete this budget?
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
					<Button color='error' onClick={handleConfirmDelete}>
						Delete
					</Button>
				</DialogActions>
			</Dialog>

			<AppAlert {...alert} onClose={alert.close} />
		</Box>
	);
};

export default BudgetManagement;
