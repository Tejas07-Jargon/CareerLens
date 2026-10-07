import asyncio
from sqlalchemy.future import select
from app.core.database import get_session
from app.services.leetcode.sync_service import SyncService
from app.models.leetcode import LeetCodeProfile

async def main():
    async for session in get_session():
        service = SyncService(session)
        print("Syncing...")
        await service.sync_via_scrape('fe1e4d19-29c0-4929-9165-389d8f53f7cf', 'AryanMasti')
        print("Sync complete.")
        res = await session.execute(select(LeetCodeProfile).where(LeetCodeProfile.username=='AryanMasti'))
        p = res.scalars().first()
        print(f"Total: {p.total_solved}, Easy: {p.easy_solved}, Medium: {p.medium_solved}, Hard: {p.hard_solved}, Acceptance: {p.acceptance_rate}")

asyncio.run(main())
