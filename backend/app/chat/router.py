from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Annotated
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
    """Chat with the AI assistant for help and information."""
    history = [m.model_dump() for m in chat_in.history] if chat_in.history else []
    answer = get_ai_chat_response(chat_in.message, history)
    return ChatResponse(answer=answer)
