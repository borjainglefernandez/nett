// components/BudgetForm.tsx
import React, { useEffect, useState } from "react";
import {
	TextField,
	Button,
	FormControl,
	Grid2,
	InputLabel,
	MenuItem,
	Select,
	InputAdornment,
} from "@mui/material";
import { Category, Subcategory } from "../../Models/Category";
import Budget, { BudgetFrequency } from "../../Models/Budget";

interface BudgetFormProps {
	budget: Budget;
	categories: Category[];
	onChange: (budget: Budget) => void;
	onSubmit: () => void;
	submitLabel: string;
	submitColor?: "primary" | "error";
	disabled?: boolean;
}

const BudgetForm: React.FC<BudgetFormProps> = ({
	budget,
	categories,
	onChange,
	onSubmit,
	submitLabel,
	submitColor = "primary",
	disabled = false,
}) => {
	const [category, setCategory] = useState<Category | null>();
	const [subcategory, setSubcategory] = useState<Subcategory | null>();

	useEffect(() => {
		if (budget.category_id && categories.length > 0) {
			const matchedCategory =
				categories.find((c) => c.id === budget.category_id) || null;
			if (budget.subcategory_id) {
				const matchedSubcategory =
					matchedCategory?.subcategories.find(
						(s) => s.id === budget.subcategory_id
					) || null;
				setSubcategory(matchedSubcategory);
			}

			setCategory(matchedCategory);
		} else {
			setCategory(null);
			setSubcategory(null);
		}
	}, [budget.category_id, budget.subcategory_id, categories]);

	return (
		<Grid2 container spacing={2} alignItems='center'>
			<Grid2 size={2}>
				<TextField
					label='Amount'
					type='number'
					value={budget.amount}
					onChange={(e) => {
						budget.amount = parseFloat(e.target.value);
						onChange(budget);
					}}
					fullWidth
					inputProps={{ step: "0.01", min: "0" }}
					InputProps={{
						startAdornment: <InputAdornment position='start'>$</InputAdornment>,
					}}
				/>
			</Grid2>

			<Grid2 size={2}>
				<FormControl fullWidth>
					<InputLabel>Frequency</InputLabel>
					<Select
						value={budget.frequency}
						label='Frequency'
						onChange={(e) => {
							budget.frequency = e.target.value as BudgetFrequency;
							onChange(budget);
						}}
					>
						{Object.values(BudgetFrequency).map((f) => (
							<MenuItem key={f} value={f}>
								{f}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Grid2>

			<Grid2 size={3}>
				<FormControl fullWidth>
					<InputLabel>Category</InputLabel>
					<Select
						value={category?.name || ""}
						label='Category'
						onChange={(e) => {
							const selected = categories.find(
								(c) => c.name === e.target.value
							);
							setCategory(selected || null);
							budget.category_id = selected?.id || null;
							onChange(budget);
						}}
					>
						{categories.map((cat) => (
							<MenuItem key={cat.id} value={cat.name}>
								{cat.name}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Grid2>

			<Grid2 size={3}>
				<FormControl fullWidth disabled={!category}>
					<InputLabel>Subcategory</InputLabel>
					<Select
						value={subcategory?.name || ""}
						label='Subcategory'
						onChange={(e) => {
							const sub = category?.subcategories.find(
								(s: Subcategory) => s.name === e.target.value
							);
							budget.subcategory_id = sub?.id || null;
							setSubcategory(sub || null);
							onChange(budget);
						}}
					>
						<MenuItem value='None'>None</MenuItem>
						{category?.subcategories.map((sub) => (
							<MenuItem key={sub.id} value={sub.name}>
								{sub.name}
							</MenuItem>
						))}
					</Select>
				</FormControl>
			</Grid2>

			<Grid2 size={2}>
				<Button
					fullWidth
					variant={submitColor === "error" ? "outlined" : "contained"}
					color={submitColor}
					onClick={onSubmit}
					disabled={disabled}
				>
					{submitLabel}
				</Button>
			</Grid2>
		</Grid2>
	);
};

export default BudgetForm;
