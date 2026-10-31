
from sqlalchemy import Column, DateTime, Float, Integer

from backend.app.database import Base


class PollutionRecord(Base):
    __tablename__ = "pollution_records"

    id = Column(Integer, primary_key=True, index=True)

    recorded_at = Column(DateTime, nullable=False, index=True)

    co_gt = Column(Float, nullable=True)
    c6h6_gt = Column(Float, nullable=True)
    nox_gt = Column(Float, nullable=True)
    no2_gt = Column(Float, nullable=True)

    pt08_s1_co = Column(Float, nullable=True)
    pt08_s2_nmhc = Column(Float, nullable=True)
    pt08_s3_nox = Column(Float, nullable=True)
    pt08_s4_no2 = Column(Float, nullable=True)
    pt08_s5_o3 = Column(Float, nullable=True)

    temperature = Column(Float, nullable=True)
    relative_humidity = Column(Float, nullable=True)
    absolute_humidity = Column(Float, nullable=True)
