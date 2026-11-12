from uuid import uuid4

import bcrypt
from fastapi import APIRouter, Request, Response, status
from pydantic import BaseModel


class login(BaseModel):
    email: str
    password: str

class UserCreation(BaseModel):
        email: str
        password: str
        profile: str
        nickname: str

class email(BaseModel):
     email:str

router = APIRouter(
    prefix="/login",
    tags=["login"],
    responses={404: {"description": "Not found"}},
)

@router.post("/verify_email")
async def check_email(
    request: Request,
    user_email: email
): 
    user_dao = request.app.state.user_dao
    verified = await user_dao.email_exists(user_email.email)
    return {"verified": verified}

@router.post("/create_account", status_code=status.HTTP_201_CREATED)
async def create_account(
    request: Request,
    response: Response,
    info: UserCreation
):
    user_dao = request.app.state.user_dao
    password_bytes = info.password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password_bytes, salt)
    user_id = await user_dao.create_user("temp first name", "temp last name", info.email, hashed_password, info.profile, info.nickname)
    cookie = str(uuid4())
    response.set_cookie(key="Cookie", value=cookie)
    hash = request.app.state.session_hash
    hash[cookie] = user_id
    return {"user_id": str(cookie)}

@router.post("/")
async def login(
     request: Request,
     response: Response,
     info: login
    ):
    user_dao = request.app.state.user_dao
    uuid = await user_dao.authenticate_user(info.email, info.password) 
    if (uuid != None ):
        nickname = await user_dao.get_user(uuid).nickname
        cookie = str(uuid4())
        response.set_cookie(key="Cookie", value=cookie)    
        hash = request.app.state.session_hash
        hash[cookie] = uuid
        return {"user_id": str(cookie), "nickname": nickname}
    else:
        return {"user_id": "None"}

@router.get("/logout")
async def logout(
     request: Request,
):
    cookie = request.cookies.get("Cookie")
    hash = request.app.state.session_hash
    if cookie in hash:
        del hash[cookie]
        return {"logout": "successful"}
    else:
         return {"logout": "unsucessful"}