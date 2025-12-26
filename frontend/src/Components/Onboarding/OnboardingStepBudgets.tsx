import React from "react";
import {
	Box,
	Typography,
	Button,
	Alert,
	Card,
	CardContent,
	List,
	ListItem,
	ListItemIcon,
	ListItemText,
} from "@mui/material";
import { Info, TrendingUp, AccountBalance } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { BUDGET_MANAGEMENT_PAGE_ROUTE } from "../../Constants/RouteConstants";

interface OnboardingStepBudgetsProps {
	onNext: () => void;
	onSkip: () => void;
}

const OnboardingStepBudgets: React.FC<OnboardingStepBudgetsProps> = ({
	onNext,
	onSkip,
}) => {
	const navigate = useNavigate();

	const handleCreateBudgets = () => {
		navigate(BUDGET_MANAGEMENT_PAGE_ROUTE);
	};

	return (
		<Box>
			<Typography variant="h6" gutterBottom>
				Create Your Budgets (Optional)
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Budgets help you track your spending and stay on top of your finances.
				You can set this up now or come back to it later.
			</Typography>

			<Alert severity="info" icon={<Info />} sx={{ mb: 3 }}>
				You can always create budgets later from the Budget Management page.
			</Alert>

			<Card sx={{ mb: 3 }}>
				<CardContent>
					<Typography variant="subtitle1" gutterBottom sx={{ fontWeight: "bold" }}>
						Benefits of Setting Up Budgets:
					</Typography>
					<List>
						<ListItem>
							<ListItemIcon>
								<TrendingUp color="primary" />
							</ListItemIcon>
							<ListItemText
								primary="Track Spending"
								secondary="Monitor your expenses against your budget limits"
							/>
						</ListItem>
						<ListItem>
							<ListItemIcon>
								<AccountBalance color="primary" />
							</ListItemIcon>
							<ListItemText
								primary="Stay on Track"
								secondary="Get alerts when you're approaching your budget limits"
							/>
						</ListItem>
					</List>
				</CardContent>
			</Card>

			<Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
				<Button variant="outlined" onClick={handleCreateBudgets} fullWidth>
					Create Budgets Now
				</Button>
				<Button variant="text" onClick={onSkip} fullWidth>
					I'll Do This Later
				</Button>
			</Box>

			<Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
				<Button variant="contained" onClick={onNext}>
					Continue to Next Step
				</Button>
			</Box>
		</Box>
	);
};

export default OnboardingStepBudgets;

