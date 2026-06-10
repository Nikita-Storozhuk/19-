import os
from dotenv import load_dotenv
import pymysql

load_dotenv()


import asyncio
from database import setup_database

async def init():
    await setup_database()
    print("Database initialized successfully!")

if __name__ == "__main__":
    asyncio.run(init())

