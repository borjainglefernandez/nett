import React, {
	useEffect,
	useMemo,
	useState,
	useCallback,
	useDeferredValue,
} from "react";
import {
	useReactTable,
	getCoreRowModel,
	getSortedRowModel,
	getPaginationRowModel,
	getFilteredRowModel,
	ColumnDef,
	flexRender,
	RowSelectionState,
	SortingState,
	ColumnFiltersState,
} from "@tanstack/react-table";
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
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Checkbox,
	IconButton,
	TablePagination,
	Box,
	TextField,
	InputAdornment,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
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

type TransactionRow = {
	id: string;
	name: string;
	amount: number;
	categoryObj: Category;
	subcategoryObj: Subcategory | null;
	category: string;
	subcategory: string;
	date: Date | string | undefined;
	accountName: string;
	accountId: string;
	logo_url: string | null | undefined;
	_searchText?: string; // Pre-computed search text for faster filtering
};

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
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [sorting, setSorting] = useState<SortingState>([
		{ id: "date", desc: true },
	]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [globalFilter, setGlobalFilter] = useState("");
	const [searchInput, setSearchInput] = useState("");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

	// Debounce search input with longer delay for better performance
	useEffect(() => {
		const timer = setTimeout(() => {
			setGlobalFilter(searchInput);
		}, 750); // 750ms delay - longer for better performance

		return () => clearTimeout(timer);
	}, [searchInput]);

	// Use deferred value to make filtering non-blocking
	const deferredGlobalFilter = useDeferredValue(globalFilter);

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
				const map = data.reduce((acc: Record<string, string>, account: any) => {
					acc[account.id] = account.account_type;
					return acc;
				}, {});
				setAccountTypeMap(map);
			}
		};
		fetchAccounts();
	}, []);

	useEffect(() => {
		setLocalTransactions(transactions);
	}, [transactions]);

	const updateTransactionField = useCallback(
		async (
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
		},
		[localTransactions, put, alert]
	);

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
			const selectedIds = Object.keys(rowSelection);
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
			} else if (selectedIds.length > 0) {
				const deleteTransactionResponses = await Promise.all(
					selectedIds.map((id) => del(`/api/transaction/${id}`))
				);
				const allTransactionsDeleted = deleteTransactionResponses.every(
					(response) => response !== null && response !== undefined
				);
				if (allTransactionsDeleted) {
					setLocalTransactions((prev) =>
						prev.filter((txn) => !selectedIds.includes(txn.id))
					);
					alert.trigger(
						`${selectedIds.length} transaction(s) deleted`,
						"success"
					);
					setRowSelection({});
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

	// Pre-process rows with search text
	const allRows: TransactionRow[] = useMemo(
		() =>
			localTransactions.map((transaction) => ({
				id: transaction.id,
				name: transaction.name,
				amount: transaction.amount,
				categoryObj: transaction.category,
				subcategoryObj: transaction.subcategory,
				category: transaction.category.name,
				subcategory: transaction.subcategory?.name ?? "",
				date: transaction.date,
				accountName: transaction.account_name,
				accountId: transaction.account_id,
				logo_url: transaction.logo_url,
				// Pre-compute searchable text for faster filtering
				_searchText: `${transaction.name} ${transaction.category.name} ${
					transaction.subcategory?.name ?? ""
				} ${transaction.account_name}`.toLowerCase(),
			})),
		[localTransactions]
	);

	// Filter rows client-side before passing to TanStack Table for better performance
	// Use deferred filter value for non-blocking updates
	const rows: TransactionRow[] = useMemo(() => {
		if (!deferredGlobalFilter?.trim()) return allRows;

		const searchValue = deferredGlobalFilter.toLowerCase().trim();
		// Use indexOf instead of includes for potentially better performance
		return allRows.filter((row) => {
			const searchText = row._searchText;
			return searchText ? searchText.indexOf(searchValue) !== -1 : false;
		});
	}, [allRows, deferredGlobalFilter]);

	const columns = useMemo<ColumnDef<TransactionRow>[]>(
		() => [
			{
				id: "select",
				header: ({ table }) => (
					<Checkbox
						checked={table.getIsAllPageRowsSelected()}
						indeterminate={table.getIsSomePageRowsSelected()}
						onChange={table.getToggleAllPageRowsSelectedHandler()}
					/>
				),
				cell: ({ row }) => (
					<Checkbox
						checked={row.getIsSelected()}
						onChange={row.getToggleSelectedHandler()}
					/>
				),
				size: 50,
			},
			{
				accessorKey: "date",
				header: "Date",
				cell: ({ getValue }) => {
					const date = new Date(getValue() as string);
					const formattedDate = date.toLocaleDateString(undefined, {
						month: "2-digit",
						day: "2-digit",
						year: "numeric",
					});
					const fullDateTime = date.toLocaleString();

					return (
						<Tooltip title={fullDateTime}>
							<Typography
								variant='body2'
								sx={{
									color: "text.secondary",
									whiteSpace: "nowrap",
								}}
							>
								{formattedDate}
							</Typography>
						</Tooltip>
					);
				},
				size: 100,
			},
			{
				accessorKey: "name",
				header: "Name",
				cell: ({ row }) => (
					<EditableTransactionNameCell
						id={row.original.id}
						value={row.original.name}
						logoUrl={row.original.logo_url ?? undefined}
						updateTransactionField={updateTransactionField}
					/>
				),
				size: 200,
			},
			{
				accessorKey: "amount",
				header: "Amount",
				cell: ({ row }) => {
					const amount = row.original.amount;

					// Plaid convention applies to all account types:
					// Positive = money leaving (expense/charge) = red
					// Negative = money coming in (income/payment) = green
					const isNegative = amount < 0;
					const shouldShowRed = !isNegative;

					const displayAmount = Math.abs(amount);

					return (
						<Box sx={{ textAlign: "right", width: "100%" }}>
							<Typography
								variant='body2'
								sx={{
									fontWeight: 600,
									color: shouldShowRed ? "error.main" : "success.main",
								}}
							>
								{new Intl.NumberFormat("en-US", {
									style: "currency",
									currency: "USD",
								}).format(displayAmount)}
							</Typography>
						</Box>
					);
				},
				size: 120,
			},
			{
				accessorKey: "category",
				header: "Category",
				cell: ({ row }) => (
					<Select
						value={row.original.categoryObj.name}
						onChange={(e) =>
							handleCategoryChange(row.original.id, e.target.value)
						}
						fullWidth
						size='small'
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
				size: 200,
			},
			{
				accessorKey: "subcategory",
				header: "Subcategory",
				cell: ({ row }) => (
					<Select
						value={row.original.subcategoryObj?.name ?? ""}
						onChange={(e) =>
							handleSubcategoryChange(row.original.id, e.target.value)
						}
						fullWidth
						size='small'
						sx={{
							"& .MuiOutlinedInput-notchedOutline": {
								borderColor: "divider",
							},
							"&:hover .MuiOutlinedInput-notchedOutline": {
								borderColor: "primary.main",
							},
						}}
					>
						{(categoryMap[row.original.categoryObj.name] || []).map((sub) => (
							<MenuItem key={sub.name} value={sub.name}>
								{sub.name}
							</MenuItem>
						))}
					</Select>
				),
				size: 200,
			},
			{
				accessorKey: "accountName",
				header: "Account",
				cell: ({ getValue }) => (
					<Typography variant='body2'>{getValue() as string}</Typography>
				),
				size: 150,
			},
			{
				id: "actions",
				header: "Actions",
				cell: ({ row }) => (
					<IconButton
						size='small'
						onClick={() => openDeleteDialog(row.original.id)}
						sx={{ color: "error.main" }}
					>
						<DeleteIcon fontSize='small' />
					</IconButton>
				),
				size: 80,
			},
		],
		[categories, categoryMap, accountTypeMap, updateTransactionField]
	);

	const table = useReactTable({
		data: rows,
		columns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onRowSelectionChange: setRowSelection,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		enableRowSelection: true,
		enableGlobalFilter: false, // Disable TanStack's global filter, we filter client-side
		state: {
			rowSelection,
			sorting,
			columnFilters,
		},
		initialState: {
			pagination: {
				pageSize: 25,
			},
		},
	});

	const selectedCount = Object.keys(rowSelection).length;

	return (
		<Paper
			sx={{
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
					height={400}
					textAlign='center'
				>
					<Typography variant='h6' color='text.secondary'>
						No transactions to display.
					</Typography>
				</Stack>
			) : (
				<>
					<Stack direction='row' spacing={2} mb={2} alignItems='center'>
						<TextField
							placeholder='Search transactions...'
							value={searchInput}
							onChange={(e) => setSearchInput(e.target.value)}
							size='small'
							sx={{ flexGrow: 1, maxWidth: 400 }}
							InputProps={{
								startAdornment: (
									<InputAdornment position='start'>
										<SearchIcon />
									</InputAdornment>
								),
								endAdornment: searchInput ? (
									<InputAdornment position='end'>
										<IconButton
											size='small'
											onClick={() => {
												setSearchInput("");
												setGlobalFilter("");
											}}
											edge='end'
										>
											<ClearIcon fontSize='small' />
										</IconButton>
									</InputAdornment>
								) : null,
							}}
						/>
						<Select
							value={
								(table.getColumn("category")?.getFilterValue() as string) || ""
							}
							onChange={(e) =>
								table
									.getColumn("category")
									?.setFilterValue(e.target.value || undefined)
							}
							displayEmpty
							size='small'
							sx={{ minWidth: 180 }}
						>
							<MenuItem value=''>All Categories</MenuItem>
							{categories.map((category) => (
								<MenuItem key={category.name} value={category.name}>
									{category.name}
								</MenuItem>
							))}
						</Select>
						<Select
							value={
								(table.getColumn("accountName")?.getFilterValue() as string) ||
								""
							}
							onChange={(e) =>
								table
									.getColumn("accountName")
									?.setFilterValue(e.target.value || undefined)
							}
							displayEmpty
							size='small'
							sx={{ minWidth: 180 }}
						>
							<MenuItem value=''>All Accounts</MenuItem>
							{Array.from(new Set(rows.map((row) => row.accountName))).map(
								(account) => (
									<MenuItem key={account} value={account}>
										{account}
									</MenuItem>
								)
							)}
						</Select>
						{(globalFilter || columnFilters.length > 0) && (
							<Button
								variant='outlined'
								size='small'
								onClick={() => {
									setSearchInput("");
									setGlobalFilter("");
									setColumnFilters([]);
								}}
								startIcon={<ClearIcon />}
							>
								Clear Filters
							</Button>
						)}
					</Stack>

					{selectedCount > 0 && (
						<Stack direction='row' justifyContent='space-between' mb={2}>
							<Button
								variant='contained'
								color='error'
								onClick={() => openDeleteDialog(null)}
								sx={{ mb: 2 }}
							>
								Delete Selected ({selectedCount})
							</Button>
						</Stack>
					)}

					{table.getRowModel().rows.length === 0 ? (
						<Stack
							alignItems='center'
							justifyContent='center'
							height={300}
							textAlign='center'
						>
							<Typography variant='h6' color='text.secondary'>
								No transactions match your filters.
							</Typography>
							<Button
								variant='outlined'
								size='small'
								onClick={() => {
									setSearchInput("");
									setGlobalFilter("");
									setColumnFilters([]);
								}}
								sx={{ mt: 2 }}
							>
								Clear Filters
							</Button>
						</Stack>
					) : (
						<TableContainer>
							<Table sx={{ minWidth: 650 }}>
								<TableHead>
									{table.getHeaderGroups().map((headerGroup) => (
										<TableRow key={headerGroup.id}>
											{headerGroup.headers.map((header) => (
												<TableCell
													key={header.id}
													sx={{
														backgroundColor: "action.hover",
														fontWeight: 600,
														cursor: header.column.getCanSort()
															? "pointer"
															: "default",
														userSelect: "none",
														whiteSpace: "nowrap",
													}}
													onClick={header.column.getToggleSortingHandler()}
												>
													<Box
														sx={{
															display: "flex",
															alignItems: "center",
															gap: 1,
														}}
													>
														{header.isPlaceholder
															? null
															: flexRender(
																	header.column.columnDef.header,
																	header.getContext()
															  )}
														{header.column.getCanSort() && (
															<>
																{header.column.getIsSorted() === "asc" && (
																	<ArrowUpwardIcon fontSize='small' />
																)}
																{header.column.getIsSorted() === "desc" && (
																	<ArrowDownwardIcon fontSize='small' />
																)}
																{!header.column.getIsSorted() && (
																	<Box
																		sx={{
																			width: 16,
																			height: 16,
																			opacity: 0.3,
																		}}
																	/>
																)}
															</>
														)}
													</Box>
												</TableCell>
											))}
										</TableRow>
									))}
								</TableHead>
								<TableBody>
									{table.getRowModel().rows.map((row) => (
										<TableRow
											key={row.id}
											selected={row.getIsSelected()}
											sx={{
												"&:hover": {
													backgroundColor: "action.hover",
												},
												"&.Mui-selected": {
													backgroundColor: "action.selected",
													"&:hover": {
														backgroundColor: "action.selected",
													},
												},
											}}
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell
													key={cell.id}
													sx={{
														borderBottom: "1px solid",
														borderColor: "divider",
													}}
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext()
													)}
												</TableCell>
											))}
										</TableRow>
									))}
								</TableBody>
							</Table>
						</TableContainer>
					)}

					{table.getRowModel().rows.length > 0 && (
						<Box
							sx={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								mt: 2,
							}}
						>
							<Stack direction='row' spacing={2} alignItems='center'>
								<Typography variant='body2' color='text.secondary'>
									{selectedCount > 0 && `${selectedCount} row(s) selected`}
								</Typography>
								{(globalFilter || columnFilters.length > 0) && (
									<Typography variant='body2' color='text.secondary'>
										Showing {table.getFilteredRowModel().rows.length} of{" "}
										{rows.length} transactions
									</Typography>
								)}
							</Stack>
							<Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
								<Button
									size='small'
									onClick={() => table.setPageIndex(0)}
									disabled={!table.getCanPreviousPage()}
								>
									First
								</Button>
								<Button
									size='small'
									onClick={() => table.previousPage()}
									disabled={!table.getCanPreviousPage()}
								>
									Previous
								</Button>
								<Typography variant='body2'>
									Page {table.getState().pagination.pageIndex + 1} of{" "}
									{table.getPageCount()}
								</Typography>
								<Button
									size='small'
									onClick={() => table.nextPage()}
									disabled={!table.getCanNextPage()}
								>
									Next
								</Button>
								<Button
									size='small'
									onClick={() => table.setPageIndex(table.getPageCount() - 1)}
									disabled={!table.getCanNextPage()}
								>
									Last
								</Button>
								<Select
									value={table.getState().pagination.pageSize}
									onChange={(e) => {
										table.setPageSize(Number(e.target.value));
									}}
									size='small'
									sx={{ minWidth: 80 }}
								>
									{[10, 25, 50, 100].map((pageSize) => (
										<MenuItem key={pageSize} value={pageSize}>
											{pageSize}
										</MenuItem>
									))}
								</Select>
							</Box>
						</Box>
					)}
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
							: `Are you sure you want to delete ${selectedCount} selected transaction(s)?`}
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
