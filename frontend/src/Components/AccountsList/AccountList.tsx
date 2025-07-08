import { Grid2 } from "@mui/material";
import { Typography, Box } from "@mui/material";
import Account from "../../Models/Account";
import AccountSelectableCard from "./AccountSelectableCard";

interface AccountListProps {
	accounts: Account[];
	selectedAccounts: Account[];
	selectDeselectAccount: (account: Account, select: boolean) => void;
}

const AccountList: React.FC<AccountListProps> = ({
	accounts,
	selectedAccounts,
	selectDeselectAccount,
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
				/>
			))}
		</Grid2>
	);
};

export default AccountList;
