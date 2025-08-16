import { useState } from "react";
import {
	Avatar,
	Typography,
	TextField,
	Box,
	CircularProgress,
} from "@mui/material";

export default function EditableTransactionNameCell({
	id,
	value,
	logoUrl,
	updateTransactionField,
}: {
	id: string;
	value: string;
	logoUrl?: string;
	updateTransactionField: (
		id: string,
		updates: any,
		successMsg: string,
		errorMsg: string
	) => Promise<void>;
}) {
	const [isEditing, setIsEditing] = useState(false);
	const [tempName, setTempName] = useState(value);
	const [imgLoaded, setImgLoaded] = useState(false);
	const [imgError, setImgError] = useState(false);

	const saveName = async () => {
		if (tempName !== value) {
			await updateTransactionField(
				id,
				{ name: tempName },
				`Transaction name updated to "${tempName}"`,
				`Failed to update transaction name`
			);
		}
		setIsEditing(false);
	};

	return (
		<Box sx={{ display: "flex", alignItems: "center", height: "100%" }} gap={2}>
			<Avatar sx={{ width: 24, height: 24 }}>
				{logoUrl && !imgLoaded && !imgError && <CircularProgress size={16} />}
				{logoUrl && !imgError && (
					<img
						src={logoUrl}
						alt={value}
						style={{
							display: imgLoaded ? "block" : "none",
							width: "100%",
							height: "100%",
						}}
						onLoad={() => setImgLoaded(true)}
						onError={() => setImgError(true)}
					/>
				)}
				{(!logoUrl || imgError) && value?.[0]}
			</Avatar>

			{isEditing ? (
				<TextField
					value={tempName}
					onChange={(e) => setTempName(e.target.value)}
					size='small'
					variant='standard'
					onBlur={saveName}
					autoFocus
					sx={{ flex: 1 }}
				/>
			) : (
				<Typography
					variant='body2'
					sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
					onClick={(e) => {
						e.stopPropagation(); // ❌ Prevents row selection
						setIsEditing(true);
					}}
				>
					{value}
				</Typography>
			)}
		</Box>
	);
}
