import requests
import logging
import json
from typing import Dict, Any, List, Optional

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NebulaAdapter:
    """
    Adapter for Thirdweb's Nebula API using the approach shown in
    https://github.com/thirdweb-dev/ai/tree/main/python/examples/adapter_langchain
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base_url = "https://nebula-api.thirdweb.com/chat"
        self.sessions: Dict[str, List[Dict[str, Any]]] = {}
        logger.info("NebulaAdapter initialized")

    def generate_response(self, message: str, session_id: str) -> str:
        """Generate a response from Nebula AI using the chat API."""
        logger.info(f"Generating response for message: {message[:30]}... (session: {session_id})")

        # Create or get session history
        if session_id not in self.sessions:
            self.sessions[session_id] = []
            logger.info(f"Created new session: {session_id}")

        # Prepare the payload
        payload = {
            "message": message,
            "stream": False,
            "context": {
                "history": self.sessions[session_id]
            }
        }

        logger.info(f"Sending request to Nebula API with payload: {json.dumps(payload)[:100]}...")

        # Make the API request
        headers = {
            "X-Secret-Key": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            response = requests.post(
                self.base_url,
                headers=headers,
                json=payload
            )

            logger.info(f"Received response with status code: {response.status_code}")

            if response.status_code != 200:
                error_msg = f"Error from Nebula API: {response.text}"
                logger.error(error_msg)
                raise Exception(error_msg)

            # Dump full response for debugging
            logger.info(f"Response content: {response.text[:200]}...")

            result = response.json()

            # The Nebula API returns the response in the "message" field, not "response"
            ai_response = result.get("message", "")
            if not ai_response:
                # Fallback to "response" field if "message" is not present
                ai_response = result.get("response", "")

            logger.info(f"Extracted AI response: {ai_response[:50]}...")

            if not ai_response:
                logger.warning(f"Empty response from Nebula API. Full response: {result}")

            # Update session history
            self.sessions[session_id].append({"role": "user", "content": message})
            self.sessions[session_id].append({"role": "assistant", "content": ai_response})

            # Keep history to a reasonable size (last 10 exchanges)
            if len(self.sessions[session_id]) > 20:
                self.sessions[session_id] = self.sessions[session_id][-20:]
                logger.info(f"Trimmed session history to last 20 messages")

            return ai_response

        except Exception as e:
            logger.error(f"Error in generate_response: {str(e)}")
            return f"Error communicating with Nebula API: {str(e)}"
