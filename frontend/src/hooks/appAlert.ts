// hooks/useAppAlert.ts
import { AlertProps } from "@mui/material";
import { useState } from "react";

const useAppAlert = () => {
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [severity, setSeverity] = useState<AlertProps["severity"]>("info");

	const trigger = (msg: string, sev: AlertProps["severity"] ) => {
		setMessage(msg);
		setSeverity(sev);
		setOpen(true);
	};

	const close = () => {
		setOpen(false);
		setMessage(null);
	};

	return {
		open,
		message,
		severity,
		trigger,
		close,
	};
};

export default useAppAlert;
