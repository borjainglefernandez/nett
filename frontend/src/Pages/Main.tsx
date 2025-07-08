import { useEffect, useContext, useCallback, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import Tab from "@mui/material/Tab";
import Header from "../Components/Headers";
import Context from "../Context";
import styles from "../App.module.scss";
import Account from "../Models/Account";
import Transaction from "../Models/Transaction";
import TransactionTable from "../Components/TransactionTable/TransactionTable";
import AccountList from "../Components/AccountsList/AccountList";
import capitalizeWords from "../Utils/StringUtils";
import { Item } from "../Models/Item";
import useAppAlert from "../hooks/appAlert";
import useApiService from "../hooks/apiService";
import AppAlert from "../Components/Alerts/AppAlert";
import { Box, Tabs } from "@mui/material";
import TabPanel from "../Components/TabPanel/TabPanel";
import BudgetDashboard from "../Components/BudgetDashboard/BudgetDashboard";

const Main = () => {
	// Hooks
	const [loading, setLoading] = useState<boolean>(true);
	const [tabIndex, setTabIndex] = useState(0);
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [selectedAccounts, setSelectedAccounts] = useState<Account[]>([]);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
	const { accountsNeedRefresh, redirectLoading, dispatch } =
		useContext(Context);
	const alert = useAppAlert();
	const { get, post } = useApiService(alert);

	const generateToken = useCallback(async () => {
		const data = await post("/api/create_link_token", {});
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
		} else {
			dispatch({ type: "SET_STATE", state: { linkToken: null } });
			return;
		}
		// Save the link_token to be used later in the Oauth flow.
		localStorage.setItem("link_token", data.link_token);
	}, [dispatch]);

	const syncTransactions = useCallback(async () => {
		const itemData = await get("/api/item");
		const fetchedItems: Item[] = itemData
			.map((item: any) => ({
				...item,
			}))
			.filter((item: Item) => item && item.id);

		const itemSyncResponses = await Promise.all(
			fetchedItems.map(async (item) =>
				post("/api/item/" + item.id + "/sync", {})
			)
		);
		const allItemsSynced = itemSyncResponses.every(
			(response) => response !== null && response !== undefined
		);

		if (allItemsSynced && itemSyncResponses.length > 0) {
			alert.trigger("Sync successful", "success");
		}
	}, []);

	const getAccounts = useCallback(async () => {
		const accountData = await get("/api/account");
		if (accountData) {
			const fetchedAccounts: Account[] = accountData.map((item: any) => ({
				...item,
				account_type: capitalizeWords(item.account_type),
				account_subtype: capitalizeWords(item.account_subtype),
				last_updated: new Date(item.last_updated),
			}));
			setAccounts(fetchedAccounts);
			setSelectedAccounts(fetchedAccounts);
		}
	}, []);

	const getTransactions = useCallback(async () => {
		const allTransactions: Transaction[] = [];
		await Promise.all(
			selectedAccounts.map(async (account) => {
				const transactionData = await get(
					`/api/account/${account.id}/transactions`
				);

				// Convert response to Transaction model
				const transactionsForAccount: Transaction[] = transactionData.map(
					(transaction: any) => ({
						...transaction,
						amount: Number(transaction.amount), // Ensure amount is a number
						date: transaction.date ? new Date(transaction.date) : null, // Convert date
						date_time: transaction.date ? new Date(transaction.dateTime) : null, // Convert date
						account_name: account.name,
					})
				);
				allTransactions.push(...transactionsForAccount);
			})
		);
		setTransactions(allTransactions); // Update state after all requests complete
	}, [selectedAccounts]);

	useEffect(() => {
		console.log("Accounts need refresh:", accountsNeedRefresh);
		const init = async () => {
			setLoading(true);
			try {
				if (window.location.href.includes("?oauth_state_id=")) {
					dispatch({
						type: "SET_STATE",
						state: {
							linkToken: localStorage.getItem("link_token"),
						},
					});
					setLoading(false);
					return;
				}
				await generateToken();
				await syncTransactions();
				await getAccounts();
				await getTransactions();
				dispatch({ type: "CLEAR_ACCOUNT_REFRESH" });
			} catch (error) {
				console.error("Error during init:", error);
			}
			setLoading(false);
			dispatch({ type: "SET_REDIRECT_LOADING", payload: false });
		};
		init();
	}, [accountsNeedRefresh, dispatch, generateToken, getAccounts]);

	useEffect(() => {
		getTransactions();
	}, [selectedAccounts]);

	// Functions
	const selectDeselectAccount = (account: Account, select: boolean) => {
		var newSelectedAccounts = selectedAccounts.concat(); // Make copy
		const selected = newSelectedAccounts.includes(account);
		if (select && !selected) {
			// Need to select
			newSelectedAccounts.push(account);
		}
		if (!select && selected) {
			// Need to deselect
			newSelectedAccounts = newSelectedAccounts.filter(
				(accountToCompare) => accountToCompare !== account
			);
		}
		setSelectedAccounts(newSelectedAccounts);
	};

	return (
		<div className={styles.App}>
			{loading || redirectLoading ? (
				<div className={styles.loadingContainer}>
					<CircularProgress />
				</div>
			) : (
				<div className={styles.container}>
					<Header />
					<br />
					<Box sx={{ width: "100%", mb: 2 }}>
						<Tabs
							value={tabIndex}
							onChange={(e, value) => setTabIndex(value)}
							sx={{ justifyContent: "flex-start", display: "flex" }} // This aligns tab buttons inside Tabs
						>
							<Tab label='Account List' />
							<Tab label='Transaction Table' />
							<Tab label='Budget Summary' />
						</Tabs>
					</Box>

					<TabPanel value={tabIndex} index={0}>
						<AccountList
							accounts={accounts}
							selectedAccounts={selectedAccounts}
							selectDeselectAccount={selectDeselectAccount}
						/>
					</TabPanel>
					<TabPanel value={tabIndex} index={1}>
						<TransactionTable transactions={transactions} />
					</TabPanel>
					<TabPanel value={tabIndex} index={2}>
						<BudgetDashboard />
					</TabPanel>
				</div>
			)}
			<AppAlert
				open={alert.open}
				message={alert.message}
				severity={alert.severity}
				onClose={alert.close}
			/>
		</div>
	);
};

export default Main;
