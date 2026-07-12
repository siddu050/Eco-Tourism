from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    hashed_password = Column(String)

    bookings = relationship("Booking", back_populates="user")
    favorites = relationship("Favorite", back_populates="user")
    reviews = relationship("Review", back_populates="user")

class Location(Base):
    __tablename__ = "locations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(Text)
    image_url = Column(String)
    price_per_night = Column(Float)
    state = Column(String, index=True)

    bookings = relationship("Booking", back_populates="location")
    favorites = relationship("Favorite", back_populates="location")
    reviews = relationship("Review", back_populates="location")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    check_in_date = Column(String)
    check_out_date = Column(String)
    guests = Column(Integer)
    total_price = Column(Float)
    booking_status = Column(String, default="confirmed")
    payment_status = Column(String, default="pending")
    payment_method = Column(String, default="upi")
    payment_reference = Column(String, nullable=True)
    created_at = Column(String, nullable=True)
    pricing_breakdown = Column(Text, nullable=True)

    user = relationship("User", back_populates="bookings")
    location = relationship("Location", back_populates="bookings")


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    created_at = Column(String, nullable=True)

    user = relationship("User", back_populates="favorites")
    location = relationship("Location", back_populates="favorites")


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    location_id = Column(Integer, ForeignKey("locations.id"))
    rating = Column(Integer)
    comment = Column(Text)
    created_at = Column(String, nullable=True)

    user = relationship("User", back_populates="reviews")
    location = relationship("Location", back_populates="reviews")
