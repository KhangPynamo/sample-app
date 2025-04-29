import os
import contextlib
import boto3
import json
import psycopg2
import logging
from typing import Dict, Optional

from config import (
    AWS_PROFILE,
    AWS_CURRENT_REGION,
    AWS_BEDROCK_REGION,
    AWS_RDS_CREDENTIALS_AND_CONFIG_ARN,
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(filename)s:%(lineno)d - %(message)s')
logger = logging.getLogger(__name__)

def get_aws_session(region_name: str = None, profile_name: str = None):
    """Creates an AWS session."""
    if profile_name:
        return boto3.Session(profile_name=profile_name, region_name=region_name)
    return boto3.Session(region_name=region_name)

def get_bedrock_client():
    """Initializes and returns the Bedrock client."""
    try:
        session = get_aws_session(region_name=AWS_BEDROCK_REGION)
        # session = get_aws_session(region_name=AWS_BEDROCK_REGION, profile_name=AWS_PROFILE)
        client = session.client(service_name="bedrock-runtime")
        logger.info("Successfully initialized Bedrock client.")
        return client
    except Exception as e:
        logger.error(f"Error initializing Bedrock client: {e}")
        return None

def get_rds_config() -> Dict[str, str]:
    """Retrieves RDS configuration from AWS Secrets Manager."""
    try:
        session = get_aws_session(region_name=AWS_CURRENT_REGION)
        # session = get_aws_session(region_name=AWS_CURRENT_REGION, profile_name=AWS_PROFILE)
        client = session.client(service_name='secretsmanager')
        get_secret_value_response = client.get_secret_value(SecretId=AWS_RDS_CREDENTIALS_AND_CONFIG_ARN)
        secret = get_secret_value_response['SecretString']
        logger.info(f"Successfully retrieved RDS configuration from Secrets Manager.")
        return json.loads(secret)
    except Exception as e:
        logger.error(f"Error retrieving secret '{AWS_RDS_CREDENTIALS_AND_CONFIG_ARN}': {e}")
        return {}

def connect_db() -> Optional[psycopg2.extensions.connection]:
    """Connects to AWS RDS PostgreSQL."""
    rds_config = get_rds_config()
    if not rds_config:
        logger.error("RDS configuration not available.")
        return None
    try:
        conn = psycopg2.connect(
            host=rds_config.get('rds_host'),
            port=rds_config.get('rds_port'),
            database=rds_config.get('rds_vectordb'),
            user=rds_config.get('rds_username'),
            password=rds_config.get('rds_password')
        )
        logger.info("Successfully connected to RDS PostgreSQL.")
        return conn
    except psycopg2.Error as e:
        logger.error(f"Error connecting to RDS PostgreSQL: {e}")
        return None

def close_db(conn: Optional[psycopg2.extensions.connection]):
    """Closes the database connection."""
    if conn:
        conn.close()
        logger.info("Database connection closed.")

@contextlib.contextmanager
def get_db_connection():
    """Context manager for database connections."""
    conn = connect_db()
    try:
        yield conn
    finally:
        close_db(conn)