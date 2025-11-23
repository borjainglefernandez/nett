import {
	Grid,
	Typography,
	Box,
	Card,
	CardContent,
	CardHeader,
	Button,
	Chip,
} from "@mui/material";
import Account from "../../Models/Account";
import AccountSelectableCard from "./AccountSelectableCard";

interface AccountListProps {
	accounts: Account[];
	selectedAccounts: Account[];
	selectDeselectAccount: (account: Account, select: boolean) => void;
	removeItem: (itemId: string) => void;
	onAccountUpdate?: () => void;
}

const AccountList: React.FC<AccountListProps> = ({
	accounts: accounts,
	selectedAccounts,
	selectDeselectAccount,
	removeItem,
	onAccountUpdate,
}) => {
	if (accounts.length === 0) {
		return (
			<Box textAlign='center' mt={4} width='100%'>
				<Typography variant='h6' color='text.secondary'>
					No accounts found.
				</Typography>
			</Box>
		);
	}

	// Group accounts by item_id
	const groupedAccounts = accounts.reduce((groups, account) => {
		const itemId = account.item_id;
		if (!groups[itemId]) {
			groups[itemId] = {
				itemId,
				institutionName: account.institution_name,
				logo: account.logo,
				accounts: [],
			};
		}
		groups[itemId].accounts.push(account);
		return groups;
	}, {} as Record<string, { itemId: string; institutionName: string; logo: string | null; accounts: Account[] }>);

	return (
		<Box>
			{Object.values(groupedAccounts).map((group) => (
				<Card key={group.itemId} sx={{ mb: 2 }}>
					<CardHeader
						title={
							<Box
								display='flex'
								alignItems='center'
								justifyContent='space-between'
							>
							<Box display='flex' alignItems='center' gap={2}>
								<Typography variant='h6'>{group.institutionName}</Typography>
									<Chip
										label={`${group.accounts.length} account${
											group.accounts.length !== 1 ? "s" : ""
										}`}
										size='small'
										color='primary'
									/>
								</Box>
								<Button
									variant='outlined'
									color='error'
									size='small'
									onClick={() => removeItem(group.itemId)}
								>
									Remove Bank Connection
								</Button>
							</Box>
						}
					/>
					<CardContent sx={{ pt: 2 }}>
						<Grid container spacing={2}>
							{group.accounts.map((account: Account, i: number) => (
								<Grid item xs={12} sm={6} key={account.id}>
									<AccountSelectableCard
										selectDeselectAccount={selectDeselectAccount}
										account={account}
										isSelected={selectedAccounts.includes(account)}
										onAccountUpdate={onAccountUpdate}
									/>
								</Grid>
							))}
						</Grid>
					</CardContent>
				</Card>
			))}
		</Box>
	);
};

export default AccountList;
