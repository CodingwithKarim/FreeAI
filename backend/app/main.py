from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.init_database import init_db
from contextlib import asynccontextmanager
from app.routers.session_router import (
    router as session_router
)
from app.routers.model_router import (
    router as model_router
)

# Lifespan function that will be executed before FastAPI starts listening to requests
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Init Databse ex: create database file + add tables if don't exist
    init_db()
    yield

# Create FastAPI app instance and pass in lifespan function
app = FastAPI(lifespan=lifespan)

# Define domains + ports that can communicate with server
origins = [
    "http://localhost:5173", # Location of frontend Vite server
]

# Configure middleware to allow communication with modern browsers
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add custom routers for session and model handlers
app.include_router(session_router, prefix="/api")
app.include_router(model_router, prefix="/api")