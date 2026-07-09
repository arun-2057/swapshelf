import uuid
from typing import Optional


async def login_user(page, base_url: str, email: str, password: str) -> None:
    await page.goto(base_url)
    await page.wait_for_load_state("networkidle")
    await page.click("button:has-text('Sign in')")
    await page.wait_for_selector("#email", state="visible")
    await page.fill("#email", email)
    await page.fill("#password", password)
    await page.click("button[type='submit']")
    await page.wait_for_load_state("networkidle")


async def get_session_token(page) -> Optional[str]:
    try:
        return await page.evaluate("() => localStorage.getItem('swapshelf_token')")
    except Exception:
        return None


async def _set_session_token(page, token: str) -> None:
    try:
        await page.evaluate(
            "(t) => localStorage.setItem('swapshelf_token', t)",
            token,
        )
    except Exception:
        pass


async def _ensure_origin(page, base_url: str) -> None:
    try:
        await page.evaluate("() => {}")
    except Exception:
        await page.goto(base_url)
        await page.wait_for_load_state("networkidle")


async def api_request(page, method: str, path: str, data: Optional[dict] = None, base_url: str = "http://localhost:3000") -> dict:
    await _ensure_origin(page, base_url)
    token = await get_session_token(page)
    headers = {"Content-Type": "application/json"}
    if token:
        headers["x-session-token"] = token

    url = f"{base_url}{path}"
    if method == "GET":
        response = await page.request.get(url, headers=headers)
    elif method == "POST":
        response = await page.request.post(url, headers=headers, data=data)
    elif method == "PATCH":
        response = await page.request.patch(url, headers=headers, data=data)
    else:
        raise ValueError(f"Unsupported method: {method}")

    if response.status >= 400:
        try:
            body = await response.json()
        except Exception:
            body = {"error": await response.text()}
        raise RuntimeError(f"API error {response.status}: {body.get('error', body)}")

    result = await response.json()

    if isinstance(result, dict) and result.get("sessionToken"):
        await _set_session_token(page, result["sessionToken"])

    return result


async def create_test_user(page, name: str, email: str, password: str = "password123") -> dict:
    data = await api_request(page, "POST", "/api/auth/signup", {"name": name, "email": email, "password": password})
    return data


async def create_item(page, title: str, item_type: str = "BOOK") -> dict:
    return await api_request(
        page,
        "POST",
        "/api/items",
        {"title": title, "type": item_type, "condition": "GOOD"},
    )


async def request_loan(page, item_id: str) -> dict:
    return await api_request(
        page,
        "POST",
        "/api/loans",
        {"itemId": item_id, "proposedReturnDate": "2026-07-14T00:00:00.000Z"},
    )


async def update_loan_status(page, loan_id: str, status: str, extra: Optional[dict] = None) -> dict:
    body = {"status": status}
    if extra:
        body.update(extra)
    return await api_request(page, "PATCH", f"/api/loans/{loan_id}", body)


async def seed_demo_data(page) -> dict:
    return await api_request(page, "POST", "/api/seed")


async def get_loans(page) -> list:
    return await api_request(page, "GET", "/api/loans")


async def get_items(page) -> list:
    return await api_request(page, "GET", "/api/items?scope=mine")


async def submit_review(page, loan_id: str, rating: int = 5, comment: str = "Great swap!") -> dict:
    return await api_request(
        page,
        "POST",
        "/api/reviews",
        {"loanId": loan_id, "rating": rating, "comment": comment},
    )


async def report_stolen(page, loan_id: str, notes: str = "Item reported as stolen") -> dict:
    return await api_request(page, "POST", f"/api/loans/{loan_id}/report-stolen", {"notes": notes})


def unique_email(prefix: str = "test") -> str:
    return f"{prefix}.{uuid.uuid4().hex[:8]}@example.com"
