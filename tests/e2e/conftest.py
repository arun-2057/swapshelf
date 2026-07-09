import pytest
from playwright.async_api import async_playwright

BASE_URL = "http://localhost:3000"


@pytest.fixture
async def e2e_browser():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 720},
            base_url=BASE_URL,
        )
        page = await context.new_page()
        yield page
        await page.close()
        await context.close()
        await browser.close()
