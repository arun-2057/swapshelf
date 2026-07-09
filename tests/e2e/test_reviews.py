import pytest

from tests.e2e.conftest import BASE_URL
from tests.e2e.helpers import (
    api_request,
    create_item,
    create_test_user,
    get_session_token,
    login_user,
    request_loan,
    unique_email,
    update_loan_status,
)


@pytest.mark.asyncio
async def test_double_blind_review_lock(e2e_browser):
    base_url = BASE_URL
    borrower_email = unique_email("borrower")
    lender_email = unique_email("lender")

    lender_page = e2e_browser
    borrower_page = await lender_page.context.new_page()

    await lender_page.goto(base_url)
    await borrower_page.goto(base_url)

    lender = await create_test_user(lender_page, "Lender User", lender_email)
    borrower = await create_test_user(borrower_page, "Borrower User", borrower_email)

    lender_item = await create_item(lender_page, "E2E Review Test Book", "BOOK")
    item_id = lender_item["id"]

    loan = await request_loan(borrower_page, item_id)
    loan_id = loan["id"]

    await update_loan_status(lender_page, loan_id, "ACCEPTED", {"dueDate": "2026-07-14T00:00:00.000Z"})
    await update_loan_status(lender_page, loan_id, "BORROWED")
    await update_loan_status(lender_page, loan_id, "RETURNED")

    await login_user(borrower_page, base_url, borrower_email, "password123")
    await login_user(lender_page, base_url, lender_email, "password123")

    await borrower_page.goto(f"{base_url}/loan")
    await borrower_page.wait_for_load_state("networkidle")
    await borrower_page.click("button:has-text('Review this swap')")
    await borrower_page.wait_for_selector("textarea", state="visible")
    await borrower_page.fill("textarea", "Great book, returned on time.")
    await borrower_page.click("button:has-text('Submit sealed')")
    await borrower_page.wait_for_load_state("networkidle")

    await lender_page.goto(f"{base_url}/loan")
    await lender_page.wait_for_load_state("networkidle")

    assert await lender_page.is_visible("button:has-text('Review this swap')")

    await lender_page.click("button:has-text('Review this swap')")
    await lender_page.wait_for_selector("textarea", state="visible")
    await lender_page.fill("textarea", "Perfect borrower.")
    await lender_page.click("button:has-text('Submit sealed')")
    await lender_page.wait_for_load_state("networkidle")

    lender_reviews = await api_request(lender_page, "GET", f"/api/users/{lender['id']}")
    borrower_reviews = await api_request(borrower_page, "GET", f"/api/users/{borrower['id']}")

    lender_seen_review = next((r for r in lender_reviews["reviews"] if r["reviewerId"] == borrower["id"]), None)
    borrower_seen_review = next((r for r in borrower_reviews["reviews"] if r["reviewerId"] == lender["id"]), None)

    assert lender_seen_review is not None, "Lender should see borrower's revealed review"
    assert lender_seen_review["comment"] == "Great book, returned on time."
    assert borrower_seen_review is not None, "Borrower should see lender's revealed review"
    assert borrower_seen_review["comment"] == "Perfect borrower."

    assert not await lender_page.is_visible("button:has-text('Review this swap')")
