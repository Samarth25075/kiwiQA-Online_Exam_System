import asyncio
from fastapi import APIRouter, Depends
from typing import Annotated
from app.auth.router import get_current_admin
from app.auth.schemas import AdminUser
from app.chat.schemas import ChatRequest, ChatResponse
from app.chat.service import get_ai_chat_response

router = APIRouter(tags=["chat"])

@router.post("", response_model=ChatResponse)
async def chat_with_ai(
    chat_in: ChatRequest,
    current_admin: Annotated[AdminUser, Depends(get_current_admin)]
):
    """Chat with the AI assistant for help and information (Non-blocking)."""
    history = [m.model_dump() for m in chat_in.history] if chat_in.history else []
    # Run sync AI code in a thread pool to avoid blocking the event loop
    answer = await asyncio.to_thread(get_ai_chat_response, chat_in.message, history)
    return ChatResponse(answer=answer)
