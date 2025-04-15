// hooks/useAppAlert.ts
import { useState } from "react";

const useAppAlert = () => {
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState<string | null>(null);
	const [severity, setSeverity] = useState<"success" | "error">("success");

	const trigger = (msg: string, sev: "success" | "error") => {
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
