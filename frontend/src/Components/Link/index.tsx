import React, { useEffect, useContext } from "react";
import { usePlaidLink } from "react-plaid-link";
// import Button from "plaid-threads/Button";

import Context from "../../Context";
import Button from "@mui/material/Button";

const Link = () => {
	const { linkToken, dispatch } = useContext(Context);

	const onSuccess = React.useCallback(
		(public_token: string) => {
			// If the access_token is needed, send public_token to server
			const exchangePublicTokenForAccessToken = async () => {
				const response = await fetch("/api/set_access_token", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
					},
					body: `public_token=${public_token}`,
				});
				if (!response.ok) {
					dispatch({
						type: "SET_STATE",
						state: {},
					});
					return;
				}
				const data = await response.json();
				const createItemReponse = await fetch("/api/item", {
					method: "POST",
					headers: {
						"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
					},
					body: `access_token=${data.access_token}`,
				});
				const accountData = await createItemReponse.json();
				console.log(accountData);
				const getItemTransactionsResponse = await fetch(
					"/api/item/" + data.item_id + "/sync",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
						},
					}
				);
				const transactionData = await getItemTransactionsResponse.json();
				console.log(transactionData);

				dispatch({
					type: "SET_STATE",
					state: {},
				});
			};

			exchangePublicTokenForAccessToken();

			window.history.pushState("", "", "/");
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
