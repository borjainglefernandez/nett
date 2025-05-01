// Components/AppAlert.tsx
import { Snackbar, Alert, AlertProps } from "@mui/material";

interface AppAlertProps {
	open: boolean;
	message: string | null;
	severity: AlertProps["severity"];
	onClose: () => void;
	autoHideDuration?: number;
}

const AppAlert = ({
	open,
	message,
	severity,
	onClose,
	autoHideDuration = 5000,
}: AppAlertProps) => {
	if (!message) return null;

	return (
		<Snackbar
			open={open}
			autoHideDuration={autoHideDuration}
			onClose={onClose}
			anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
		>
			<Alert severity={severity} onClose={onClose} sx={{ width: "100%" }}>
				{message}
			</Alert>
		</Snackbar>
	);
};

export default AppAlert;
