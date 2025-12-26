import { useState, useEffect, useRef, memo } from "react";
import {
	Avatar,
	Typography,
	TextField,
	Box,
	CircularProgress,
} from "@mui/material";

// Global cache to track loaded images across re-renders
const imageCache = new Map<string, { loaded: boolean; error: boolean }>();

const EditableTransactionNameCell = memo(
	function EditableTransactionNameCell({
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
		const imgRef = useRef<HTMLImageElement | null>(null);
		const previousLogoUrl = useRef<string | undefined>(logoUrl);
		const loadHandledRef = useRef<Set<string>>(new Set());

		// Initialize state from cache or create new entry
		const getImageState = () => {
			if (!logoUrl) return { loaded: false, error: false };
			if (!imageCache.has(logoUrl)) {
				imageCache.set(logoUrl, { loaded: false, error: false });
			}
			return imageCache.get(logoUrl)!;
		};

		const [imgState, setImgState] = useState(getImageState());

		// Reset image state only when logoUrl actually changes
		useEffect(() => {
			if (previousLogoUrl.current !== logoUrl) {
				const newState = getImageState();
				setImgState(newState);
				previousLogoUrl.current = logoUrl;
				// Reset load handled flag when URL changes
				if (previousLogoUrl.current) {
					loadHandledRef.current.delete(previousLogoUrl.current);
				}
			}
		}, [logoUrl]);

		// Update tempName when value changes (but not while editing)
		useEffect(() => {
			if (!isEditing) {
				setTempName(value);
			}
		}, [value, isEditing]);

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

		// Check if image ref is already loaded (from browser cache) after render
		useEffect(() => {
			if (logoUrl && imgRef.current) {
				const img = imgRef.current;
				const cached = imageCache.get(logoUrl);
				// If image is already complete (loaded from cache) and not yet marked as loaded
				if (
					img.complete &&
					img.naturalHeight !== 0 &&
					cached &&
					!cached.loaded
				) {
					cached.loaded = true;
					cached.error = false;
					loadHandledRef.current.add(logoUrl);
					setImgState({ ...cached });
				}
			}
		}, [logoUrl]); // Only run when logoUrl changes

		const handleImageLoad = () => {
			if (logoUrl && !loadHandledRef.current.has(logoUrl)) {
				const cached = imageCache.get(logoUrl);
				// Only update if not already loaded to prevent infinite loops
				if (cached && !cached.loaded) {
					cached.loaded = true;
					cached.error = false;
					loadHandledRef.current.add(logoUrl);
					setImgState({ loaded: true, error: false });
				}
			}
		};

		const handleImageError = () => {
			if (logoUrl) {
				const cached = imageCache.get(logoUrl);
				if (cached) {
					cached.error = true;
					cached.loaded = false;
					setImgState({ ...cached });
				}
			}
		};

		return (
			<Box
				sx={{ display: "flex", alignItems: "center", height: "100%" }}
				gap={2}
			>
				<Avatar sx={{ width: 24, height: 24, position: "relative" }}>
					{logoUrl && !imgState.loaded && !imgState.error && (
						<CircularProgress
							size={16}
							sx={{
								position: "absolute",
								top: "50%",
								left: "50%",
								transform: "translate(-50%, -50%)",
							}}
						/>
					)}
					{logoUrl && !imgState.error && (
						<img
							key={logoUrl}
							ref={imgRef}
							src={logoUrl}
							alt={value}
							style={{
								display: imgState.loaded ? "block" : "none",
								width: "100%",
								height: "100%",
								objectFit: "cover",
							}}
							onLoad={handleImageLoad}
							onError={handleImageError}
						/>
					)}
					{(!logoUrl || imgState.error) && value?.[0]}
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
						sx={{
							cursor: "pointer",
							"&:hover": { textDecoration: "underline" },
						}}
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
	},
	(prevProps, nextProps) => {
		// Custom comparison function to prevent unnecessary re-renders
		return (
			prevProps.id === nextProps.id &&
			prevProps.value === nextProps.value &&
			prevProps.logoUrl === nextProps.logoUrl
		);
	}
);

export default EditableTransactionNameCell;
