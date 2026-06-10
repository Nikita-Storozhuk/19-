from fastapi import Depends
from sqlalchemy.orm import Session
from database import get_db

# Common dependencies for reuse
def get_current_db(db: Session = Depends(get_db)):
    return db