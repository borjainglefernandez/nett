import React, { useEffect, useMemo, useState } from "react";
import {
	DataGrid,
	GridRenderCellParams,
	GridColDef,
	GridActionsCellItem,
	GridRowSelectionModel,
} from "@mui/x-data-grid";
import {
	Paper,
	Select,
	MenuItem,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogContentText,
	DialogActions,
	Button,
	Stack,
	Typography,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import Transaction from "../../Models/Transaction";
import { Category, Subcategory } from "../../Models/Category";
import useApiService from "../../hooks/apiService";
import useAppAlert from "../../hooks/appAlert";
import AppAlert from "../Alerts/AppAlert";
import EditableTransactionNameCell from "./TransactionNameCell";
import { Tooltip } from "@mui/material";

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
	const [accountTypeMap, setAccountTypeMap] = useState<Record<string, string>>(
		{}
	);
	const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>(
		[]
	);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	const alert = useAppAlert();
	const { get, put, del } = useApiService(alert);

	useEffect(() => {
		const fetchCategories = async () => {
			const data = await get("/api/category");
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
		const fetchAccounts = async () => {
			const data = await get("/api/account");
			if (data) {
				const map = data.reduce(
					(acc: Record<string, string>, account: any) => {
						acc[account.id] = account.account_type;
						return acc;
					},
					{}
				);
				setAccountTypeMap(map);
			}
		};
		fetchAccounts();
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
			setLocalTransactions(updatedTxns);

			const response = await put(`/api/transaction`, { id, ...updates });

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

		const successMessage =
			newSubcategory != null
				? `Category changed to ${newCategory.name} with subcategory ${newSubcategory.name} for transaction ${id}`
				: `Category changed to ${newCategory.name} for transaction ${id}`;

		await updateTransactionField(
			id,
			{ category: newCategory, subcategory: newSubcategory },
			successMessage,
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

	const handleDelete = async () => {
		try {
			if (deleteTargetId) {
				const deleteTransactionResponse = await del(
					`/api/transaction/${deleteTargetId}`
				);
				if (deleteTransactionResponse) {
					setLocalTransactions((prev) =>
						prev.filter((txn) => txn.id !== deleteTargetId)
					);
					alert.trigger(`Transaction ${deleteTargetId} deleted`, "success");
				}
			} else {
				const deleteTransactionResponses = await Promise.all(
					selectionModel.map((id) => del(`/api/transaction/${id}`))
				);
				const allTransactionsDeleted = deleteTransactionResponses.every(
					(response) => response !== null && response !== undefined
				);
				if (allTransactionsDeleted) {
					setLocalTransactions((prev) =>
						prev.filter((txn) => !selectionModel.includes(txn.id))
					);
					alert.trigger(
						`${selectionModel.length} transaction(s) deleted`,
						"success"
					);
					setSelectionModel([]);
				}
			}
		} catch (error) {
			alert.trigger("Failed to delete transaction(s)", "error");
		} finally {
			setDeleteTargetId(null);
			setDeleteDialogOpen(false);
		}
	};

	const openDeleteDialog = (id: string | null) => {
		setDeleteTargetId(id);
		setDeleteDialogOpen(true);
	};

	const defaultColumnProps = { flex: 1 };
	const columns: GridColDef[] = [
		{
			field: "date",
			headerName: "Date",
			flex: 0.6,
			align: "left",
			headerAlign: "left",
			renderCell: (params: GridRenderCellParams) => {
				const date = new Date(params.value);
				const formattedDate = date.toLocaleDateString(undefined, {
					month: "2-digit",
					day: "2-digit",
					year: "numeric",
				});
				const fullDateTime = date.toLocaleString(); // full date and time in local timezone

				return (
					<Tooltip title={fullDateTime}>
						<Typography 
							variant="body2" 
							sx={{ 
								color: "text.secondary",
								display: "flex",
								alignItems: "center",
								height: "100%",
							}}
						>
							{formattedDate}
						</Typography>
					</Tooltip>
				);
			},
		},

		{
			field: "name",
			headerName: "Name",
			...defaultColumnProps,
			flex: 1.5,

			renderCell: (params: GridRenderCellParams) => (
				<EditableTransactionNameCell
					id={params.row.id}
					value={params.value}
					logoUrl={params.row.logo_url}
					updateTransactionField={updateTransactionField}
				/>
			),
		},

		{
			field: "amount",
			headerName: "Amount",
			...defaultColumnProps,
			flex: 0.6,
			align: "right",
			headerAlign: "right",
			renderCell: (params: GridRenderCellParams) => {
				const amount = params.value;
				const accountType = accountTypeMap[params.row.accountId] || "";
				const isCreditCard = accountType.toLowerCase() === "credit";
				
				// For credit cards: positive = charge (red), negative = payment (green)
				// For other accounts: positive = income (green), negative = expense (red)
				const isNegative = amount < 0;
				const shouldShowRed = isCreditCard ? !isNegative : isNegative;
				
				// Always display absolute value (remove negative sign) - color indicates direction
				const displayAmount = Math.abs(amount);
				
				return (
					<Typography
						variant="body2"
						sx={{
							fontWeight: 600,
							color: shouldShowRed ? "error.main" : "success.main",
							display: "flex",
							alignItems: "center",
							justifyContent: "flex-end",
							height: "100%",
							width: "100%",
						}}
					>
						{new Intl.NumberFormat("en-US", {
							style: "currency",
							currency: "USD",
						}).format(displayAmount)}
					</Typography>
				);
			},
		},
		{
			field: "category",
			headerName: "Category",
			...defaultColumnProps,
			flex: 1.5,
			renderCell: (params: GridRenderCellParams) => (
				<Select
					value={params.row.categoryObj.name}
					onChange={(e) => handleCategoryChange(params.row.id, e.target.value)}
					fullWidth
					size="small"
					sx={{
						"& .MuiOutlinedInput-notchedOutline": {
							borderColor: "divider",
						},
						"&:hover .MuiOutlinedInput-notchedOutline": {
							borderColor: "primary.main",
						},
					}}
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
					value={params.row.subcategoryObj?.name ?? ""}
					onChange={(e) =>
						handleSubcategoryChange(params.row.id, e.target.value)
					}
					fullWidth
					size="small"
					sx={{
						"& .MuiOutlinedInput-notchedOutline": {
							borderColor: "divider",
						},
						"&:hover .MuiOutlinedInput-notchedOutline": {
							borderColor: "primary.main",
						},
					}}
				>
					{(categoryMap[params.row.categoryObj.name] || []).map((sub) => (
						<MenuItem key={sub.name} value={sub.name}>
							{sub.name}
						</MenuItem>
					))}
				</Select>
			),
		},
		{ field: "accountName", headerName: "Account", ...defaultColumnProps },
		{
			field: "actions",
			type: "actions",
			headerName: "Actions",
			flex: 0.5,
			getActions: (params) => [
				<GridActionsCellItem
					icon={<DeleteIcon sx={{ color: "red" }} />}
					label='Delete'
					onClick={() => openDeleteDialog(params.row.id)}
					showInMenu={false}
				/>,
			],
		},
	];

	const rows = useMemo(
		() =>
			localTransactions.map((transaction) => ({
				id: transaction.id,
				name: transaction.name,
				amount: transaction.amount,
				categoryObj: transaction.category,
				subcategoryObj: transaction.subcategory,
				category: transaction.category.name, // for filtering/sorting
				subcategory: transaction.subcategory?.name ?? "", // for filtering/sorting
				date: transaction.date,
				accountName: transaction.account_name,
				accountId: transaction.account_id,
				logo_url: transaction.logo_url, 
			})),
		[localTransactions]
	);

	return (
		<Paper 
			sx={{ 
				height: 600, 
				width: "100%", 
				p: 3,
				borderRadius: 2,
				boxShadow: 2,
			}}
		>
			{rows.length === 0 ? (
				<Stack
					alignItems='center'
					justifyContent='center'
					height='100%'
					textAlign='center'
				>
					<Typography variant='h6' color='text.secondary'>
						No transactions to display.
					</Typography>
				</Stack>
			) : (
				<>
					{selectionModel.length > 0 && (
						<Stack direction='row' justifyContent='space-between' mb={2}>
							<Button
								variant='contained'
								color='error'
								onClick={() => openDeleteDialog(null)}
								sx={{ mb: 2 }}
							>
								Delete Selected ({selectionModel.length})
							</Button>
						</Stack>
					)}

					<DataGrid
						rows={rows}
						columns={columns}
						pageSizeOptions={[10, 25, 50, 100]}
						checkboxSelection
						onRowSelectionModelChange={(newSelection) =>
							setSelectionModel(newSelection)
						}
						rowSelectionModel={selectionModel}
						initialState={{
							sorting: {
								sortModel: [{ field: "date", sort: "desc" }],
							},
							pagination: {
								paginationModel: { pageSize: 25 },
							},
						}}
						sx={{
							border: 0,
							"& .MuiDataGrid-root": {
								border: "none",
							},
							"& .MuiDataGrid-cell": {
								borderBottom: "1px solid",
								borderColor: "divider",
								display: "flex",
								alignItems: "center",
							},
							"& .MuiDataGrid-columnHeaders": {
								backgroundColor: "action.hover",
								borderBottom: "2px solid",
								borderColor: "divider",
								fontWeight: 600,
							},
							"& .MuiDataGrid-row": {
								"&:hover": {
									backgroundColor: "action.hover",
								},
								"&.Mui-selected": {
									backgroundColor: "action.selected",
									"&:hover": {
										backgroundColor: "action.selected",
									},
								},
							},
							"& .MuiDataGrid-footerContainer": {
								borderTop: "1px solid",
								borderColor: "divider",
							},
							"& .MuiDataGrid-toolbarContainer": {
								padding: 1,
							},
						}}
					/>
				</>
			)}

			<Dialog
				open={deleteDialogOpen}
				onClose={() => setDeleteDialogOpen(false)}
			>
				<DialogTitle>Confirm Deletion</DialogTitle>
				<DialogContent>
					<DialogContentText>
						{deleteTargetId
							? "Are you sure you want to delete this transaction?"
							: `Are you sure you want to delete ${selectionModel.length} selected transaction(s)?`}
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
					<Button onClick={handleDelete} color='error'>
						Delete
					</Button>
				</DialogActions>
			</Dialog>

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
