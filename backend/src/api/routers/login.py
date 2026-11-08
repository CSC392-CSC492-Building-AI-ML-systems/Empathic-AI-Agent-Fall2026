from uuid import uuid4

import bcrypt
from fastapi import APIRouter, Request, Response, status
from pydantic import BaseModel


class login(BaseModel):
    email: str
    password: str
    cookie: str

class UserCreation(BaseModel):
        first_name: str
        last_name: str
        email: str
        password: str
        profile: str
        nickname: str

class email(BaseModel):
     email:str

class logout(BaseModel):
     cache: str

router = APIRouter(
    prefix="/login",
    tags=["session"],
    responses={404: {"description": "Not found"}},
)

@router.get("/verify_email")
async def check_email(
    request: Request,
    email: email
): 
    user_dao = request.app.state.user_dao
    return {"verified": str(user_dao.email_exists(email.email))}

@router.get("/create_account", status_code=status.HTTP_201_CREATED)
async def create_account(
    request: Request,
    response: Response,
    info: UserCreation
):
    user_dao = request.app.state.user_dao
    password_bytes = info.password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password_bytes, salt)
    user_id = await user_dao.create_user(info.first_name, info.last_name, info.email, hashed_password, info.profile, info.nickname)
    cookie = uuid4()
    response.set_cookie(key="Cookie", value=cookie)
    hash = request.app.session_hash
    hash[cookie] = user_id
    return {"user_id": str(cookie)}

@router.get("/")
async def login(
     request: Request,
     response: Response,
     info: login
    ):
    user_dao = request.app.state.user_dao
    uuid = user_dao.authenticate_user(info.email, info.password) 
    if (uuid != None ):
        cookie = uuid4()
        response.set_cookie(key="Cookie", value=cookie)    
        hash = request.app.session_hash
        hash[cookie] = uuid
        return {"user_id": str(cookie)}
    else:
        return {"user_id": "None"}

@router.get("/logout")
async def logout(
     request: Request,
     cache: logout
):
     hash = request.app.session_hash
     del hash[cache]
     return {"logout": "successful"}