import {
	Avatar,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	Collapse,
	IconButton,
	styled,
	Dialog,
	DialogActions,
	DialogTitle,
	DialogContentText,
	DialogContent,
	Box,
	Typography,
	Switch,
	TextField,
} from "@mui/material";
import Account from "../../Models/Account";
import { Button } from "plaid-threads";
import { useState } from "react";
import formatDate from "../../Utils/DateUtils";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import SavingsTwoToneIcon from "@mui/icons-material/SavingsTwoTone";
import CategoryTwoToneIcon from "@mui/icons-material/CategoryTwoTone";
import ClassTwoToneIcon from "@mui/icons-material/ClassTwoTone";
import useApiService from "../../hooks/apiService";
import useAppAlert from "../../hooks/appAlert";
import AppAlert from "../Alerts/AppAlert";

interface AccountSelectableCard {
	account: Account;
	isSelected: boolean;
	selectDeselectAccount: (account: Account, select: boolean) => void;
	removeAccount: (accountId: string) => void;
}

const ExpandMore = styled(IconButton)<{ expand: boolean }>(
	({ theme, expand }) => ({
		marginLeft: "auto",
		transition: theme.transitions.create("transform", {
			duration: theme.transitions.duration.shortest,
		}),
		transform: expand ? "rotate(180deg)" : "rotate(0deg)",
	})
);

const AccountSelectableCard: React.FC<AccountSelectableCard> = ({
	account,
	isSelected,
	selectDeselectAccount,
	removeAccount,
}) => {
	const alert = useAppAlert();
	const { put, del } = useApiService(alert);
	const [expanded, setExpanded] = useState(false);
	const [openRemoveAccountDialog, setOpenRemoveAccountDialog] = useState(false);
	const [isEditingName, setIsEditingName] = useState(false);
	const [editableName, setEditableName] = useState(account.name);

	const handleExpandClick = () => {
		setExpanded(!expanded);
	};

	const handleAccountRemove = async () => {
		const data = await del(`/api/account/${account.id}`);
		if (data) {
			alert.trigger("Account removed successfully.", "success");
			removeAccount(account.id);
			setOpenRemoveAccountDialog(false);
		}
		setOpenRemoveAccountDialog(false);
	};

	const handleNameUpdate = async () => {
		const data = await put("/api/account", {
			id: account.id,
			name: editableName,
		});
		if (data) {
			account.name = editableName;
			setIsEditingName(false);
			alert.trigger("Account name updated successfully.", "success");
		}
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
					<Button onClick={() => handleAccountRemove()}>Delete</Button>
					<Button secondary onClick={() => setOpenRemoveAccountDialog(false)}>
						Cancel
					</Button>
				</DialogActions>
			</Dialog>

			<Card sx={{ boxShadow: 3, borderRadius: 2 }}>
				<CardHeader
					avatar={
						<Avatar
							src={
								account.logo
									? `data:image/png;base64,${account.logo}`
									: undefined
							}
							sx={{
								bgcolor: !account.logo
									? account.account_subtype === "savings"
										? "green"
										: "blue"
									: undefined,
							}}
							aria-label='account'
						>
							{!account.logo && account.name?.[0]}
						</Avatar>
					}
					title={
						isEditingName ? (
							<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
								<TextField
									value={editableName}
									onChange={(e) => setEditableName(e.target.value)}
									size='small'
									variant='standard'
								/>
								<Button small onClick={handleNameUpdate}>
									Save
								</Button>
								<Button
									small
									secondary
									onClick={() => {
										setIsEditingName(false);
										setEditableName(account.name);
									}}
								>
									Cancel
								</Button>
							</Box>
						) : (
							<Box
								sx={{ cursor: "pointer" }}
								onClick={() => setIsEditingName(true)}
							>
								{account.name}
							</Box>
						)
					}
					action={
						<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
							<Switch
								id={account.id}
								onChange={() => {
									selectDeselectAccount(account, !isSelected);
								}}
								checked={isSelected}
								size='small'
							/>
							<IconButton
								aria-label='remove account'
								onClick={() => setOpenRemoveAccountDialog(true)}
								sx={{ color: "error.main" }}
							>
								<DeleteIcon />
							</IconButton>
							<ExpandMore
								expand={expanded}
								onClick={handleExpandClick}
								aria-expanded={expanded}
								aria-label='show more'
							>
								<ExpandMoreIcon />
							</ExpandMore>
						</Box>
					}
					subheader={`Last updated ${formatDate(account.last_updated)}`}
					sx={{ fontWeight: "bold" }}
				/>
				<CardActions disableSpacing />
				<Collapse in={expanded} timeout='auto' unmountOnExit>
					<CardContent>
						<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
								<IconButton sx={{ color: "primary.main" }}>
									<SavingsTwoToneIcon />
								</IconButton>
								<Typography variant='body2' color='textSecondary'>
									{`$${account.balance?.toFixed(2)}`}
								</Typography>
							</Box>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
								<IconButton sx={{ color: "secondary.main" }}>
									<CategoryTwoToneIcon />
								</IconButton>
								<Typography variant='body2' color='textSecondary'>
									{account.account_type}
								</Typography>
							</Box>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
								<IconButton sx={{ color: "info.main" }}>
									<ClassTwoToneIcon />
								</IconButton>
								<Typography variant='body2' color='textSecondary'>
									{account.account_subtype}
								</Typography>
							</Box>
							<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
								<IconButton sx={{ color: "warning.main" }}>
									<CategoryTwoToneIcon />
								</IconButton>
								<Typography variant='body2' color='textSecondary'>
									{`${account.transaction_count ?? 0} transactions`}
								</Typography>
							</Box>
						</Box>
					</CardContent>
				</Collapse>
			</Card>
			<AppAlert
				open={alert.open}
				message={alert.message}
				severity={alert.severity}
				onClose={alert.close}
			/>
		</>
	);
};

export default AccountSelectableCard;
