import React, { useEffect, useMemo, useState } from "react";
import { DataGrid, GridRenderCellParams } from "@mui/x-data-grid";
import { Paper, Select, MenuItem } from "@mui/material";
import Transaction from "../../Models/Transaction";
import { Category, Subcategory } from "../../Models/Category";
import useApiService from "../../hooks/apiService";
import useAppAlert from "../../hooks/appAlert";
import AppAlert from "../Alerts/AppAlert";

interface TransactionTableProps {
	transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({
	transactions,
}) => {
	const [localTransactions, setLocalTransactions] =
		useState<Transaction[]>(transactions);
	const [categories, setCategories] = useState<Category[]>([]);
	const [categoryMap, setCategoryMap] = useState<Record<string, Subcategory[]>>(
		{}
	);
	const { get, put } = useApiService();
	const alert = useAppAlert();

	useEffect(() => {
		const fetchCategories = async () => {
			const data = await get("/api/transaction/categories");
			if (data) {
				setCategories(data);
				const map = data.reduce(
					(acc: Record<string, Subcategory[]>, category: Category) => {
						acc[category.name] = category.subcategories;
						return acc;
					},
					{}
				);
				setCategoryMap(map);
			}
		};
		fetchCategories();
	}, []);

	useEffect(() => {
		setLocalTransactions(transactions);
	}, [transactions]);

	const updateTransactionField = async (
		id: string,
		updates: Partial<Transaction>,
		successMsg: string,
		errorMsg: string
	) => {
		try {
			const updatedTxns = localTransactions.map((txn) =>
				txn.id === id ? { ...txn, ...updates } : txn
			);
			console.log(updatedTxns);
			setLocalTransactions(updatedTxns);

			const response = await put(`/api/transaction/${id}`, { id, ...updates });

			if (response) {
				alert.trigger(successMsg, "success");
			}
		} catch (error) {
			console.error(errorMsg, error);
			alert.trigger(errorMsg, "error");
		}
	};

	const handleCategoryChange = async (id: string, newCategoryName: string) => {
		const newCategory = categories.find((cat) => cat.name === newCategoryName);

		if (!newCategory) {
			alert.trigger(`Category ${newCategoryName} not found`, "error");
			return;
		}

		const newSubcategory = newCategory.subcategories?.[0] || null;

		await updateTransactionField(
			id,
			{ category: newCategory, subcategory: newSubcategory },
			`Category changed to ${newCategory.name}${
				newSubcategory ? ` with subcategory ${newSubcategory.name}` : ""
			} for transaction ${id}`,
			`Failed to update category for transaction ${id}`
		);
	};

	const handleSubcategoryChange = async (
		id: string,
		newSubcategoryName: string
	) => {
		const transaction = localTransactions.find((txn) => txn.id === id);
		if (!transaction) return;

		const currentCategory = transaction.category;
		const subcategories = categoryMap[currentCategory.name] || [];

		const newSubcategory = subcategories.find(
			(sub) => sub.name === newSubcategoryName
		);

		if (!newSubcategory) {
			alert.trigger(`Subcategory ${newSubcategoryName} not found`, "error");
			return;
		}

		await updateTransactionField(
			id,
			{ subcategory: newSubcategory },
			`Subcategory changed to ${newSubcategory.name} for transaction ${id}`,
			`Failed to update subcategory for transaction ${id}`
		);
	};

	const defaultColumnProps = { flex: 1 };
	const columns = [
		{ field: "date", headerName: "Date", ...defaultColumnProps },
		{ field: "name", headerName: "Name", ...defaultColumnProps },
		{ field: "amount", headerName: "Amount", ...defaultColumnProps, flex: 0.5 },
		{
			field: "category",
			headerName: "Category",
			...defaultColumnProps,
			flex: 1.5,
			renderCell: (params: GridRenderCellParams) => (
				<Select
					value={params.formattedValue.name || "OTHER"}
					onChange={(e) => handleCategoryChange(params.row.id, e.target.value)}
					fullWidth
				>
					{categories.map((category) => (
						<MenuItem key={category.name} value={category.name}>
							{category.name}
						</MenuItem>
					))}
				</Select>
			),
		},
		{
			field: "subcategory",
			headerName: "Subcategory",
			...defaultColumnProps,
			flex: 1.5,
			renderCell: (params: GridRenderCellParams) => (
				<Select
					value={params.formattedValue.name || ""}
					onChange={(e) =>
						handleSubcategoryChange(params.row.id, e.target.value)
					}
					fullWidth
				>
					{(categoryMap[params.row.category.name] || []).map((sub) => (
						<MenuItem key={sub.name} value={sub.name}>
							{sub.name}
						</MenuItem>
					))}
				</Select>
			),
		},
		{ field: "accountName", headerName: "Account", ...defaultColumnProps },
	];

	const rows = useMemo(
		() =>
			localTransactions.map((transaction) => ({
				id: transaction.id,
				name: transaction.name,
				amount: transaction.amount,
				category: transaction.category,
				subcategory: transaction.subcategory,
				date: transaction.date,
				accountName: transaction.account_name,
			})),
		[localTransactions]
	);

	return (
		<Paper sx={{ height: 400, width: "100%" }}>
			<DataGrid
				rows={rows}
				columns={columns}
				pageSizeOptions={[5, 10]}
				checkboxSelection
				sx={{ border: 0 }}
			/>
			<AppAlert
				open={alert.open}
				message={alert.message}
				severity={alert.severity}
				onClose={alert.close}
			/>
		</Paper>
	);
};

export default TransactionTable;
