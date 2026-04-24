import sys, asyncio
sys.path.insert(0, ".")
from services.link_verifier import verify_links

resume_text = """
John Doe | john@example.com
GitHub: https://github.com/torvalds
GitHub Repo: https://github.com/torvalds/linux
LinkedIn: https://www.linkedin.com/in/williamhgates
Portfolio: https://example.com
Broken: https://this-domain-does-not-exist-xyz123.com
"""

async def main():
    results = await verify_links(resume_text)
    for r in results:
        status = "OK" if r.reachable else "FAIL"
        active = " [active commits]" if r.commit_activity else ""
        print(f"{status} [{r.platform}] {r.url}")
        print(f"   {r.detail}{active}")

asyncio.run(main())
