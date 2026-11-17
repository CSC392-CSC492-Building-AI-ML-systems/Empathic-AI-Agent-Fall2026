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
            try:
                #await job.send_progress_update()
                await job.run()
            except Exception as error:
                logger.exception("Worker failed to process a job")
                job.owner.set_exception(error)
            finally:
                self.queue.task_done()
