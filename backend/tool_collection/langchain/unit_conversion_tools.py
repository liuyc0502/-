"""
Unit Conversion Tools - LangChain Format
Tools for medical unit conversions commonly used in clinical settings
"""
from langchain_core.tools import tool
from pydantic import BaseModel, Field


class LabValueConversionInput(BaseModel):
    """Input for lab value unit conversion"""
    value: float = Field(description="The numeric value to convert")
    from_unit: str = Field(description="Source unit (e.g., 'mg/dL', 'mmol/L')")
    to_unit: str = Field(description="Target unit")
    analyte: str = Field(description="The analyte/substance (e.g., 'glucose', 'creatinine', 'cholesterol')")


# Conversion factors for common lab values
# Format: {analyte: {(from_unit, to_unit): factor}}
CONVERSION_FACTORS = {
    "glucose": {
        ("mg/dL", "mmol/L"): 0.0555,
        ("mmol/L", "mg/dL"): 18.0182,
    },
    "creatinine": {
        ("mg/dL", "μmol/L"): 88.4,
        ("μmol/L", "mg/dL"): 0.0113,
    },
    "cholesterol": {
        ("mg/dL", "mmol/L"): 0.0259,
        ("mmol/L", "mg/dL"): 38.67,
    },
    "triglycerides": {
        ("mg/dL", "mmol/L"): 0.0113,
        ("mmol/L", "mg/dL"): 88.57,
    },
    "urea": {
        ("mg/dL", "mmol/L"): 0.357,
        ("mmol/L", "mg/dL"): 2.8,
    },
    "bilirubin": {
        ("mg/dL", "μmol/L"): 17.1,
        ("μmol/L", "mg/dL"): 0.0585,
    },
    "calcium": {
        ("mg/dL", "mmol/L"): 0.25,
        ("mmol/L", "mg/dL"): 4.0,
    },
    "phosphorus": {
        ("mg/dL", "mmol/L"): 0.323,
        ("mmol/L", "mg/dL"): 3.1,
    },
    "uric_acid": {
        ("mg/dL", "μmol/L"): 59.48,
        ("μmol/L", "mg/dL"): 0.0168,
    },
    "hemoglobin": {
        ("g/dL", "g/L"): 10,
        ("g/L", "g/dL"): 0.1,
        ("g/dL", "mmol/L"): 0.6206,
        ("mmol/L", "g/dL"): 1.611,
    },
}


@tool("convert_lab_value", args_schema=LabValueConversionInput)
def convert_lab_value(value: float, from_unit: str, to_unit: str, analyte: str) -> str:
    """
    Convert laboratory values between different units.
    Supports common clinical chemistry analytes including glucose, creatinine,
    cholesterol, triglycerides, urea, bilirubin, calcium, etc.
    """
    analyte_lower = analyte.lower().replace(" ", "_")

    if analyte_lower not in CONVERSION_FACTORS:
        available = ", ".join(CONVERSION_FACTORS.keys())
        return f"Unsupported analyte: {analyte}. Supported analytes: {available}"

    conversion_key = (from_unit, to_unit)
    analyte_conversions = CONVERSION_FACTORS[analyte_lower]

    if conversion_key not in analyte_conversions:
        available_conversions = [f"{k[0]} → {k[1]}" for k in analyte_conversions.keys()]
        return f"Unsupported conversion for {analyte}. Available: {', '.join(available_conversions)}"

    factor = analyte_conversions[conversion_key]
    result = value * factor

    return f"{value} {from_unit} = {result:.2f} {to_unit} ({analyte})"


class TemperatureInput(BaseModel):
    """Input for temperature conversion"""
    value: float = Field(description="Temperature value to convert")
    from_unit: str = Field(description="Source unit: 'C' (Celsius) or 'F' (Fahrenheit)")


@tool("convert_temperature", args_schema=TemperatureInput)
def convert_temperature(value: float, from_unit: str) -> str:
    """
    Convert temperature between Celsius and Fahrenheit.
    Commonly used for converting body temperature readings.
    """
    from_unit = from_unit.upper()

    if from_unit == "C":
        fahrenheit = (value * 9 / 5) + 32
        # Clinical interpretation
        if value < 36.0:
            status = "Hypothermia (低体温)"
        elif value <= 37.5:
            status = "Normal (正常)"
        elif value <= 38.0:
            status = "Low-grade fever (低热)"
        elif value <= 39.0:
            status = "Moderate fever (中等热)"
        elif value <= 41.0:
            status = "High fever (高热)"
        else:
            status = "Hyperpyrexia (超高热)"
        return f"{value}°C = {fahrenheit:.1f}°F. Clinical status: {status}"

    elif from_unit == "F":
        celsius = (value - 32) * 5 / 9
        # Clinical interpretation
        if celsius < 36.0:
            status = "Hypothermia (低体温)"
        elif celsius <= 37.5:
            status = "Normal (正常)"
        elif celsius <= 38.0:
            status = "Low-grade fever (低热)"
        elif celsius <= 39.0:
            status = "Moderate fever (中等热)"
        elif celsius <= 41.0:
            status = "High fever (高热)"
        else:
            status = "Hyperpyrexia (超高热)"
        return f"{value}°F = {celsius:.1f}°C. Clinical status: {status}"

    else:
        return "Invalid unit. Use 'C' for Celsius or 'F' for Fahrenheit."


class WeightHeightInput(BaseModel):
    """Input for weight and height conversions"""
    value: float = Field(description="Value to convert")
    from_unit: str = Field(description="Source unit (kg/lb for weight, cm/in/ft for height)")
    to_unit: str = Field(description="Target unit")


@tool("convert_weight_height", args_schema=WeightHeightInput)
def convert_weight_height(value: float, from_unit: str, to_unit: str) -> str:
    """
    Convert weight between kg and lbs, and height between cm, inches, and feet.
    """
    from_unit = from_unit.lower()
    to_unit = to_unit.lower()

    conversions = {
        # Weight
        ("kg", "lb"): lambda x: x * 2.20462,
        ("kg", "lbs"): lambda x: x * 2.20462,
        ("lb", "kg"): lambda x: x / 2.20462,
        ("lbs", "kg"): lambda x: x / 2.20462,
        # Height
        ("cm", "in"): lambda x: x / 2.54,
        ("cm", "inch"): lambda x: x / 2.54,
        ("cm", "inches"): lambda x: x / 2.54,
        ("in", "cm"): lambda x: x * 2.54,
        ("inch", "cm"): lambda x: x * 2.54,
        ("inches", "cm"): lambda x: x * 2.54,
        ("cm", "ft"): lambda x: x / 30.48,
        ("ft", "cm"): lambda x: x * 30.48,
        ("ft", "in"): lambda x: x * 12,
        ("in", "ft"): lambda x: x / 12,
    }

    key = (from_unit, to_unit)
    if key not in conversions:
        return f"Unsupported conversion: {from_unit} to {to_unit}"

    result = conversions[key](value)

    # Special formatting for feet and inches
    if to_unit == "ft" and from_unit == "cm":
        feet = int(result)
        inches = (result - feet) * 12
        return f"{value} {from_unit} = {feet}'{inches:.1f}\" ({result:.2f} ft)"

    return f"{value} {from_unit} = {result:.2f} {to_unit}"


class DrugDoseInput(BaseModel):
    """Input for drug dose calculations"""
    dose_per_kg: float = Field(description="Dose per kilogram (mg/kg)")
    weight_kg: float = Field(description="Patient weight in kg")
    frequency_per_day: int = Field(default=1, description="Number of doses per day")
    max_single_dose: float = Field(default=None, description="Maximum single dose (mg), optional")


@tool("calculate_drug_dose", args_schema=DrugDoseInput)
def calculate_drug_dose(
    dose_per_kg: float,
    weight_kg: float,
    frequency_per_day: int = 1,
    max_single_dose: float = None
) -> str:
    """
    Calculate drug dosage based on patient weight.
    Commonly used for pediatric dosing and weight-based medications.
    """
    single_dose = dose_per_kg * weight_kg

    if max_single_dose and single_dose > max_single_dose:
        single_dose = max_single_dose
        note = f" (capped at max dose {max_single_dose}mg)"
    else:
        note = ""

    daily_dose = single_dose * frequency_per_day

    result = f"""
Drug Dosing Calculation:
- Dose rate: {dose_per_kg} mg/kg
- Patient weight: {weight_kg} kg
- Single dose: {single_dose:.1f} mg{note}
- Frequency: {frequency_per_day}x daily
- Daily total: {daily_dose:.1f} mg/day
"""
    return result.strip()


class IVDripRateInput(BaseModel):
    """Input for IV drip rate calculation"""
    volume_ml: float = Field(description="Total volume to infuse in mL")
    time_hours: float = Field(description="Infusion time in hours")
    drop_factor: int = Field(default=20, description="Drop factor (drops/mL), typically 10, 15, or 20")


@tool("calculate_iv_drip_rate", args_schema=IVDripRateInput)
def calculate_iv_drip_rate(volume_ml: float, time_hours: float, drop_factor: int = 20) -> str:
    """
    Calculate IV drip rate in drops per minute and mL per hour.
    Essential for manual IV administration without infusion pumps.

    Common drop factors:
    - Macro drip: 10-20 drops/mL
    - Micro drip: 60 drops/mL (pediatric)
    """
    ml_per_hour = volume_ml / time_hours
    time_minutes = time_hours * 60
    drops_per_minute = (volume_ml * drop_factor) / time_minutes

    return f"""
IV Drip Rate Calculation:
- Total volume: {volume_ml} mL
- Infusion time: {time_hours} hours
- Drop factor: {drop_factor} drops/mL

Results:
- Flow rate: {ml_per_hour:.1f} mL/hour
- Drip rate: {drops_per_minute:.1f} drops/minute
"""
