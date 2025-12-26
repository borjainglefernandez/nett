import React, { useContext, useEffect } from "react";
import {
	Box,
	Typography,
	Button,
	Alert,
	CircularProgress,
} from "@mui/material";
import { CheckCircle } from "@mui/icons-material";
import Context from "../../Context";
import Link from "../Link";
import useAppAlert from "../../hooks/appAlert";
import useApiService from "../../hooks/apiService";

interface OnboardingStepAccountsProps {
	onComplete: () => void;
}

const OnboardingStepAccounts: React.FC<OnboardingStepAccountsProps> = ({
	onComplete,
}) => {
	const { linkToken, dispatch, accountsNeedRefresh } = useContext(Context);
	const alert = useAppAlert();
	const { post } = useApiService(alert);

	useEffect(() => {
		// Generate link token if not already available
		if (!linkToken) {
			const generateToken = async () => {
				const data = await post("/api/create_link_token", {});
				if (data && data.link_token) {
					dispatch({
						type: "SET_STATE",
						state: { linkToken: data.link_token },
					});
					localStorage.setItem("link_token", data.link_token);
				}
			};
			generateToken();
		}
	}, [linkToken, dispatch, post]);

	// Monitor for account refresh to detect successful account connection
	useEffect(() => {
		if (accountsNeedRefresh) {
			// Account was successfully added, show success and complete onboarding
			alert.trigger("Account connected successfully!", "success");
			// Small delay to let user see the success message
			setTimeout(() => {
				onComplete();
			}, 1500);
		}
	}, [accountsNeedRefresh, alert, onComplete]);

	return (
		<Box>
			<Typography variant="h6" gutterBottom>
				Connect Your First Account
			</Typography>
			<Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
				Connect your bank account to start tracking transactions automatically.
				Your financial data is securely encrypted and never stored on our servers.
			</Typography>

			<Alert severity="success" icon={<CheckCircle />} sx={{ mb: 3 }}>
				Your categories are set up! Now let's connect your accounts to get
				started.
			</Alert>

			<Box
				sx={{
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					gap: 2,
					py: 4,
				}}
			>
				{linkToken ? (
					<>
						<Link />
						<Typography variant="body2" color="text.secondary" align="center">
							Click the button above to securely connect your bank account
							through Plaid.
						</Typography>
					</>
				) : (
					<>
						<CircularProgress />
						<Typography variant="body2" color="text.secondary">
							Preparing secure connection...
						</Typography>
					</>
				)}
			</Box>
		</Box>
	);
};

export default OnboardingStepAccounts;

