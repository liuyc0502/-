"""
Medical Calculation Tools - LangChain Format
Tools for medical calculations and scoring systems
"""
from langchain_core.tools import tool
from typing import Optional
from pydantic import BaseModel, Field


class BMIInput(BaseModel):
    """Input schema for BMI calculation"""
    weight_kg: float = Field(description="Body weight in kilograms")
    height_cm: float = Field(description="Height in centimeters")


@tool("calculate_bmi", args_schema=BMIInput)
def calculate_bmi(weight_kg: float, height_cm: float) -> str:
    """
    Calculate Body Mass Index (BMI) and provide health interpretation.
    BMI = weight(kg) / height(m)^2

    Categories:
    - Underweight: < 18.5
    - Normal: 18.5-24.9
    - Overweight: 25-29.9
    - Obese: >= 30
    """
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)

    if bmi < 18.5:
        category = "Underweight (偏瘦)"
        advice = "建议适当增加营养摄入"
    elif bmi < 25:
        category = "Normal (正常)"
        advice = "请保持健康的生活方式"
    elif bmi < 30:
        category = "Overweight (超重)"
        advice = "建议控制饮食并增加运动"
    else:
        category = "Obese (肥胖)"
        advice = "建议在医生指导下进行体重管理"

    return f"BMI: {bmi:.1f}, Category: {category}. {advice}"


class GFRInput(BaseModel):
    """Input schema for eGFR calculation (CKD-EPI formula)"""
    creatinine: float = Field(description="Serum creatinine in mg/dL")
    age: int = Field(description="Patient age in years")
    is_female: bool = Field(description="True if patient is female")
    is_black: bool = Field(default=False, description="True if patient is Black/African American")


@tool("calculate_egfr", args_schema=GFRInput)
def calculate_egfr(creatinine: float, age: int, is_female: bool, is_black: bool = False) -> str:
    """
    Calculate estimated Glomerular Filtration Rate (eGFR) using CKD-EPI 2021 formula.
    Used to assess kidney function.

    Stages:
    - G1: >= 90 (Normal or high)
    - G2: 60-89 (Mildly decreased)
    - G3a: 45-59 (Mildly to moderately decreased)
    - G3b: 30-44 (Moderately to severely decreased)
    - G4: 15-29 (Severely decreased)
    - G5: < 15 (Kidney failure)
    """
    # CKD-EPI 2021 formula (race-free)
    if is_female:
        if creatinine <= 0.7:
            egfr = 142 * ((creatinine / 0.7) ** -0.241) * (0.9938 ** age) * 1.012
        else:
            egfr = 142 * ((creatinine / 0.7) ** -1.200) * (0.9938 ** age) * 1.012
    else:
        if creatinine <= 0.9:
            egfr = 142 * ((creatinine / 0.9) ** -0.302) * (0.9938 ** age)
        else:
            egfr = 142 * ((creatinine / 0.9) ** -1.200) * (0.9938 ** age)

    # Determine CKD stage
    if egfr >= 90:
        stage = "G1 (正常或偏高)"
        interpretation = "肾功能正常"
    elif egfr >= 60:
        stage = "G2 (轻度下降)"
        interpretation = "肾功能轻度下降，建议定期监测"
    elif egfr >= 45:
        stage = "G3a (轻度至中度下降)"
        interpretation = "需要进一步评估和管理"
    elif egfr >= 30:
        stage = "G3b (中度至重度下降)"
        interpretation = "需要肾内科专科诊治"
    elif egfr >= 15:
        stage = "G4 (重度下降)"
        interpretation = "需要为肾替代治疗做准备"
    else:
        stage = "G5 (肾衰竭)"
        interpretation = "可能需要透析或肾移植"

    return f"eGFR: {egfr:.1f} mL/min/1.73m², CKD Stage: {stage}. {interpretation}"


class ChildPughInput(BaseModel):
    """Input schema for Child-Pugh score calculation"""
    bilirubin: float = Field(description="Total bilirubin in mg/dL")
    albumin: float = Field(description="Serum albumin in g/dL")
    inr: float = Field(description="International Normalized Ratio (INR)")
    ascites: str = Field(description="Ascites status: 'none', 'mild', or 'moderate_severe'")
    encephalopathy: str = Field(description="Encephalopathy grade: 'none', 'grade_1_2', or 'grade_3_4'")


@tool("calculate_child_pugh", args_schema=ChildPughInput)
def calculate_child_pugh(
    bilirubin: float,
    albumin: float,
    inr: float,
    ascites: str,
    encephalopathy: str
) -> str:
    """
    Calculate Child-Pugh score for liver cirrhosis severity.
    Used to assess prognosis and guide treatment decisions.

    Classes:
    - Class A (5-6 points): Well-compensated disease
    - Class B (7-9 points): Significant functional compromise
    - Class C (10-15 points): Decompensated disease
    """
    score = 0

    # Bilirubin scoring
    if bilirubin < 2:
        score += 1
    elif bilirubin <= 3:
        score += 2
    else:
        score += 3

    # Albumin scoring
    if albumin > 3.5:
        score += 1
    elif albumin >= 2.8:
        score += 2
    else:
        score += 3

    # INR scoring
    if inr < 1.7:
        score += 1
    elif inr <= 2.3:
        score += 2
    else:
        score += 3

    # Ascites scoring
    ascites_map = {"none": 1, "mild": 2, "moderate_severe": 3}
    score += ascites_map.get(ascites.lower(), 2)

    # Encephalopathy scoring
    enceph_map = {"none": 1, "grade_1_2": 2, "grade_3_4": 3}
    score += enceph_map.get(encephalopathy.lower(), 2)

    # Determine class
    if score <= 6:
        child_class = "A"
        survival = "1年生存率: 100%, 2年生存率: 85%"
        interpretation = "代偿期肝硬化，预后较好"
    elif score <= 9:
        child_class = "B"
        survival = "1年生存率: 81%, 2年生存率: 57%"
        interpretation = "肝功能明显受损，需要积极治疗"
    else:
        child_class = "C"
        survival = "1年生存率: 45%, 2年生存率: 35%"
        interpretation = "失代偿期肝硬化，预后差，需考虑肝移植"

    return f"Child-Pugh Score: {score}, Class {child_class}. {survival}. {interpretation}"


class MELDInput(BaseModel):
    """Input schema for MELD score calculation"""
    bilirubin: float = Field(description="Total bilirubin in mg/dL")
    creatinine: float = Field(description="Serum creatinine in mg/dL")
    inr: float = Field(description="International Normalized Ratio (INR)")
    sodium: float = Field(default=140, description="Serum sodium in mEq/L (optional, for MELD-Na)")


@tool("calculate_meld", args_schema=MELDInput)
def calculate_meld(bilirubin: float, creatinine: float, inr: float, sodium: float = 140) -> str:
    """
    Calculate MELD (Model for End-Stage Liver Disease) score.
    Used for liver transplant prioritization and 90-day mortality prediction.

    MELD-Na includes sodium for improved accuracy.
    """
    import math

    # Ensure minimum values
    bilirubin = max(bilirubin, 1.0)
    creatinine = min(max(creatinine, 1.0), 4.0)
    inr = max(inr, 1.0)
    sodium = max(min(sodium, 140), 125)

    # MELD calculation
    meld = 10 * (
        0.957 * math.log(creatinine) +
        0.378 * math.log(bilirubin) +
        1.120 * math.log(inr) +
        0.643
    )
    meld = round(meld)

    # MELD-Na calculation
    meld_na = meld + 1.32 * (137 - sodium) - 0.033 * meld * (137 - sodium)
    meld_na = round(max(min(meld_na, 40), 6))

    # Mortality interpretation
    if meld_na < 10:
        mortality = "3个月死亡率: <2%"
        interpretation = "肝病较轻，暂不需要移植"
    elif meld_na < 20:
        mortality = "3个月死亡率: 6%"
        interpretation = "需要密切监测"
    elif meld_na < 30:
        mortality = "3个月死亡率: 20%"
        interpretation = "应考虑肝移植评估"
    elif meld_na < 40:
        mortality = "3个月死亡率: 50%"
        interpretation = "急需肝移植"
    else:
        mortality = "3个月死亡率: >70%"
        interpretation = "终末期肝病，紧急需要移植"

    return f"MELD: {meld}, MELD-Na: {meld_na}. {mortality}. {interpretation}"


class GlasgowComaInput(BaseModel):
    """Input schema for Glasgow Coma Scale"""
    eye_response: int = Field(description="Eye opening: 1=None, 2=To pain, 3=To voice, 4=Spontaneous")
    verbal_response: int = Field(description="Verbal: 1=None, 2=Incomprehensible, 3=Inappropriate, 4=Confused, 5=Oriented")
    motor_response: int = Field(description="Motor: 1=None, 2=Extension, 3=Flexion, 4=Withdrawal, 5=Localizing, 6=Obeys")


@tool("calculate_glasgow_coma", args_schema=GlasgowComaInput)
def calculate_glasgow_coma(eye_response: int, verbal_response: int, motor_response: int) -> str:
    """
    Calculate Glasgow Coma Scale (GCS) score for assessing consciousness level.

    Severity:
    - Mild (13-15): Minor brain injury
    - Moderate (9-12): Moderate brain injury
    - Severe (3-8): Severe brain injury, often requires intubation
    """
    gcs = eye_response + verbal_response + motor_response

    if gcs >= 13:
        severity = "轻度 (Mild)"
        interpretation = "轻度脑损伤，意识基本清醒"
    elif gcs >= 9:
        severity = "中度 (Moderate)"
        interpretation = "中度脑损伤，需要密切监护"
    else:
        severity = "重度 (Severe)"
        interpretation = "重度脑损伤，可能需要气管插管保护气道"

    return f"GCS: {gcs}/15 (E{eye_response}V{verbal_response}M{motor_response}), Severity: {severity}. {interpretation}"


class CURB65Input(BaseModel):
    """Input schema for CURB-65 pneumonia severity score"""
    confusion: bool = Field(description="New mental confusion")
    urea: float = Field(description="Blood urea nitrogen > 7 mmol/L (or >19 mg/dL)")
    respiratory_rate: int = Field(description="Respiratory rate >= 30/min")
    blood_pressure_low: bool = Field(description="SBP < 90 or DBP <= 60 mmHg")
    age: int = Field(description="Age in years")


@tool("calculate_curb65", args_schema=CURB65Input)
def calculate_curb65(
    confusion: bool,
    urea: float,
    respiratory_rate: int,
    blood_pressure_low: bool,
    age: int
) -> str:
    """
    Calculate CURB-65 score for community-acquired pneumonia severity.
    Helps determine if patient needs hospital admission.

    C - Confusion
    U - Urea > 7 mmol/L
    R - Respiratory rate >= 30
    B - Blood pressure (SBP < 90 or DBP <= 60)
    65 - Age >= 65
    """
    score = 0
    if confusion:
        score += 1
    if urea > 7:  # mmol/L
        score += 1
    if respiratory_rate >= 30:
        score += 1
    if blood_pressure_low:
        score += 1
    if age >= 65:
        score += 1

    if score == 0:
        risk = "低风险"
        mortality = "30天死亡率: 0.7%"
        recommendation = "可考虑门诊治疗"
    elif score == 1:
        risk = "低风险"
        mortality = "30天死亡率: 2.1%"
        recommendation = "可考虑门诊治疗或短期住院观察"
    elif score == 2:
        risk = "中等风险"
        mortality = "30天死亡率: 9.2%"
        recommendation = "建议住院治疗"
    elif score == 3:
        risk = "高风险"
        mortality = "30天死亡率: 14.5%"
        recommendation = "住院治疗，考虑ICU"
    else:
        risk = "极高风险"
        mortality = "30天死亡率: 40-57%"
        recommendation = "需要ICU治疗"

    return f"CURB-65: {score}/5, {risk}. {mortality}. {recommendation}"
