// EditableTransactionNameCell.tsx
import { useState } from "react";
import { Avatar, Typography, TextField, Box } from "@mui/material";

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
			<Avatar sx={{ width: 24, height: 24 }} />
			{isEditing ? (
				<TextField
					value={tempName}
					onChange={(e) => setTempName(e.target.value)}
					size='small'
					variant='standard'
					onBlur={saveName}
					autoFocus
					sx={{ flex: 1 }} // lets the input expand
				/>
			) : (
				<Typography
					variant='body2'
					sx={{ cursor: "pointer", "&:hover": { textDecoration: "underline" } }}
					onClick={() => setIsEditing(true)}
				>
					{value}
				</Typography>
			)}
		</Box>
	);
}
