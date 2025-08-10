import { Grid2 } from "@mui/material";
import { Typography, Box } from "@mui/material";
import Account from "../../Models/Account";
import AccountSelectableCard from "./AccountSelectableCard";
import { useState } from "react";

interface AccountListProps {
	accounts: Account[];
	selectedAccounts: Account[];
	selectDeselectAccount: (account: Account, select: boolean) => void;
	removeAccount: (accountId: string) => void;
}

const AccountList: React.FC<AccountListProps> = ({
	accounts: accounts,
	selectedAccounts,
	selectDeselectAccount,
	removeAccount,
}) => {
	if (accounts.length === 0) {
		return (
			<Box textAlign='center' mt={4} width='100%'>
				<Typography variant='h6' color='text.secondary'>
					No accounts available to display.
				</Typography>
			</Box>
		);
	}

	return (
		<Grid2 container spacing={3} alignItems='flex-start'>
			{accounts.map((account: Account, i: number) => (
				<AccountSelectableCard
					key={i}
					selectDeselectAccount={selectDeselectAccount}
					account={account}
					isSelected={selectedAccounts.includes(account)}
					removeAccount={(id) => removeAccount(id)}
				/>
			))}
		</Grid2>
	);
};

export default AccountList;
