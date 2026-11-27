import os
from pathlib import Path

import pymysql
import pymysql.cursors
from dotenv import load_dotenv


load_dotenv(Path(__file__).with_name('.env'))


class Config:
    DEBUG = os.getenv('FLASK_DEBUG', '0') == '1'
    MYSQL_HOST = os.getenv('DB_HOST', '127.0.0.1')
    MYSQL_USER = os.getenv('DB_USER', 'hanami_app')
    MYSQL_PASSWORD = os.getenv('DB_PASSWORD', '')
    MYSQL_DB = os.getenv('DB_NAME', 'hanami_db')
    MYSQL_PORT = int(os.getenv('DB_PORT', '3306'))


def get_db_connection():
    return pymysql.connect(
        host=Config.MYSQL_HOST,
        user=Config.MYSQL_USER,
        password=Config.MYSQL_PASSWORD,
        database=Config.MYSQL_DB,
        port=Config.MYSQL_PORT,
        cursorclass=pymysql.cursors.DictCursor,
        charset='utf8mb4',
    )
