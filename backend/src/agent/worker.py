import asyncio
import logging

logger = logging.getLogger(__name__)

class Worker:

    queue: asyncio.Queue

    def __init__(self, queue):
        self.queue = queue

    async def run(self):

        while True:
            job = await self.queue.get()
            #job.send_progress_update()
            await job.run()
            self.queue.task_done()
