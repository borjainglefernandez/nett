import React, { useContext } from "react";

import Link from "../Link";
import Context from "../../Context";

import styles from "./index.module.scss";

const Header = () => {
  const {} = useContext(Context);

  return (
    <div className={styles.grid}>
      <h3 className={styles.title}>Nett</h3>
        <>
          <h4 className={styles.subtitle}>
            Never miss a transaction
          </h4>
          <p className={styles.introPar}>
            The Plaid flow begins when your user wants to connect their bank
            account to your app. Simulate this by clicking the button below to
            launch Link - the client-side component that your users will
            interact with in order to link their accounts to Plaid and allow you
            to access their accounts via the Plaid API.
          </p>

            <div className={styles.linkButton}>
              <Link />
            </div>
        </>
    </div>
  );
};

Header.displayName = "Header";

export default Header;
