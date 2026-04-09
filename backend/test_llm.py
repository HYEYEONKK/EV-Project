import httpx
import asyncio
import json

API_KEY = "sk-7DGAHe0SoOJYgYMbLd4qWA"
MODEL   = "azure.gpt-5.4-nano"
URL     = "https://genai-sharedservice-americas.pwcinternal.com/v1/chat/completions"

payload = {
    "model": MODEL,
    "messages": [{"role": "user", "content": "Hello, just say OK."}],
    "max_tokens": 10,
}

headers_variants = [
    {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
    {"api-key": API_KEY, "Content-Type": "application/json"},
    {"x-api-key": API_KEY, "Content-Type": "application/json"},
]

async def test():
    for i, headers in enumerate(headers_variants, 1):
        label = list(headers.keys())[0]
        print(f"\n[{i}] Header: {label}")
        try:
            async with httpx.AsyncClient(timeout=15.0, verify=False) as client:
                resp = await client.post(URL, headers=headers, json=payload)
                print(f"    Status: {resp.status_code}")
                print(f"    Body:   {resp.text[:300]}")
        except httpx.ConnectError as e:
            print(f"    ConnectError: {e}")
        except Exception as e:
            print(f"    Error ({type(e).__name__}): {e}")

asyncio.run(test())
