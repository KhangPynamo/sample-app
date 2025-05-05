import os
import boto3
import json
import psycopg2
from psycopg2 import sql
import logging
from typing import List

from utils import get_bedrock_client
from config import AWS_BEDROCK_EMBEDDING_MODEL_ID, AWS_BEDROCK_EMBEDDING_MODEL_DIMENSION

logger = logging.getLogger(__name__)

def embed_text(bedrock_client, text: str, dimension: int = AWS_BEDROCK_EMBEDDING_MODEL_DIMENSION):
    """Embeds the input text using the specified Titan model."""
    try:
        body = json.dumps({"inputText": text, "dimensions": dimension, "normalize": True})
        response = bedrock_client.invoke_model(
            body=body,
            modelId=AWS_BEDROCK_EMBEDDING_MODEL_ID,
            accept="application/json",
            contentType="application/json"
        )
        response_body = json.loads(response.get("body").read())
        embedding = response_body.get("embedding")
        logger.debug(f"Successfully embedded text: '{text[:50]}...'")
        return embedding
    except Exception as e:
        logger.error(f"Error embedding text: {e}")
        return None

def insert_embedding(conn, table_name: str, content: str, embedding: List[float], source: str = None, metadata: dict = None):
    """Inserts the content and its embedding into the specified table."""
    try:
        with conn.cursor() as cur:
            query = sql.SQL("INSERT INTO {} (content, embedding, source, metadata) VALUES (%s, %s, %s, %s)").format(sql.Identifier(table_name))
            cur.execute(query, (content, embedding, source, json.dumps(metadata) if metadata else None))
            conn.commit()
            logger.info(f"Successfully inserted embedding for content: '{content[:50]}...' into table '{table_name}'.")
            return True
    except psycopg2.Error as e:
        conn.rollback()
        logger.error(f"Error inserting embedding: {e}")
        return False

def process_and_store(texts_to_embed: List[dict], bedrock_client, conn, table_name: str = "documents"):
    """
    Embeds a list of texts and stores them in the vector database.
    Each item in texts_to_embed should be a dictionary with at least a 'content' key.
    Optional keys include 'source' and 'metadata'.
    """
    if not conn:
        logger.error("Database connection is not available.")
        return False

    for item in texts_to_embed:
        content = item.get("content")
        source = item.get("source")
        metadata = item.get("metadata")

        if content:
            embedding = embed_text(bedrock_client, content)
            if embedding:
                insert_embedding(conn, table_name, content, embedding, source, metadata)
        else:
            logger.warning("Skipping item without 'content'.")

    logger.info("Embedding and storing process completed.")
    return True