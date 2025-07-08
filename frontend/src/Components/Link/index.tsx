import React, { useEffect, useContext } from "react";
import { usePlaidLink } from "react-plaid-link";

import Context from "../../Context";
import Button from "@mui/material/Button";
import useAppAlert from "../../hooks/appAlert";
import useApiService from "../../hooks/apiService";

const Link = () => {
	const { linkToken, dispatch } = useContext(Context);
	const alert = useAppAlert();
	const { post } = useApiService(alert);

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

	return (
		<Button onClick={() => open()} disabled={!ready}>
			{ready ? "Add new account" : "Server Unreachable"}
		</Button>
	);
};

Link.displayName = "Link";

export default Link;
