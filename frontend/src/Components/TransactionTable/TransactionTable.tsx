import React, { useEffect, useMemo, useState } from "react";
import { DataGrid, GridRenderCellParams } from "@mui/x-data-grid";
import { Paper, Select, MenuItem } from "@mui/material";
import Transaction from "../../Models/Transaction";
import { Category, Subcategory } from "../../Models/Category";

interface TransactionTableProps {
	transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({
	transactions,
}) => {
	const [categories, setCategories] = useState<Category[]>([]);
	const [categoryMap, setCategoryMap] = useState<Record<string, Subcategory[]>>(
		{}
	);

	useEffect(() => {
		fetch("/api/transaction/categories")
			.then((res) => res.json())
			.then((data: Category[]) => {
				console.log(data);
				setCategories(data);
				const map = data.reduce((acc, category) => {
					acc[category.name] = category.subcategories;
					return acc;
				}, {} as Record<string, Subcategory[]>);
				setCategoryMap(map);
			})
			.catch((err) => console.error("Error fetching categories:", err));
	}, []);

	const handleCategoryChange = (id: string, newCategory: string) => {
		console.log("Category changed for transaction", id, "to", newCategory);
		// Update transaction state here if needed
	};

	const handleSubcategoryChange = (id: string, newSubcategory: string) => {
		console.log(
			"Subcategory changed for transaction",
			id,
			"to",
			newSubcategory
		);
		// Update transaction state here if needed
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
				(
					<Select
						value={params.formattedValue.name}
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
				)
			),
		},
		{ field: "accountName", headerName: "Account", ...defaultColumnProps },
	];

	const rows = useMemo(
		() =>
			transactions.map((transaction) => ({
				id: transaction.id,
				name: transaction.name,
				amount: transaction.amount,
				category: transaction.category,
				subcategory: transaction.subcategory,
				date: transaction.date,
				accountName: transaction.accountName,
			})),
		[transactions]
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
		</Paper>
	);
};

export default TransactionTable;
