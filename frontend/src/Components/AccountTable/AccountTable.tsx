import React, { useState } from "react";
import { AgGridReact } from "ag-grid-react";
import { ColDef, AllCommunityModule, ModuleRegistry } from "ag-grid-community";
import Account from "../../Models/Account";
import { Paper } from "@mui/material";

interface AccountTableProps {
	accounts: Account[];
}

// Row Data Interface
interface IRow {
	make: string;
	model: string;
	price: number;
	electric: boolean;
}

const AccountTable: React.FC<AccountTableProps> = ({ accounts }) => {
	// Function to capitalize the first letter of each word
	const capitalizeWords = (str: string) => {
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
	const columnDefs: ColDef[] = [
		{ field: "name", headerName: "Name", sortable: true },
		{ field: "institution_name", headerName: "Institution", sortable: true },
		{ field: "balance", headerName: "Balance", sortable: true },
		{ field: "account_type", headerName: "Type", sortable: true },
		{ field: "account_subtype", headerName: "Subtype", sortable: true },
		{ field: "last_updated", headerName: "Last Updated", sortable: true },
		{ field: "id", headerName: "ID", sortable: true },
	];

	// const paginationModel = { page: 0, pageSize: 5 };

	// // Prepare rows by adding a unique key to each row (id)
	const rows = accounts.map((account) => ({
		id: account.id,
		name: account.name,
		account_type: capitalizeWords(account.account_type),
		account_subtype: capitalizeWords(account.account_subtype),
		balance: "$" + account.balance,
		institution_name: account.institution_name,
		last_updated: formatDate(account.last_updated),
	}));
	// const [rowData, setRowData] = useState<IRow[]>([
	// 	{ make: "Tesla", model: "Model Y", price: 64950, electric: true },
	// 	{ make: "Ford", model: "F-Series", price: 33850, electric: false },
	// 	{ make: "Toyota", model: "Corolla", price: 29600, electric: false },
	// 	{ make: "Mercedes", model: "EQA", price: 48890, electric: true },
	// 	{ make: "Fiat", model: "500", price: 15774, electric: false },
	// 	{ make: "Nissan", model: "Juke", price: 20675, electric: false },
	// ]);

	// // Column Definitions: Defines & controls grid columns.
	// const [colDefs, setColDefs] = useState<ColDef<IRow>[]>([
	// 	{ field: "make" },
	// 	{ field: "model" },
	// 	{ field: "price" },
	// 	{ field: "electric" },
	// ]);

	// if (accounts.length === 0) {
	// 	return null;
	// }

	console.log("here");

	const defaultColDef: ColDef = {
		flex: 1,
	};

	return (
		<div style={{ height: "80vh", width: "100%" }}>
			<Paper sx={{ height: "50%", width: "100%" }}>
				<AgGridReact
					rowData={rows}
					columnDefs={columnDefs}
					defaultColDef={defaultColDef}
					rowSelection='multiple'
					onSelectionChanged={() => {}}
				/>
			</Paper>
		</div>
	);
};

export default AccountTable;
