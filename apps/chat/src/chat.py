import os
import boto3
import logging
from langchain_aws import ChatBedrock
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.chat_history import BaseChatMessageHistory
from langchain.memory import ConversationBufferMemory
from langchain_core.runnables import RunnablePassthrough
from langchain_core.messages import get_buffer_string, BaseMessage
from langgraph.graph import StateGraph, END
from typing import Dict, TypedDict, Annotated, List, Optional
from langgraph.graph.message import add_messages
from langgraph.checkpoint.memory import MemorySaver

from db_handler import create_conversation, save_message, get_conversation_history, get_relevant_messages
from utils import get_bedrock_client, get_db_connection
from config import AWS_BEDROCK_LLM_ID

logger = logging.getLogger(__name__)

bedrock_client = get_bedrock_client()
if not bedrock_client:
    raise Exception("Failed to initialize Bedrock client. Check logs for details.")

llm = ChatBedrock(
    client=bedrock_client,
    model_id=AWS_BEDROCK_LLM_ID,
)

# Define the prompt template with memory placeholder
prompt_template_with_memory = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful chatbot. Answer the user's question based on the current input and the following relevant parts of the conversation history: {relevant_history}"),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ]
)

prompt_template_without_memory = ChatPromptTemplate.from_messages(
    [
        ("system", "You are a helpful chatbot. Answer the user's question based on the conversation history."),
        MessagesPlaceholder(variable_name="history"),
        ("human", "{input}"),
    ]
)

# --- Define the LangGraph state as a TypedDict ---
class ChatState(TypedDict):
    user_id: str
    user_input: str
    conversation_id: Optional[int]
    history: List[BaseMessage]
    response: str
    relevant_history: Optional[str]
    db_connection: Optional[object]

# --- Define the nodes in the graph ---
def assign_user_id(user_id: str):
    """Assigns the user ID to the state."""
    logger.debug(f"assign_user_id user_id: {user_id}")
    return {"user_id": user_id}

def should_create_new_conversation(state: ChatState):
    """Determines if a new conversation should be created."""
    create = state.get("conversation_id") is None
    return {"should_create": create}

def create_new_conversation(state: ChatState):
    """Creates a new conversation in the database."""
    logger.debug(f"create_new_conversation state: {state}")
    conn = state.get("db_connection")
    if not conn:
        error_message = {"error": "Database connection not available."}
        logger.error(error_message)
        return {"conversation_id": None, "__error__": error_message}
    user_id = state.get("user_id")
    user_id_str = user_id if isinstance(user_id, str) else user_id.get("user_id")
    conversation_id = create_conversation(conn, user_id_str)
    return {"conversation_id": conversation_id}

def get_history_from_db(state: ChatState):
    """Retrieves conversation history from the database."""
    logger.debug(f"get_history_from_db state: {state}")
    conn = state.get("db_connection")
    conversation_id = state.get("conversation_id")
    if not conn or conversation_id is None:
        logger.warning("Database connection or conversation ID not available for fetching history.")
        return {"history": []}
    history_db = get_conversation_history(conn, conversation_id)
    history = [BaseMessage(role=msg["role"], content=msg["content"], type=msg["type"]) for msg in history_db]
    return {"history": history}

def get_relevant_context(state: ChatState):
    """Retrieves relevant past messages using similarity search."""
    logger.debug(f"get_relevant_context state: {state}")
    conn = state.get("db_connection")
    conversation_id = state.get("conversation_id")
    user_input = state.get("user_input")
    if not conn or conversation_id is None or not user_input:
        logger.warning("Database connection, conversation ID, or user input not available for fetching relevant context.")
        return {"relevant_history": ""}
    relevant_messages = get_relevant_messages(conn, conversation_id, user_input, bedrock_client)
    relevant_history_str = "\n".join([f"{msg['role']}: {msg['content']}" for msg in relevant_messages])
    return {"relevant_history": relevant_history_str}

def generate_response(state: ChatState):
    """Generates the chatbot's response, incorporating relevant history."""
    logger.debug(f"generate_response state: {state}")
    prompt = (prompt_template_with_memory if state.get("relevant_history") else prompt_template_without_memory).format_messages(
        history=state["history"],
        input=state["user_input"],
        **( {"relevant_history": state["relevant_history"]} if state.get("relevant_history") else {} )
    )
    try:
        response = llm.invoke(prompt)
        return {"response": response.content}
    except Exception as e:
        error_message = {"error": f"Error generating response: {e}"}
        logger.error(error_message)
        return {"response": "An error occurred.", "__error__": error_message}

def get_user_input(state: ChatState):
    """Gets the user's input."""
    user_input = state.get("user_input")
    logger.debug(f"get_user_input input: {user_input}")
    return {"user_input": user_input}

def save_chat_to_db(state: ChatState):
    """Saves the user input and chatbot response to the database."""
    logger.debug(f"save_chat_to_db state: {state}")
    conn = state.get("db_connection")
    conversation_id = state.get("conversation_id")
    if not conn or conversation_id is None:
        logger.error("Database connection or conversation ID not available for saving.")
        return state

    user_message = state["user_input"]
    bot_response = state["response"]

    save_message(conn, bedrock_client, conversation_id, "user", user_message)
    save_message(conn, bedrock_client, conversation_id, "assistant", bot_response)
    return state

# --- Build the LangGraph ---
builder = StateGraph(ChatState)
builder.add_node("assign_id", assign_user_id)
builder.add_node("check_conversation", should_create_new_conversation)
builder.add_node("create_conversation", create_new_conversation)
builder.add_node("get_input", get_user_input)
builder.add_node("get_history", get_history_from_db)
builder.add_node("get_relevant_context", get_relevant_context)
builder.add_node("generate_response", generate_response)
builder.add_node("save_to_db", save_chat_to_db)

builder.set_entry_point("assign_id")

def route_conversation(state):
    if "__error__" in state:
        return END  # Terminate the graph if there's an error
    return "create_conversation" if state.get("should_create") else "get_input"

builder.add_edge("assign_id", "check_conversation")
builder.add_conditional_edges(
    "check_conversation",
    route_conversation,
    {"create_conversation": "create_conversation", "get_input": "get_input", END: END}
)
builder.add_edge("create_conversation", "get_input")
builder.add_edge("get_input", "get_history")
builder.add_edge("get_history", "get_relevant_context")
builder.add_edge("get_relevant_context", "generate_response")
builder.add_edge("generate_response", "save_to_db")
builder.add_edge("save_to_db", END)

# Compile the graph
graph = builder.compile()

def lambda_handler(event, context):
    """
    Handles the incoming event and returns the chatbot response with multi-user memory
    saved in the database.
    For local testing, the 'event' should be a dictionary with 'input' and 'user_id' keys.
    """
    user_input = event.get("input")
    user_id = event.get("user_id", "default_user")

    with get_db_connection() as conn:
        if not conn:
            error_response = {"error": "Failed to connect to the database."}
            logger.error(error_response)
            return {"response": error_response}

        initial_state = {"user_id": user_id, "user_input": user_input, "db_connection": conn}
        try:
            result = graph.invoke(
                initial_state,
                {"configurable": {"thread_id": user_id}}
            )
            if "__error__" in result:
                return {"response": result["__error__"]}
            return {"response": result['response']}
        except Exception as e:
            error_response = {"error": f"Error during graph invocation: {e}"}
            logger.error(error_response)
            return {"response": error_response}

if __name__ == "__main__":
    print("Multi-User GenAI Chatbot with Persistent Memory in RDS (Local Testing)")
    print("-----------------------------------------------------------------------")

    conversations = {}

    while True:
        user_id = input("Enter User ID: ")
        user_input = input(f"You ({user_id}): ")

        with get_db_connection() as conn:
            if not conn:
                print("Error connecting to database.")
                continue

            initial_state = {
                "user_id": user_id,
                "user_input": user_input,
                "conversation_id": conversations.get(user_id),
                "db_connection": conn
            }

            try:
                result = graph.invoke(
                    initial_state,
                    {"configurable": {"thread_id": user_id}}
                )
                if "__error__" in result:
                    print(f"Bot Error: {result['__error__']}")
                else:
                    print(f"Bot: {result['response']}")

                if "conversation_id" in result and result["conversation_id"] is not None and "__error__" not in result:
                    conversations[user_id] = result["conversation_id"]

            except Exception as e:
                print(f"[ERROR] Error during graph invocation: {e}")

        if user_input.lower() in ["exit", "quit", "bye"]:
            break