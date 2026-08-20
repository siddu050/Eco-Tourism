from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta
from datetime import datetime
import json
import models
import auth
from database import get_db
from gemini_client import chat_with_gemini

router = APIRouter()

def parse_pricing_breakdown(raw_value):
    if not raw_value:
        return None

    if isinstance(raw_value, (dict, list)):
        return raw_value

    try:
        return json.loads(raw_value)
    except (TypeError, json.JSONDecodeError):
        return None


def calculate_booking_nights(check_in_date: str, check_out_date: str) -> int:
    try:
        start = datetime.fromisoformat(check_in_date)
        end = datetime.fromisoformat(check_out_date)
    except (TypeError, ValueError):
        return 1

    return max(1, (end.date() - start.date()).days)


# Use relative imports in same folder


def serialize_booking(booking: models.Booking):
    location = booking.location
    return {
        "id": booking.id,
        "location_id": booking.location_id,
        "check_in_date": booking.check_in_date,
        "check_out_date": booking.check_out_date,
        "guests": booking.guests,
        "total_price": booking.total_price,
        "booking_status": booking.booking_status,
        "payment_status": booking.payment_status,
        "payment_method": booking.payment_method,
        "payment_reference": booking.payment_reference,
        "created_at": booking.created_at,
        "pricing_breakdown": parse_pricing_breakdown(booking.pricing_breakdown),
        "location": {
            "id": location.id,
            "name": location.name,
            "state": location.state,
            "image_url": location.image_url,
            "price_per_night": location.price_per_night,
        } if location else None,
    }


def serialize_location(location: models.Location, db: Session = None, current_user: models.User = None):
    average_rating = 0
    review_count = 0
    is_favorite = False

    if db is not None:
        rating_stats = (
            db.query(func.avg(models.Review.rating), func.count(models.Review.id))
            .filter(models.Review.location_id == location.id)
            .first()
        )
        average_rating = round(float(rating_stats[0] or 0), 1)
        review_count = int(rating_stats[1] or 0)

        if current_user is not None:
            is_favorite = (
                db.query(models.Favorite)
                .filter(models.Favorite.user_id == current_user.id, models.Favorite.location_id == location.id)
                .first()
                is not None
            )

    return {
        "id": location.id,
        "name": location.name,
        "description": location.description,
        "image_url": location.image_url,
        "price_per_night": location.price_per_night,
        "state": location.state,
        "average_rating": average_rating,
        "review_count": review_count,
        "is_favorite": is_favorite,
    }


def serialize_review(review: models.Review):
    return {
        "id": review.id,
        "user_id": review.user_id,
        "location_id": review.location_id,
        "rating": review.rating,
        "comment": review.comment,
        "created_at": review.created_at,
        "username": review.user.username if review.user else "Traveler",
    }


def serialize_user(user: models.User, db: Session):
    booking_count = db.query(func.count(models.Booking.id)).filter(models.Booking.user_id == user.id).scalar() or 0
    favorite_count = db.query(func.count(models.Favorite.id)).filter(models.Favorite.user_id == user.id).scalar() or 0
    review_count = db.query(func.count(models.Review.id)).filter(models.Review.user_id == user.id).scalar() or 0
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "booking_count": booking_count,
        "favorite_count": favorite_count,
        "review_count": review_count,
    }

@router.post("/register", response_model=dict)
def register_user(user_data: dict, db: Session = Depends(get_db)):
    username = user_data.get("username")
    email = user_data.get("email")
    password = user_data.get("password")
    
    if not username or not email or not password:
        raise HTTPException(status_code=400, detail="Missing fields")
        
    db_user = db.query(models.User).filter(
        (models.User.email == email) | (models.User.username == username)
    ).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email or username already registered")
        
    hashed_password = auth.get_password_hash(password)
    new_user = models.User(username=username, email=email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {"message": "User registered successfully"}

@router.post("/login")
def login(user_credentials: dict, db: Session = Depends(get_db)):
    # Standard oauth2 expects form data, but React often sends JSON.
    # To support both, we manually parse a dict if it's JSON.
    username = user_credentials.get("username")
    password = user_credentials.get("password")
    
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not auth.verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
        
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}


@router.get("/locations/search")
def search_locations(
    query: str = "",
    state: str = "",
    min_price: float | None = None,
    max_price: float | None = None,
    sort_by: str = "popular",
    db: Session = Depends(get_db)
):
    locations = db.query(models.Location)
    if query:
        locations = locations.filter(models.Location.name.ilike(f"%{query}%"))
    if state:
        locations = locations.filter(models.Location.state.ilike(f"%{state}%"))
    if min_price is not None:
        locations = locations.filter(models.Location.price_per_night >= min_price)
    if max_price is not None:
        locations = locations.filter(models.Location.price_per_night <= max_price)

    if sort_by == "price_low":
        locations = locations.order_by(models.Location.price_per_night.asc())
    elif sort_by == "price_high":
        locations = locations.order_by(models.Location.price_per_night.desc())
    else:
        locations = locations.order_by(models.Location.id.asc())

    return [serialize_location(location, db) for location in locations.all()]


@router.get("/locations/{location_id}")
def get_location(location_id: int, db: Session = Depends(get_db)):
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return {"location": serialize_location(location, db)}


@router.get("/locations/{location_id}/reviews")
def get_location_reviews(location_id: int, db: Session = Depends(get_db)):
    reviews = (
        db.query(models.Review)
        .filter(models.Review.location_id == location_id)
        .order_by(models.Review.id.desc())
        .all()
    )
    return {"reviews": [serialize_review(review) for review in reviews]}


@router.post("/locations/{location_id}/reviews")
def create_location_review(
    location_id: int,
    review_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    rating = int(review_data.get("rating", 0))
    comment = (review_data.get("comment") or "").strip()
    if rating < 1 or rating > 5 or not comment:
        raise HTTPException(status_code=400, detail="Rating and comment are required")

    review = models.Review(
        user_id=current_user.id,
        location_id=location_id,
        rating=rating,
        comment=comment,
        created_at=datetime.utcnow().isoformat()
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return {"message": "Review added successfully", "review": serialize_review(review)}


@router.get("/favorites")
def get_favorites(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    favorites = (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == current_user.id)
        .order_by(models.Favorite.id.desc())
        .all()
    )
    return {"favorites": [serialize_location(favorite.location, db, current_user) for favorite in favorites if favorite.location]}


@router.post("/favorites/{location_id}")
def add_favorite(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    existing = (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == current_user.id, models.Favorite.location_id == location_id)
        .first()
    )
    if not existing:
        favorite = models.Favorite(
            user_id=current_user.id,
            location_id=location_id,
            created_at=datetime.utcnow().isoformat()
        )
        db.add(favorite)
        db.commit()

    return {"message": "Added to favorites"}


@router.delete("/favorites/{location_id}")
def remove_favorite(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    favorite = (
        db.query(models.Favorite)
        .filter(models.Favorite.user_id == current_user.id, models.Favorite.location_id == location_id)
        .first()
    )
    if favorite:
        db.delete(favorite)
        db.commit()
    return {"message": "Removed from favorites"}


@router.get("/admin/summary")
def admin_summary(db: Session = Depends(get_db)):
    total_locations = db.query(func.count(models.Location.id)).scalar() or 0
    total_bookings = db.query(func.count(models.Booking.id)).scalar() or 0
    total_reviews = db.query(func.count(models.Review.id)).scalar() or 0
    total_favorites = db.query(func.count(models.Favorite.id)).scalar() or 0

    top_locations = (
        db.query(models.Location)
        .order_by(models.Location.price_per_night.desc())
        .limit(5)
        .all()
    )
    return {
        "summary": {
            "total_locations": total_locations,
            "total_bookings": total_bookings,
            "total_reviews": total_reviews,
            "total_favorites": total_favorites,
        },
        "locations": [serialize_location(location, db) for location in top_locations],
    }


@router.get("/admin/overview")
def admin_overview(db: Session = Depends(get_db)):
    summary = admin_summary(db)["summary"]

    locations = db.query(models.Location).order_by(models.Location.id.asc()).all()
    bookings = db.query(models.Booking).order_by(models.Booking.id.desc()).all()
    reviews = db.query(models.Review).order_by(models.Review.id.desc()).all()
    users = db.query(models.User).order_by(models.User.id.desc()).all()

    return {
        "summary": summary,
        "locations": [serialize_location(location, db) for location in locations],
        "bookings": [serialize_booking(booking) for booking in bookings],
        "reviews": [serialize_review(review) for review in reviews],
        "users": [serialize_user(user, db) for user in users],
    }


@router.put("/admin/locations/{location_id}")
def admin_update_location(location_id: int, payload: dict, db: Session = Depends(get_db)):
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    if "price_per_night" in payload and payload["price_per_night"] is not None:
        location.price_per_night = float(payload["price_per_night"])
    if "description" in payload and payload["description"]:
        location.description = payload["description"]
    if "state" in payload and payload["state"]:
        location.state = payload["state"]

    db.commit()
    db.refresh(location)
    return {"message": "Location updated", "location": serialize_location(location, db)}


@router.put("/admin/bookings/{booking_id}")
def admin_update_booking(booking_id: int, payload: dict, db: Session = Depends(get_db)):
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if "booking_status" in payload and payload["booking_status"]:
        booking.booking_status = payload["booking_status"]
    if "payment_status" in payload and payload["payment_status"]:
        booking.payment_status = payload["payment_status"]
    if "payment_reference" in payload:
        booking.payment_reference = payload["payment_reference"]

    db.commit()
    db.refresh(booking)
    return {"message": "Booking updated", "booking": serialize_booking(booking)}


@router.delete("/admin/reviews/{review_id}")
def admin_delete_review(review_id: int, db: Session = Depends(get_db)):
    review = db.query(models.Review).filter(models.Review.id == review_id).first()
    if not review:
        raise HTTPException(status_code=404, detail="Review not found")

    db.delete(review)
    db.commit()
    return {"message": "Review deleted"}

@router.post("/bookings")
def create_booking(booking_data: dict, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    location_id = booking_data.get("location_id")
    check_in_date = booking_data.get("check_in_date")
    check_out_date = booking_data.get("check_out_date")
    guests = int(booking_data.get("guests", 1))
    
    if not all([location_id, check_in_date, check_out_date]):
         raise HTTPException(status_code=400, detail="Missing booking details")
         
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
         raise HTTPException(status_code=404, detail="Location not found")
         
    total_price = booking_data.get("total_price")
    booking_nights = calculate_booking_nights(check_in_date, check_out_date)
    try:
        total_price = float(total_price)
    except (TypeError, ValueError):
        total_price = location.price_per_night * booking_nights

    pricing_breakdown = booking_data.get("pricing_breakdown")
    serialized_breakdown = None
    if pricing_breakdown is not None:
        try:
            serialized_breakdown = json.dumps(pricing_breakdown)
        except (TypeError, ValueError):
            serialized_breakdown = None
    
    new_booking = models.Booking(
        user_id=current_user.id,
        location_id=location_id,
        check_in_date=check_in_date,
        check_out_date=check_out_date,
        guests=guests,
        total_price=total_price,
        booking_status="confirmed",
        payment_status="pending",
        payment_method="upi",
        created_at=datetime.utcnow().isoformat(),
        pricing_breakdown=serialized_breakdown,
    )
    db.add(new_booking)
    db.commit()
    db.refresh(new_booking)
    
    return {
        "message": "Booking successful",
        "booking_id": new_booking.id,
        "booking": serialize_booking(new_booking)
    }


@router.post("/bookings/{booking_id}/pay")
def mark_booking_paid(
    booking_id: int,
    payment_data: dict,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = (
        db.query(models.Booking)
        .filter(models.Booking.id == booking_id, models.Booking.user_id == current_user.id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.booking_status == "cancelled":
        raise HTTPException(status_code=400, detail="Cancelled bookings cannot be paid")

    payment_method = payment_data.get("payment_method", "upi")
    booking.payment_method = payment_method
    booking.payment_status = "paid"
    booking.payment_reference = payment_data.get("payment_reference") or f"{payment_method.upper()}-{booking.id}-{current_user.id}"
    db.commit()
    db.refresh(booking)

    return {"message": "Payment recorded successfully", "booking": serialize_booking(booking)}


@router.post("/bookings/{booking_id}/cancel")
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = (
        db.query(models.Booking)
        .filter(models.Booking.id == booking_id, models.Booking.user_id == current_user.id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.booking_status == "cancelled":
        raise HTTPException(status_code=400, detail="Booking already cancelled")

    booking.booking_status = "cancelled"
    if booking.payment_status == "paid":
        booking.payment_status = "refund_pending"
    db.commit()
    db.refresh(booking)

    return {"message": "Booking cancelled successfully", "booking": serialize_booking(booking)}


@router.delete("/bookings/{booking_id}")
def delete_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = (
        db.query(models.Booking)
        .filter(models.Booking.id == booking_id, models.Booking.user_id == current_user.id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    db.delete(booking)
    db.commit()

    return {"message": "Booking deleted successfully", "booking_id": booking_id}


@router.get("/bookings/me")
def get_my_bookings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.user_id == current_user.id)
        .order_by(models.Booking.id.desc())
        .all()
    )
    return {"bookings": [serialize_booking(booking) for booking in bookings]}


@router.get("/bookings/{booking_id}")
def get_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = (
        db.query(models.Booking)
        .filter(models.Booking.id == booking_id, models.Booking.user_id == current_user.id)
        .first()
    )
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    return {"booking": serialize_booking(booking)}

@router.post("/ai/chat")
def ai_chat(message_data: dict):
    message = (message_data.get("message") or "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    history = message_data.get("history") or []

    try:
        result = chat_with_gemini(message, history=history)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return result

@router.get("/ai/suggestions")
def ai_suggestions():
    # Mock AI Suggestions
    suggestions = [
        {"title": "Explore the peaceful backwaters of Kerala", "search_term": "Kerala"},
        {"title": "Experience the vibrant culture of Jaipur", "search_term": "Jaipur"},
        {"title": "Relax on the sunny beaches of Goa", "search_term": "Goa"},
        {"title": "Witness the majestic Taj Mahal in Agra", "search_term": "Agra"}
    ]
    return {"suggestions": suggestions}
