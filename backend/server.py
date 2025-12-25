import os
import time
from http import HTTPStatus

from dotenv import load_dotenv
from flask import Flask, request, jsonify
import plaid
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import (
    ItemPublicTokenExchangeRequest,
)
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_transactions import LinkTokenTransactions
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.api import plaid_api
from flask_migrate import Migrate
from utils.error_utils import error_response
from models import db
from models.transaction.transaction_categories import (
    seed_transaction_categories,
)
from routes.item_routes import item_bp
from routes.account_routes import account_bp
from routes.budget_routes import budget_bp
from routes.budget_period_routes import budget_period_routes
from routes.txn_routes import txn_bp
from routes.txn_category_routes import txn_category_bp
from routes.txn_subcategory_routes import txn_subcategory_bp
from utils.logger import get_logger

# Read env vars from .env file
load_dotenv()

logger = get_logger(__name__)

app = Flask(__name__)
app.register_blueprint(item_bp)
app.register_blueprint(account_bp)
app.register_blueprint(budget_bp)
app.register_blueprint(txn_bp)
app.register_blueprint(txn_category_bp)
app.register_blueprint(txn_subcategory_bp)
app.register_blueprint(budget_period_routes)

PLAID_CLIENT_ID = os.getenv("PLAID_CLIENT_ID")
PLAID_SECRET = os.getenv("PLAID_SECRET")
PLAID_ENV = os.getenv("PLAID_ENV", "sandbox")
PLAID_PRODUCTS = os.getenv("PLAID_PRODUCTS", "transactions").split(",")
PLAID_COUNTRY_CODES = os.getenv("PLAID_COUNTRY_CODES", "US").split(",")


# SQLite database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)  # 🔥 Fix: Bind the existing db instance to the app
migrate = Migrate(app, db)  # Bind Flask-Migrate to Flask app and SQLAlchemy
with app.app_context():
    db.create_all()
    seed_transaction_categories()


def empty_to_none(field):
    value = os.getenv(field)
    if value is None or len(value) == 0:
        return None
    return value


host = {
    "sandbox": plaid.Environment.Sandbox,
    "production": plaid.Environment.Production,
}.get(PLAID_ENV, plaid.Environment.Sandbox)


# Parameters used for the OAuth redirect Link flow.
#
# Set PLAID_REDIRECT_URI to 'http://localhost:3000/'
# The OAuth redirect flow requires an endpoint on the developer's website
# that the bank website should redirect to. You will need to configure
# this redirect URI for your client ID through the Plaid developer dashboard
# at https://dashboard.plaid.com/team/api.
PLAID_REDIRECT_URI = empty_to_none("PLAID_REDIRECT_URI")

configuration = plaid.Configuration(
    host=host,
    api_key={
        "clientId": PLAID_CLIENT_ID,
        "secret": PLAID_SECRET,
        "plaidVersion": "2020-09-14",
    },
)

api_client = plaid.ApiClient(configuration)
client = plaid_api.PlaidApi(api_client)
app.config["plaid_client"] = client

products = []
for product in PLAID_PRODUCTS:
    products.append(Products(product))


# We store the access_token in memory - in production, store it in a secure
# persistent data store.
access_token = None
# We store the user_token in memory - in production, store it in a secure
# persistent data store.
user_token = None


@app.route("/api/info", methods=["POST"])
def info():
    global access_token
    global item_id
    return jsonify({"access_token": access_token, "products": PLAID_PRODUCTS})


@app.route("/api/create_link_token", methods=["POST"])
def create_link_token():
    global user_token
    try:
        # Configure transactions to request 1 year (365 days) of historical data
        transactions_config = LinkTokenTransactions(days_requested=365)
        logger.info(f"🔗 Creating link token with transactions.days_requested=365")

        request = LinkTokenCreateRequest(
            products=products,
            client_name="Plaid Quickstart",
            country_codes=list(map(lambda x: CountryCode(x), PLAID_COUNTRY_CODES)),
            language="en",
            user=LinkTokenCreateRequestUser(client_user_id=str(time.time())),
            transactions=transactions_config,
        )
        if PLAID_REDIRECT_URI != None:
            request["redirect_uri"] = PLAID_REDIRECT_URI
        response = client.link_token_create(request)
        logger.info(f"✅ Link token created successfully")
        return jsonify(response.to_dict())
    except plaid.ApiException as e:
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            f"Error creating link token: {e.body}",
        )


# Exchange token flow - exchange a Link public_token for
# an API access_token
# https://plaid.com/docs/#exchange-token-flow


@app.route("/api/set_access_token", methods=["POST"])
def get_access_token():
    data = request.get_json()
    public_token = data["public_token"]
    try:
        exchange_request = ItemPublicTokenExchangeRequest(public_token=public_token)
        exchange_response = client.item_public_token_exchange(exchange_request)
        return jsonify(exchange_response.to_dict())
    except plaid.ApiException as e:
        return error_response(
            HTTPStatus.INTERNAL_SERVER_ERROR.value,
            f"Error getting access token: {e.body}",
        )


if __name__ == "__main__":
    app.run(port=int(os.getenv("PORT", 8000)))
