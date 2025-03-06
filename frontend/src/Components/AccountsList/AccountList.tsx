import { Card, Container, Grid2 } from "@mui/material";
import Account from "../../Models/Account";
import AccountSelectableCard from "./AccountSelectableCard";

interface AccountListProps {
	accounts: Account[];
	selectDeselectAccount: (account: Account, select: boolean) => void;
}

const AccountList: React.FC<AccountListProps> = ({
	accounts,
	selectDeselectAccount,
}) => {
	return (
		<Grid2 container spacing={3}>
			{accounts.map((account: Account, i: number) => {
				return (
					<AccountSelectableCard
						key={i}
						selectDeselectAccount={selectDeselectAccount}
						account={account}
					/>
				);
			})}
		</Grid2>
	);
};

export default AccountList;
