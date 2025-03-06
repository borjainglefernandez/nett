import {
	Avatar,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	Collapse,
	IconButtonProps,
	IconButton,
	styled,
	Dialog,
	DialogActions,
	DialogTitle,
	DialogContentText,
	DialogContent,
	Box,
	Typography,
} from "@mui/material";
import Account from "../../Models/Account";
import { Button, Checkbox } from "plaid-threads";
import { useState } from "react";
import formatDate from "../../Utils/DateUtils";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import SavingsTwoToneIcon from "@mui/icons-material/SavingsTwoTone";
import CategoryTwoToneIcon from "@mui/icons-material/CategoryTwoTone";
import ClassTwoToneIcon from "@mui/icons-material/ClassTwoTone";

interface AccountSelectableCard {
	account: Account;
	selectDeselectAccount: (account: Account, select: boolean) => void;
}

interface ExpandMoreProps extends IconButtonProps {
	expand: boolean;
}

const ExpandMore = styled((props: ExpandMoreProps) => {
	const { expand, ...other } = props;
	return <IconButton {...other} />;
})(({ theme }) => ({
	marginLeft: "auto",
	transition: theme.transitions.create("transform", {
		duration: theme.transitions.duration.shortest,
	}),
	variants: [
		{
			props: ({ expand }) => !expand,
			style: {
				transform: "rotate(0deg)",
			},
		},
		{
			props: ({ expand }) => !!expand,
			style: {
				transform: "rotate(180deg)",
			},
		},
	],
}));

const AccountSelectableCard: React.FC<AccountSelectableCard> = ({
	account,
	selectDeselectAccount,
}) => {
	// 'Hooks
	const [selected, setSelected] = useState(true);
	const [expanded, setExpanded] = useState(false);
	const [openRemoveAccountDialog, setOpenRemoveAccountDialog] = useState(false);

	const handleExpandClick = () => {
		setExpanded(!expanded);
	};

	const handleAccountRemove = () => {
		// TODO: delete account
		console.log("DELETE ACCOUNT");
		setOpenRemoveAccountDialog(false);
	};

	return (
		<>
			<Dialog
				open={openRemoveAccountDialog}
				onClose={() => setOpenRemoveAccountDialog(false)}
				aria-labelledby='alert-dialog-title'
				aria-describedby='alert-dialog-description'
			>
				<DialogTitle id='alert-dialog-title'>
					{`Are you sure you would like to remove ${account.name}?`}
				</DialogTitle>
				<DialogContent>
					<DialogContentText id='alert-dialog-description'>
						This action cannot be undone. You must re-add the account later.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button submitting onClick={handleAccountRemove}>
						Delete
					</Button>
					<Button secondary onClick={() => setOpenRemoveAccountDialog(false)}>
						Cancel
					</Button>
				</DialogActions>
			</Dialog>
			<Card>
				<CardHeader
					avatar={
						<Avatar sx={{ bgcolor: "red" }} aria-label='recipe'>
							R
						</Avatar>
					}
					title={account.name}
					action={
						<Checkbox
							id={account.id}
							onChange={(e) => {
								selectDeselectAccount(account, !selected);
								setSelected(!selected);
							}}
							value={selected}
						/>
					}
					subheader={`Last updated ${formatDate(account.last_updated)}`}
				/>
				<CardActions disableSpacing>
					<IconButton
						aria-label='remove account'
						onClick={() => setOpenRemoveAccountDialog(true)}
					>
						<DeleteIcon color={"error"} />
					</IconButton>
					<ExpandMore
						expand={expanded}
						onClick={handleExpandClick}
						aria-expanded={expanded}
						aria-label='show more'
					>
						<ExpandMoreIcon />
					</ExpandMore>
				</CardActions>
				<Collapse in={expanded} timeout='auto' unmountOnExit>
					<CardContent>
						<Box sx={{ display: "flex", alignItems: "center" }}>
							<IconButton>
								<SavingsTwoToneIcon />
							</IconButton>
							<Typography>{`$${account.balance}`}</Typography>
							<IconButton>
								<CategoryTwoToneIcon />
							</IconButton>
							<Typography>{`${account.account_type}`}</Typography>
							<IconButton>
								<ClassTwoToneIcon />
							</IconButton>
							<Typography>{`${account.account_subtype}`}</Typography>
						</Box>
					</CardContent>
				</Collapse>
			</Card>
		</>
	);
};

export default AccountSelectableCard;
