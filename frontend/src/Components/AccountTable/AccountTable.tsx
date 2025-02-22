import React from "react";
import { DataGrid } from "@mui/x-data-grid";
import { Paper } from "@mui/material";
import Account from "../../Models/Account";

interface AccountTableProps {
	accounts: Account[];
}

const AccountTable: React.FC<AccountTableProps> = ({ accounts }) => {
	// Function to capitalize the first letter of each word
	const capitalizeWords = (str: string) => {
		console.log("Here for word " + str);
		if (!str) return ""; // Handle undefined, null, or empty string

		return str
			.split(" ")
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(" ");
	};

	const formatDate = (date: Date): string => {
		const month = date.getMonth() + 1; // getMonth() is zero-based, so add 1
		const day = date.getDate();
		const year = date.getFullYear() % 100; // Get last two digits of the year
		const hours = date.getHours();
		const minutes = date.getMinutes();
		const ampm = hours >= 12 ? "pm" : "am";

		const formattedDate = `${month.toString().padStart(2, "0")}/${day
			.toString()
			.padStart(2, "0")}/${year.toString().padStart(2, "0")} at ${(
			hours % 12 || 12
		)
			.toString()
			.padStart(2, "0")}:${minutes.toString().padStart(2, "0")} ${ampm}`;

		return formattedDate;
	};

	// Define columns for the DataGrid
	const columns = [
		{ field: "id", headerName: "ID", width: 120 },
		{ field: "name", headerName: "Name", width: 200 },
		{
			field: "account_type",
			headerName: "Type",
			width: 150,
		},
		{ field: "account_subtype", headerName: "Subtype", width: 200 },
		{ field: "balance", headerName: "Balance", width: 150 },
		{ field: "institution_id", headerName: "Institution", width: 180 },
		{
			field: "last_updated",
			headerName: "Last Updated",
			width: 180,
		},
	];

	const paginationModel = { page: 0, pageSize: 5 };

	// Prepare rows by adding a unique key to each row (id)
	const rows = accounts.map((account) => ({
		id: account.id,
		name: account.name,
		account_type: capitalizeWords(account.account_type),
		account_subtype: capitalizeWords(account.account_subtype),
		balance: "$" + account.balance,
		institution_id: account.institution_id,
		last_updated: formatDate(account.last_updated),
	}));

	return (
		<Paper sx={{ height: 400, width: "100%" }}>
			<DataGrid
				rows={rows}
				columns={columns}
				initialState={{ pagination: { paginationModel } }}
				pageSizeOptions={[5, 10]}
				checkboxSelection
				sx={{ border: 0 }}
			/>
		</Paper>
	);
};

export default AccountTable;
