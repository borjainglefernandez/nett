import { useContext } from "react";

import Link from "../Link";
import Context from "../../Context";

import styles from "./index.module.scss";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import { CATEGORY_MANAGEMENT_PAGE_ROUTE } from "../../Constants/RouteConstants";

const Header = () => {
	const {} = useContext(Context);
	const navigate = useNavigate();

	return (
		<div className={styles.grid}>
			<h3 className={styles.title}>Nett</h3>
			<>
				<h4 className={styles.subtitle}>Never miss a transaction</h4>
				<p className={styles.introPar}>
					The Plaid flow begins when your user wants to connect their bank
					account to your app. Simulate this by clicking the button below to
					launch Link - the client-side component that your users will interact
					with in order to link their accounts to Plaid and allow you to access
					their accounts via the Plaid API.
				</p>

				<div className={styles.linkButton}>
					<Link />
					<Button onClick={() => navigate(CATEGORY_MANAGEMENT_PAGE_ROUTE)}>
						{" "}
						Manage Categories{" "}
					</Button>
				</div>
			</>
		</div>
	);
};

Header.displayName = "Header";

export default Header;
