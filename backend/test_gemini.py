import sys
sys.path.insert(0, ".")
import asyncio
from services.scoring_service import score_impact

async def main():
    score, highlights = await score_impact(
        "Reduced API latency by 40%. Led team of 5 to ship payments feature used by 200k users. Automated CI/CD saving 3 hours per release.",
        "Senior Python engineer, FastAPI, 3+ years, build scalable APIs"
    )
    print(f"impact_score: {score}")
    print(f"highlights:   {highlights}")

asyncio.run(main())
