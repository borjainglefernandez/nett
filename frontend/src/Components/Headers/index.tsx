import { useContext } from "react";

import Link from "../Link";
import Context from "../../Context";

import styles from "./index.module.scss";
import Button from "@mui/material/Button";
import { useNavigate } from "react-router-dom";
import {
	BUDGET_MANAGEMENT_PAGE_ROUTE,
	CATEGORY_MANAGEMENT_PAGE_ROUTE,
} from "../../Constants/RouteConstants";

const Header = () => {
	const {} = useContext(Context);
	const navigate = useNavigate();

	return (
		<div className={styles.grid}>
			<h3 className={styles.title}>Nett</h3>
			<>
				<h4 className={styles.subtitle}>Never miss a transaction</h4>
				<div className={styles.linkButton}>
					<Link />
					<Button onClick={() => navigate(CATEGORY_MANAGEMENT_PAGE_ROUTE)}>
						{" "}
						Manage Categories{" "}
					</Button>
					<Button onClick={() => navigate(BUDGET_MANAGEMENT_PAGE_ROUTE)}>
						{" "}
						Manage Budgets{" "}
					</Button>
				</div>
				<p className={styles.introPar}>
					Connect your bank account to start tracking transactions and managing
					your budget. Click the "ADD NEW ACCOUNT" button above to securely link
					your accounts through Plaid and automatically sync your financial
					data.
				</p>
			</>
		</div>
	);
};

Header.displayName = "Header";

export default Header;
