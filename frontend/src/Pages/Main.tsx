import { useEffect, useContext, useCallback, useState } from "react";

import Header from "../Components/Headers";
import Context from "../Context";
import styles from "../App.module.scss";
import Account from "../Models/Account";
import Transaction from "../Models/Transaction";
import TransactionTable from "../Components/TransactionTable/TransactionTable";
import AccountList from "../Components/AccountsList/AccountList";
import capitalizeWords from "../Utils/StringUtils";
import { Item } from "../Models/Item";

const Main = () => {
	// Hooks
	const [accounts, setAccounts] = useState<Account[]>([]);
	const [selectedAccounts, setSelectedAccounts] = useState<Account[]>([]);
	const [transactions, setTransactions] = useState<Transaction[]>([]);
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

	const syncTransactions = useCallback(async () => {
		const itemResponse = await fetch("/api/item", { method: "GET" });
		if (!itemResponse.ok) {
			console.error(itemResponse);
		}
		const data = await itemResponse.json();
		const fetchedItems: Item[] = data.map((item: any) => ({
			...item,
		}));

		await Promise.all(
			fetchedItems.map(async (item) => {
				const getItemTransactionsResponse = await fetch(
					"/api/item/" + item.id + "/sync",
					{
						method: "POST",
						headers: {
							"Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
						},
					}
				);
				const transactionData = await getItemTransactionsResponse.json();
				console.log(transactionData);
			})
		);
	}, []);

	const getAccounts = useCallback(async () => {
		const response = await fetch("/api/account", { method: "GET" });
		if (!response.ok) {
			console.error(response);
		}
		const data = await response.json();

		if (data) {
			const fetchedAccounts: Account[] = data.map((item: any) => ({
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
				try {
					const response = await fetch(
						`/api/account/${account.id}/transactions`
					);
					if (!response.ok) {
						throw new Error(
							`Failed to fetch transactions for account ${account.id}`
						);
					}
					const data = await response.json();
					console.log(data);

					// Convert response to Transaction model
					const transactionsForAccount: Transaction[] = data.map(
						(transaction: any) => ({
							...transaction,
							amount: Number(transaction.amount), // Ensure amount is a number
							date: transaction.date ? new Date(transaction.date) : null, // Convert date
							date_time: transaction.date
								? new Date(transaction.dateTime)
								: null, // Convert date
							account_name: account.name,
						})
					);

					console.log(transactionsForAccount);

					allTransactions.push(...transactionsForAccount);
				} catch (error) {
					console.error(error);
				}
			})
		);
		setTransactions(allTransactions); // Update state after all requests complete
	}, [selectedAccounts]);

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
			generateToken();
			syncTransactions();
			getAccounts();
		};
		init();
	}, [dispatch, generateToken, getAccounts]);

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
			<div className={styles.container}>
				<Header />
				<br></br>
				<AccountList
					accounts={accounts}
					selectDeselectAccount={selectDeselectAccount}
				/>
				<br></br>
				<TransactionTable transactions={transactions} />
			</div>
		</div>
	);
};

export default Main;
