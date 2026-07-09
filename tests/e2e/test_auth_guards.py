import pytest

from tests.e2e.conftest import BASE_URL
from tests.e2e.helpers import (
    api_request,
    create_item,
    create_test_user,
    get_session_token,
    login_user,
    request_loan,
    report_stolen,
    update_loan_status,
    unique_email,
)


@pytest.mark.asyncio
async def test_frozen_user_mutation_blocked(e2e_browser):
    base_url = BASE_URL
    lender_page = e2e_browser
    borrower_page = await e2e_browser.context.new_page()

    await lender_page.goto(base_url)
    await borrower_page.goto(base_url)

    lender_email = unique_email("lender")
    borrower_email = unique_email("borrower")

    lender = await create_test_user(lender_page, "Lender User", lender_email)
    borrower = await create_test_user(borrower_page, "Borrower User", borrower_email)

    lender_item = await create_item(lender_page, "Frozen Guard Test Item", "BOOK")
    item_id = lender_item["id"]

    loan = await request_loan(borrower_page, item_id)
    loan_id = loan["id"]

    await update_loan_status(lender_page, loan_id, "ACCEPTED", {"dueDate": "2026-07-14T00:00:00.000Z"})
    await update_loan_status(lender_page, loan_id, "BORROWED")

    await report_stolen(lender_page, loan_id, "Item reported as stolen for E2E test")

    frozen_page = await e2e_browser.context.new_page()
    await login_user(frozen_page, base_url, borrower_email, "password123")

    token = await get_session_token(frozen_page)
    assert token is not None, "Frozen user should still receive a session token on login"

    await frozen_page.goto(base_url)
    await frozen_page.wait_for_load_state("networkidle")

    with pytest.raises(RuntimeError) as exc_info:
        await create_item(frozen_page, "The Hobbit", "BOOK")

    assert "API error 403" in str(exc_info.value)
    assert "Your account has been suspended due to a reported issue. Please contact support." in str(exc_info.value)

    assert await frozen_page.is_visible("text=Your account has been suspended")
