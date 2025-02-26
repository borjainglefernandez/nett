import { useEffect, useContext, useCallback, useState } from "react";
import {
	ColDef,
	AllCommunityModule,
	ModuleRegistry,
	ClientSideRowModelModule,
} from "ag-grid-community";

import Header from "./Components/Headers";
import Context from "./Context";
import Card from "@mui/material/Card";
import styles from "./App.module.scss";
import Account from "./Models/Account";
import AccountTable from "./Components/AccountTable/AccountTable";



const App = () => {
	const [accounts, setAccounts] = useState<Account[]>([]);
	const { dispatch } = useContext(Context);

	const generateToken = useCallback(async () => {
		const response = await fetch("/api/create_link_token", {
			method: "POST",
		});
		if (!response.ok) {
			dispatch({ type: "SET_STATE", state: { linkToken: null } });
			return;
		}
		const data = await response.json();
		// Data will look like this:
		// 'expiration': str
		// 'link_token': str
		// 'request_id': str

		if (data) {
			if (data.error != null) {
				dispatch({
					type: "SET_STATE",
					state: {
						linkToken: null,
						error: data.error,
					},
				});
				return;
			}
			dispatch({ type: "SET_STATE", state: { linkToken: data.link_token } });
		}
		// Save the link_token to be used later in the Oauth flow.
		localStorage.setItem("link_token", data.link_token);
	}, [dispatch]);

	const getAccounts = useCallback(async () => {
		const response = await fetch("/api/account", { method: "GET" });
		if (!response.ok) {
			console.error(response);
		}
		const data = await response.json();

		if (data) {
			const fetchedAccounts: Account[] = data.map((item: any) => ({
				...item,
				last_updated: new Date(item.last_updated),
			}));
			setAccounts(fetchedAccounts);
		}
	}, [accounts]);

	useEffect(() => {
		const init = async () => {
			// do not generate a new token for OAuth redirect; instead
			// setLinkToken from localStorage
			if (window.location.href.includes("?oauth_state_id=")) {
				dispatch({
					type: "SET_STATE",
					state: {
						linkToken: localStorage.getItem("link_token"),
					},
				});
				return;
			}
			generateToken(); // almost always use this
			getAccounts();
		};
		init();
	}, [dispatch, generateToken]);

	return (
		// <div className={styles.App}>
		<div>
			<Header />
			<Card>
				<AccountTable accounts={accounts} />
			</Card>
		</div>
		// </div> */}
	);
};

export default App;
