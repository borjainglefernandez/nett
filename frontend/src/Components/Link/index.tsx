import React, { useEffect, useContext, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useNavigate } from "react-router-dom";

import Context from "../../Context";
import Button from "@mui/material/Button";
import { Tooltip } from "@mui/material";
import useAppAlert from "../../hooks/appAlert";
import useApiService from "../../hooks/apiService";
import { hasCategories } from "../../Utils/onboardingUtils";
import { Category } from "../../Models/Category";
import { ONBOARDING_ROUTE } from "../../Constants/RouteConstants";

const Link = () => {
	const { linkToken, dispatch } = useContext(Context);
	const alert = useAppAlert();
	const { post, get } = useApiService(alert);
	const navigate = useNavigate();
	const [categories, setCategories] = useState<Category[]>([]);
	const [categoriesLoaded, setCategoriesLoaded] = useState(false);

	// Check for categories
	useEffect(() => {
		const checkCategories = async () => {
			const categoryData = await get("/api/category");
			if (categoryData) {
				setCategories(categoryData);
			}
			setCategoriesLoaded(true);
		};
		checkCategories();
	}, [get]);

	const onSuccess = React.useCallback(
		(public_token: string) => {
			// If the access_token is needed, send public_token to server
			const exchangePublicTokenForAccessToken = async () => {
				const accessTokenData = await post("/api/set_access_token", {
					public_token: public_token,
				});
				await post("/api/item", {
					access_token: accessTokenData.access_token,
				});
				// Sync transactions
				dispatch({
					type: "TRIGGER_ACCOUNT_REFRESH",
				});
			};
			dispatch({ type: "SET_REDIRECT_LOADING", payload: true });
			exchangePublicTokenForAccessToken();
		},
		[dispatch]
	);

	let isOauth = false;
	const config: Parameters<typeof usePlaidLink>[0] = {
		token: linkToken!,
		onSuccess,
	};

	if (window.location.href.includes("?oauth_state_id=")) {
		// TODO: figure out how to delete this ts-ignore
		// @ts-ignore
		config.receivedRedirectUri = window.location.href;
		isOauth = true;
	}

	const { open, ready } = usePlaidLink(config);

	useEffect(() => {
		if (isOauth && ready) {
			open();
		}
	}, [ready, open, isOauth]);

	const handleClick = () => {
		if (!hasCategories(categories)) {
			alert.trigger(
				"Please set up categories before adding accounts. Redirecting to onboarding...",
				"warning"
			);
			setTimeout(() => {
				navigate(ONBOARDING_ROUTE);
			}, 1500);
			return;
		}
		open();
	};

	const hasCategoriesCheck = hasCategories(categories);
	const isDisabled = !ready || !categoriesLoaded || !hasCategoriesCheck;

	return (
		<Tooltip
			title={
				!hasCategoriesCheck
					? "Please set up categories before adding accounts"
					: !ready
					? "Server Unreachable"
					: ""
			}
		>
			<span>
				<Button onClick={handleClick} disabled={isDisabled}>
					{ready && categoriesLoaded ? "Add new account" : "Server Unreachable"}
				</Button>
			</span>
		</Tooltip>
	);
};

Link.displayName = "Link";

export default Link;
