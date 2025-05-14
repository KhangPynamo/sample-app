import psycopg2
from psycopg2 import sql
import logging
from typing import List, Dict, Optional

from embedding_vector_handler import embed_text
from config import AWS_BEDROCK_EMBEDDING_MODEL_DIMENSION

logger = logging.getLogger(__name__)

CONVERSATIONS_TABLE = "conversations"
MESSAGES_TABLE = "messages"
USER_ROLE = "user"
ASSISTANT_ROLE = "assistant"
MESSAGE_TYPE_HUMAN = "human"
MESSAGE_TYPE_AI = "ai"

def create_conversation(conn: psycopg2.extensions.connection, user_id: str) -> Optional[int]:
    """Creates a new conversation and returns its ID."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL(f"INSERT INTO {CONVERSATIONS_TABLE} (user_id) VALUES (%s) RETURNING id;"),
                (user_id,)
            )
            conversation_id = cur.fetchone()[0]
            conn.commit()
            logger.info(f"Created new conversation with ID: {conversation_id} for user: {user_id}")
            return conversation_id
    except psycopg2.Error as e:
        conn.rollback()
        logger.error(f"Error creating conversation for user {user_id}: {e}")
        return None

def save_message(conn: psycopg2.extensions.connection, bedrock_client, conversation_id: int, role: str, content: str) -> bool:
    """Saves a message to the database, including generating and storing its embedding and type."""
    message_type = MESSAGE_TYPE_HUMAN if role == USER_ROLE else MESSAGE_TYPE_AI
    try:
        embedding = embed_text(bedrock_client, content, dimension=AWS_BEDROCK_EMBEDDING_MODEL_DIMENSION)
        if embedding is None:
            logger.warning(f"Could not generate embedding for message: '{content[:50]}...'. Saving without embedding.")
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL(f"INSERT INTO {MESSAGES_TABLE} (conversation_id, role, content, type) VALUES (%s, %s, %s, %s);"),
                    (conversation_id, role, content, message_type)
                )
                conn.commit()
                logger.info(f"Saved message in conversation {conversation_id} with role: {role} (without embedding)")
                return True
        else:
            with conn.cursor() as cur:
                cur.execute(
                    sql.SQL(f"INSERT INTO {MESSAGES_TABLE} (conversation_id, role, content, embedding, type) VALUES (%s, %s, %s, %s, %s);"),
                    (conversation_id, role, content, embedding, message_type)
                )
                conn.commit()
                logger.info(f"Saved message in conversation {conversation_id} with role: {role} (with embedding)")
                return True
    except psycopg2.Error as e:
        conn.rollback()
        logger.error(f"Error saving message in conversation {conversation_id}: {e}")
        return False

def get_conversation_history(conn: psycopg2.extensions.connection, conversation_id: int) -> List[Dict[str, str]]:
    """Retrieves the conversation history for a given conversation ID."""
    try:
        with conn.cursor() as cur:
            cur.execute(
                sql.SQL(f"SELECT role, content, type FROM {MESSAGES_TABLE} WHERE conversation_id = %s ORDER BY timestamp ASC;"),
                (conversation_id,)
            )
            history = [{"role": row[0], "content": row[1], "type": row[2]} for row in cur.fetchall()]
            logger.info(f"Retrieved conversation history for ID: {conversation_id}")
            return history
    except psycopg2.Error as e:
        logger.error(f"Error retrieving conversation history for ID {conversation_id}: {e}")
        return []

def get_relevant_messages(conn: psycopg2.extensions.connection, conversation_id: int, query_text: str, bedrock_client, top_n: int = 3) -> List[Dict[str, str]]:
    """Retrieves relevant past messages from the current conversation using similarity search."""
    query_embedding = embed_text(bedrock_client, query_text, dimension=AWS_BEDROCK_EMBEDDING_MODEL_DIMENSION)
    if query_embedding is None:
        logger.warning("Could not generate embedding for query. Returning empty relevant messages.")
        return []
    try:
        with conn.cursor() as cur:
            # Use the vector extension's cosine distance operator (<->) for similarity search
            query = sql.SQL(f"""
                SELECT role, content
                FROM {MESSAGES_TABLE}
                WHERE conversation_id = %s AND embedding IS NOT NULL
                ORDER BY embedding <-> %s::vector
                LIMIT %s
            """)
            cur.execute(query, (conversation_id, query_embedding, top_n))
            relevant_messages = [{"role": row[0], "content": row[1]} for row in cur.fetchall()]
            logger.info(f"Retrieved {len(relevant_messages)} relevant messages for conversation {conversation_id}.")
            return relevant_messages
    except psycopg2.Error as e:
        logger.error(f"Error searching for relevant messages: {e}")
        return []