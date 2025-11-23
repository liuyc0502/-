"""
Date and Time Tools - LangChain Format
Tools for medical date calculations like gestational age, medication schedules, etc.
"""
from langchain_core.tools import tool
from pydantic import BaseModel, Field
from datetime import datetime, timedelta
from typing import Optional


class GestationalAgeInput(BaseModel):
    """Input for gestational age calculation"""
    lmp_date: str = Field(description="Last menstrual period date in YYYY-MM-DD format")
    current_date: str = Field(default=None, description="Current date (YYYY-MM-DD), defaults to today")


@tool("calculate_gestational_age", args_schema=GestationalAgeInput)
def calculate_gestational_age(lmp_date: str, current_date: str = None) -> str:
    """
    Calculate gestational age and estimated due date (EDD) based on last menstrual period.
    Uses Naegele's rule for EDD calculation.
    """
    try:
        lmp = datetime.strptime(lmp_date, "%Y-%m-%d")
        today = datetime.strptime(current_date, "%Y-%m-%d") if current_date else datetime.now()

        # Calculate gestational age
        days_pregnant = (today - lmp).days
        weeks = days_pregnant // 7
        days = days_pregnant % 7

        # Calculate EDD using Naegele's rule (LMP + 280 days)
        edd = lmp + timedelta(days=280)

        # Trimester determination
        if weeks < 13:
            trimester = "First trimester (第一孕期)"
            notes = "早孕期，建议进行NT检查和早期唐筛"
        elif weeks < 27:
            trimester = "Second trimester (第二孕期)"
            notes = "中孕期，建议进行四维彩超和糖耐量检查"
        else:
            trimester = "Third trimester (第三孕期)"
            notes = "晚孕期，需要密切监测胎动和胎心"

        days_to_edd = (edd - today).days

        return f"""
Gestational Age Calculation:
- Last Menstrual Period: {lmp_date}
- Current Date: {today.strftime('%Y-%m-%d')}

Results:
- Gestational Age: {weeks} weeks + {days} days ({weeks}+{days})
- Trimester: {trimester}
- Estimated Due Date: {edd.strftime('%Y-%m-%d')}
- Days until EDD: {days_to_edd} days

Notes: {notes}
"""
    except ValueError as e:
        return f"Error parsing date: {e}. Please use YYYY-MM-DD format."


class AgeCalculationInput(BaseModel):
    """Input for age calculation"""
    birth_date: str = Field(description="Birth date in YYYY-MM-DD format")
    reference_date: str = Field(default=None, description="Reference date (YYYY-MM-DD), defaults to today")


@tool("calculate_age", args_schema=AgeCalculationInput)
def calculate_age(birth_date: str, reference_date: str = None) -> str:
    """
    Calculate exact age in years, months, and days.
    Useful for pediatric dosing and age-specific medical guidelines.
    """
    try:
        birth = datetime.strptime(birth_date, "%Y-%m-%d")
        ref = datetime.strptime(reference_date, "%Y-%m-%d") if reference_date else datetime.now()

        # Calculate years
        years = ref.year - birth.year
        if (ref.month, ref.day) < (birth.month, birth.day):
            years -= 1

        # Calculate months
        if ref.month >= birth.month:
            months = ref.month - birth.month
            if ref.day < birth.day:
                months -= 1
        else:
            months = 12 - birth.month + ref.month
            if ref.day < birth.day:
                months -= 1

        # Calculate days (approximate)
        if ref.day >= birth.day:
            days = ref.day - birth.day
        else:
            prev_month = ref.replace(day=1) - timedelta(days=1)
            days = prev_month.day - birth.day + ref.day

        total_days = (ref - birth).days

        # Age category
        if years < 1:
            if total_days < 28:
                category = "Neonate (新生儿)"
            elif total_days < 365:
                category = "Infant (婴儿)"
            else:
                category = "Infant (婴儿)"
        elif years < 3:
            category = "Toddler (幼儿)"
        elif years < 6:
            category = "Preschool (学龄前儿童)"
        elif years < 12:
            category = "School-age child (学龄儿童)"
        elif years < 18:
            category = "Adolescent (青少年)"
        elif years < 65:
            category = "Adult (成人)"
        else:
            category = "Elderly (老年人)"

        # For infants, show age in months
        if years == 0:
            total_months = total_days // 30
            return f"""
Age Calculation:
- Birth Date: {birth_date}
- Age: {total_months} months ({total_days} days)
- Category: {category}
"""
        else:
            return f"""
Age Calculation:
- Birth Date: {birth_date}
- Age: {years} years, {months} months, {days} days
- Total Days: {total_days}
- Category: {category}
"""
    except ValueError as e:
        return f"Error parsing date: {e}. Please use YYYY-MM-DD format."


class MedicationScheduleInput(BaseModel):
    """Input for medication schedule generation"""
    medication_name: str = Field(description="Name of the medication")
    frequency: str = Field(description="Frequency: 'QD', 'BID', 'TID', 'QID', 'Q8H', 'Q12H', etc.")
    start_time: str = Field(default="08:00", description="First dose time in HH:MM format")
    duration_days: int = Field(default=7, description="Duration of treatment in days")
    with_food: bool = Field(default=False, description="Whether to take with food")


@tool("generate_medication_schedule", args_schema=MedicationScheduleInput)
def generate_medication_schedule(
    medication_name: str,
    frequency: str,
    start_time: str = "08:00",
    duration_days: int = 7,
    with_food: bool = False
) -> str:
    """
    Generate a medication dosing schedule based on frequency.

    Common frequencies:
    - QD: Once daily
    - BID: Twice daily
    - TID: Three times daily
    - QID: Four times daily
    - Q4H, Q6H, Q8H, Q12H: Every X hours
    """
    freq_upper = frequency.upper()

    # Define schedules for each frequency
    schedules = {
        "QD": ["08:00"],
        "BID": ["08:00", "20:00"],
        "TID": ["08:00", "14:00", "20:00"],
        "QID": ["08:00", "12:00", "18:00", "22:00"],
        "Q4H": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
        "Q6H": ["06:00", "12:00", "18:00", "00:00"],
        "Q8H": ["08:00", "16:00", "00:00"],
        "Q12H": ["08:00", "20:00"],
    }

    if freq_upper not in schedules:
        return f"Unknown frequency: {frequency}. Supported: {', '.join(schedules.keys())}"

    times = schedules[freq_upper]
    food_note = " (with food / 餐后服用)" if with_food else " (may be taken without food / 可空腹服用)"

    schedule_lines = [f"  - {t}" for t in times]
    schedule_text = "\n".join(schedule_lines)

    freq_descriptions = {
        "QD": "Once daily (每日一次)",
        "BID": "Twice daily (每日两次)",
        "TID": "Three times daily (每日三次)",
        "QID": "Four times daily (每日四次)",
        "Q4H": "Every 4 hours (每4小时一次)",
        "Q6H": "Every 6 hours (每6小时一次)",
        "Q8H": "Every 8 hours (每8小时一次)",
        "Q12H": "Every 12 hours (每12小时一次)",
    }

    return f"""
Medication Schedule:
- Medication: {medication_name}
- Frequency: {freq_descriptions.get(freq_upper, frequency)}
- Duration: {duration_days} days
- Administration{food_note}

Dosing Times:
{schedule_text}

Total doses: {len(times)} per day × {duration_days} days = {len(times) * duration_days} doses
"""


class FollowUpDateInput(BaseModel):
    """Input for follow-up date calculation"""
    procedure_date: str = Field(description="Procedure/diagnosis date in YYYY-MM-DD format")
    intervals: str = Field(description="Follow-up intervals, comma-separated (e.g., '1w,2w,1m,3m,6m,1y')")


@tool("calculate_followup_dates", args_schema=FollowUpDateInput)
def calculate_followup_dates(procedure_date: str, intervals: str) -> str:
    """
    Calculate follow-up appointment dates based on specified intervals.

    Interval formats:
    - Xd: X days
    - Xw: X weeks
    - Xm: X months
    - Xy: X years
    """
    try:
        base_date = datetime.strptime(procedure_date, "%Y-%m-%d")
        interval_list = [i.strip() for i in intervals.split(",")]

        results = []
        for interval in interval_list:
            interval = interval.lower()
            try:
                if interval.endswith("d"):
                    days = int(interval[:-1])
                    follow_up = base_date + timedelta(days=days)
                    period = f"{days} day(s)"
                elif interval.endswith("w"):
                    weeks = int(interval[:-1])
                    follow_up = base_date + timedelta(weeks=weeks)
                    period = f"{weeks} week(s)"
                elif interval.endswith("m"):
                    months = int(interval[:-1])
                    # Approximate months (30 days each)
                    follow_up = base_date + timedelta(days=months * 30)
                    period = f"{months} month(s)"
                elif interval.endswith("y"):
                    years = int(interval[:-1])
                    follow_up = base_date + timedelta(days=years * 365)
                    period = f"{years} year(s)"
                else:
                    continue

                weekday = follow_up.strftime("%A")
                results.append(f"  - {period}: {follow_up.strftime('%Y-%m-%d')} ({weekday})")
            except ValueError:
                results.append(f"  - Invalid interval: {interval}")

        schedule = "\n".join(results)

        return f"""
Follow-up Schedule:
- Base Date: {procedure_date}

Scheduled Follow-ups:
{schedule}
"""
    except ValueError as e:
        return f"Error parsing date: {e}. Please use YYYY-MM-DD format."
