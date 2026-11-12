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

class email_prompt(BaseModel):
     email:str

router = APIRouter(
    prefix="/login",
    tags=["login"],
    responses={404: {"description": "Not found"}},
)

@router.post("/verify_email")
async def check_email(
    request: Request,
    user_email: email_prompt
): 
    """ verifies the user's email exists in the database. Returns bool of the user's email existing in the database"""
    user_dao = request.app.state.user_dao
    # strip whitespace
    email = user_email.email.strip()
    verified = await user_dao.email_exists(email)
    return {"verified": verified}

@router.post("/create_account", status_code=status.HTTP_201_CREATED)
async def create_account(
    request: Request,
    response: Response,
    info: UserCreation
):
    """creates an account when given account information. Returns error if email already in use. 
       Sets cookie as 'Cookie' and maps to uuid in the session hash."""
    user_dao = request.app.state.user_dao

    # first checks if email can be used
    verified = await user_dao.email_exists(info.email)
    if (verified):
         return {"user_id": "ERROR: email exists"}

    # then hashes password
    password_bytes = info.password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password_bytes, salt).decode("utf-8")

    # creates a user in the database, sets cookie, adds the cookie to uuid to session hash
    user_id = await user_dao.create_user("temp first name", "temp last name", info.email, hashed_password, info.profile, info.nickname)
    if (user_id is None):
         return {"user_id": "ERROR: database error"}
    cookie = str(uuid4())
    response.set_cookie(key="Cookie", value=cookie)
    hash = request.app.state.session_hash
    hash[cookie] = user_id

    return {"user_id": cookie}

@router.post("/")
async def login(
     request: Request,
     response: Response,
     info: login
    ):
    """ attemps login using the given login info. If login is successful, cookie is set as 'Cookie' and maps to uuid in session hash"""
    user_dao = request.app.state.user_dao

    # checks if login information is valid
    uuid = await user_dao.authenticate_user(info.email, info.password) 

    if (uuid is not None ):
        user = await user_dao.get_user(uuid)
        nickname = user.nickname

        # Creates cookie and adds cookie to uuid hash
        cookie = str(uuid4())
        response.set_cookie(key="Cookie", value=cookie)    
        hash = request.app.state.session_hash
        hash[cookie] = uuid

        return {"user_id": cookie, "nickname": nickname}
    else:
        return {"user_id": "None"}

@router.get("/logout")
async def logout(
     request: Request,
):
    """ logs out of current session. Removes cookie and hash from cookie to uuid in session hash."""
    cookie = request.cookies.get("Cookie")
    hash = request.app.state.session_hash
    if cookie in hash:
        del hash[cookie]
        return {"logout": "successful"}
    else:
         return {"logout": "unsucessful"}