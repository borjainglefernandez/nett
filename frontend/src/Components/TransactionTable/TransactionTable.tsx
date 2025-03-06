import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Paper } from "@mui/material";
import Transaction from "../../Models/Transaction";
import formatDate from "../../Utils/DateUtils";

interface TransactionTableProps {
	transactions: Transaction[];
}

const TransactionTable: React.FC<TransactionTableProps> = ({
	transactions,
}) => {
	const defaultColumnProps = { flex: 1 };

	// Define columns for the DataGrid
	const columns = [
		{
			field: "date",
			headerName: "Date",
			...defaultColumnProps,
			sortComparator: (v1: Date, v2: Date) =>
				new Date(v1).getTime() - new Date(v2).getTime(),
		},
		{ field: "name", headerName: "Name", ...defaultColumnProps },
		{ field: "amount", headerName: "Amount", ...defaultColumnProps, flex: 0.5 },
		{
			field: "category",
			headerName: "Category",
			...defaultColumnProps,
			flex: 1.5,
		},
		{
			field: "accountName",
			headerName: "Account",
			...defaultColumnProps,
		},
	];

	const paginationModel = { page: 0, pageSize: 5 };

	// Prepare rows by adding a unique key to each row (id)
	const rows = transactions.map((transaction) => ({
		id: transaction.id,
		name: transaction.name,
		amount: transaction.amount,
		category: transaction.category,
		date: transaction.date,
		dateTime: transaction.dateTime,
		merchant: transaction.merchant,
		logoUrl: transaction.logoUrl,
		channel: transaction.channel,
		accountId: transaction.accountId,
		accountName: transaction.accountName,
	}));

	return (
		<Paper sx={{ height: 400, width: "100%" }}>
			<DataGrid
				rows={rows}
				columns={columns}
				initialState={{
					pagination: { paginationModel },
					sorting: {
						sortModel: [{ field: "date", sort: "desc" }],
					},
				}}
				pageSizeOptions={[5, 10]}
				checkboxSelection
				sx={{ border: 0 }}
			/>
		</Paper>
	);
};

export default TransactionTable;
