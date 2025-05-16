from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import logging
from dotenv import load_dotenv
from langchain_adapter import NebulaAdapter

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Get API key
THIRDWEB_SECRET_KEY = os.getenv("THIRDWEB_SECRET_KEY")
if not THIRDWEB_SECRET_KEY:
    raise ValueError("Missing THIRDWEB_SECRET_KEY environment variable")

app = FastAPI()

# Configure CORS to allow requests from your Next.js app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Update based on your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Nebula adapter
nebula_adapter = NebulaAdapter(api_key=THIRDWEB_SECRET_KEY)

class ChatRequest(BaseModel):
    message: str
    sessionId: str  # To maintain conversation context

class ChatResponse(BaseModel):
    response: str

@app.post("/api/nebula-chat", response_model=ChatResponse)
async def chat_with_nebula(request: ChatRequest):
    try:
        logger.info(f"Received chat request: {request.message[:30]}...")

        response = nebula_adapter.generate_response(
            message=request.message,
            session_id=request.sessionId
        )

        logger.info(f"Sending response: {response[:50]}...")

        return {"response": response}
    except Exception as e:
        logger.error(f"Error in chat_with_nebula endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Run with: uvicorn app:app --reload
