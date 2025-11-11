import {
	Avatar,
	Card,
	CardActions,
	CardContent,
	CardHeader,
	Collapse,
	styled,
	Box,
	Typography,
	Switch,
	TextField,
} from "@mui/material";
import IconButton, { IconButtonProps } from "@mui/material/IconButton";
import EditIcon from "@mui/icons-material/Edit";
import Account from "../../Models/Account";
import { Button } from "plaid-threads";
import { useState } from "react";
import formatDate from "../../Utils/DateUtils";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
}

const ExpandMore = styled(
	({ expand, ...other }: IconButtonProps & { expand: boolean }) => (
		<IconButton {...other} />
	)
)(({ theme, expand }) => ({
	marginLeft: "auto",
	transition: theme.transitions.create("transform", {
		duration: theme.transitions.duration.shortest,
	}),
	transform: expand ? "rotate(180deg)" : "rotate(0deg)",
}));

const AccountSelectableCard: React.FC<AccountSelectableCard> = ({
	account,
	isSelected,
	selectDeselectAccount,
}) => {
	const alert = useAppAlert();
	const { put, del } = useApiService(alert);
	const [expanded, setExpanded] = useState(false);
	const [isEditingName, setIsEditingName] = useState(false);
	const [editableName, setEditableName] = useState(account.name);

	const handleExpandClick = () => {
		setExpanded(!expanded);
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
							<Typography
								sx={{
									textTransform: "none",
									cursor: "pointer",
									display: "flex",
									alignItems: "center",
									gap: 0.5,
									"&:hover": {
										color: "primary.main",
										textDecoration: "underline",
									},
								}}
								onClick={() => setIsEditingName(true)}
							>
								{account.name}
								<EditIcon fontSize='small' color='action' />
							</Typography>
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
